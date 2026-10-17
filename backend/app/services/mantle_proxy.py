"""
Bedrock Mantle SigV4 Signing Proxy
===================================
A lightweight HTTP proxy that:
  1. Listens on localhost:8099
  2. Accepts standard OpenAI-compatible requests (from LiteLLM/CrewAI)
  3. Signs them with AWS SigV4
  4. Forwards to https://bedrock-mantle.<region>.api.aws/v1/...
  5. Streams the response back

Usage: start_mantle_proxy() in a daemon thread before serving.
       Resolves to http://localhost:8099/v1 as the LiteLLM base_url.
"""
from __future__ import annotations

import json
import logging
import threading
from http.server import BaseHTTPRequestHandler, HTTPServer

import requests
from botocore.auth import SigV4Auth
from botocore.awsrequest import AWSRequest
from botocore.credentials import Credentials

logger = logging.getLogger(__name__)

_PROXY_PORT = 8099
_proxy_started = False
_proxy_lock = threading.Lock()

# Filled in by start_mantle_proxy()
_region: str = "us-east-1"
_access_key: str = ""
_secret_key: str = ""


class _MantleProxyHandler(BaseHTTPRequestHandler):
    """Forward any POST to the Bedrock Mantle endpoint with SigV4 auth."""

    # Suppress default request log noise — uvicorn already logs at INFO
    def log_message(self, fmt: str, *args) -> None:  # type: ignore[override]
        logger.debug("MantleProxy: " + fmt, *args)

    def do_POST(self) -> None:  # noqa: N802
        length = int(self.headers.get("Content-Length", 0))
        body = self.rfile.read(length) if length else b""

        # Build the target Mantle URL (preserve path suffix, e.g. /v1/chat/completions)
        path = self.path  # e.g. /v1/chat/completions
        target_url = f"https://bedrock-mantle.{_region}.api.aws{path}"

        try:
            creds = Credentials(_access_key, _secret_key)
            aws_req = AWSRequest(
                method="POST",
                url=target_url,
                data=body,
                headers={"Content-Type": "application/json"},
            )
            SigV4Auth(creds, "bedrock", _region).add_auth(aws_req)
            signed_headers = dict(aws_req.headers)

            resp = requests.post(
                target_url,
                data=body,
                headers=signed_headers,
                timeout=300,
                stream=True,
            )

            # Write status + headers back to CrewAI/LiteLLM
            self.send_response(resp.status_code)
            for header, value in resp.headers.items():
                if header.lower() not in (
                    "transfer-encoding",
                    "connection",
                    "content-encoding",
                ):
                    self.send_header(header, value)
            self.end_headers()

            # Stream body
            for chunk in resp.iter_content(chunk_size=4096):
                if chunk:
                    self.wfile.write(chunk)

        except Exception as exc:
            logger.error("MantleProxy error: %s", exc)
            error_body = json.dumps(
                {"error": {"message": str(exc), "type": "proxy_error"}}
            ).encode()
            self.send_response(502)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(error_body)))
            self.end_headers()
            self.wfile.write(error_body)

    def do_OPTIONS(self) -> None:  # noqa: N802
        self.send_response(200)
        self.end_headers()


def start_mantle_proxy(
    region: str,
    access_key: str,
    secret_key: str,
    port: int = _PROXY_PORT,
) -> str:
    """
    Start the signing proxy in a daemon thread if not already running.
    Returns the base_url to pass to LiteLLM: http://localhost:<port>/v1
    """
    global _proxy_started, _region, _access_key, _secret_key

    with _proxy_lock:
        _region = region
        _access_key = access_key
        _secret_key = secret_key

        if not _proxy_started:
            server = HTTPServer(("127.0.0.1", port), _MantleProxyHandler)
            thread = threading.Thread(target=server.serve_forever, daemon=True)
            thread.start()
            _proxy_started = True
            logger.info(
                "Bedrock Mantle signing proxy started on http://127.0.0.1:%d/v1 -> bedrock-mantle.%s.api.aws",
                port, region,
            )

    return f"http://127.0.0.1:{port}/v1"
