import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.agents.master import MasterAgent
from app.core.config import get_settings
from app.models.analysis import AnalysisRequest, AnalysisResponse

logger = logging.getLogger(__name__)
settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

master_agent = MasterAgent()


@app.on_event("startup")
async def startup_event():
    """Log configuration status on startup."""
    logger.info("Starting %s in %s mode", settings.app_name, settings.environment)
    if not settings.openai_api_key and not settings.gemini_api_key:
        logger.warning(
            "No LLM API key configured (OPENAI_API_KEY / GEMINI_API_KEY). "
            "CrewAI synthesis will fall back to deterministic scoring."
        )
    if not settings.tavily_api_key:
        logger.warning(
            "TAVILY_API_KEY not set. News search will fall back to Yahoo Finance RSS."
        )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


@app.post("/analyze", response_model=AnalysisResponse)
async def analyze(request: AnalysisRequest) -> AnalysisResponse:
    """Run multi-agent stock analysis for the given query."""
    try:
        return await master_agent.analyze(request)
    except ValueError as exc:
        logger.error("Validation error during analysis: %s", exc)
        raise HTTPException(status_code=422, detail=str(exc))
    except Exception as exc:
        logger.exception("Unexpected error during analysis for query: %s", request.query)
        raise HTTPException(
            status_code=500,
            detail="An unexpected error occurred during analysis. Please try again.",
        )
