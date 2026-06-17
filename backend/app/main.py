import logging

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse

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
    # Clear cached settings to ensure fresh .env values are read on every restart
    get_settings.cache_clear()
    settings = get_settings()
    logger.info("Starting %s in %s mode", settings.app_name, settings.environment)
    if not settings.has_llm_key:
        logger.warning(
            "No LLM provider configured. "
            "Set OPENAI_API_KEY, GEMINI_API_KEY, or AWS credentials for Bedrock. "
            "CrewAI synthesis will fall back to deterministic scoring."
        )
    else:
        logger.info("LLM provider configured: %s", settings.crewai_model)
    if not settings.tavily_api_key:
        logger.warning(
            "TAVILY_API_KEY not set. News search will fall back to Yahoo Finance RSS."
        )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok", "service": settings.app_name}


@app.get("/", response_class=HTMLResponse)
async def home() -> HTMLResponse:
    html_content = """<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Flowzint Finance AI - Testing Console</title>
    <style>
        :root {
            --bg-color: #0b0f19;
            --card-bg: rgba(255, 255, 255, 0.03);
            --border-color: rgba(255, 255, 255, 0.08);
            --text-primary: #f3f4f6;
            --text-secondary: #9ca3af;
            --mint: #10b981;
            --berry: #ef4444;
            --amber: #f59e0b;
            --slate: #6366f1;
        }
        body {
            background-color: var(--bg-color);
            color: var(--text-primary);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            display: flex;
            justify-content: center;
        }
        .container {
            width: 100%;
            max-width: 1200px;
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        header {
            border-bottom: 1px solid var(--border-color);
            padding-bottom: 15px;
        }
        h1 {
            margin: 0;
            font-size: 24px;
            background: linear-gradient(to right, #10b981, #6366f1);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }
        .main-layout {
            display: grid;
            grid-template-columns: 350px 1fr;
            gap: 20px;
        }
        @media(max-width: 900px) {
            .main-layout {
                grid-template-columns: 1fr;
            }
        }
        .panel {
            background: var(--card-bg);
            border: 1px solid var(--border-color);
            border-radius: 12px;
            padding: 20px;
            backdrop-filter: blur(10px);
        }
        label {
            display: block;
            margin-bottom: 8px;
            font-size: 13px;
            font-weight: 600;
            color: var(--text-secondary);
        }
        textarea, select {
            width: 100%;
            padding: 10px;
            background: rgba(255,255,255,0.02);
            border: 1px solid var(--border-color);
            border-radius: 6px;
            color: var(--text-primary);
            margin-bottom: 15px;
            box-sizing: border-box;
            outline: none;
            transition: border-color 0.2s;
        }
        textarea:focus, select:focus {
            border-color: var(--mint);
        }
        button {
            width: 100%;
            padding: 12px;
            background: var(--mint);
            color: #0b0f19;
            font-weight: bold;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            transition: transform 0.1s, opacity 0.2s;
        }
        button:hover {
            opacity: 0.9;
        }
        button:active {
            transform: scale(0.98);
        }
        button:disabled {
            opacity: 0.5;
            cursor: not-allowed;
        }
        .results-panel {
            display: flex;
            flex-direction: column;
            gap: 20px;
        }
        .recommendation-banner {
            display: flex;
            justify-content: space-between;
            align-items: center;
            border-left: 4px solid var(--slate);
            padding-left: 15px;
        }
        .badge {
            padding: 6px 12px;
            border-radius: 4px;
            font-weight: bold;
            text-transform: uppercase;
            font-size: 14px;
        }
        .badge-buy { background: rgba(16, 185, 129, 0.15); color: var(--mint); border: 1px solid var(--mint); }
        .badge-sell { background: rgba(239, 68, 68, 0.15); color: var(--berry); border: 1px solid var(--berry); }
        .badge-hold { background: rgba(245, 158, 11, 0.15); color: var(--amber); border: 1px solid var(--amber); }
        .bar-container {
            margin-top: 10px;
        }
        .bar-label {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: var(--text-secondary);
            margin-bottom: 4px;
        }
        .bar-track {
            height: 8px;
            background: rgba(255,255,255,0.05);
            border-radius: 4px;
            overflow: hidden;
        }
        .bar-fill {
            height: 100%;
            background: var(--mint);
            width: 0%;
            transition: width 0.5s ease-out;
        }
        .grid-3 {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
            gap: 15px;
        }
        .agent-card {
            background: rgba(255,255,255,0.015);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 15px;
        }
        .agent-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 8px;
            display: flex;
            justify-content: space-between;
        }
        .agent-summary {
            font-size: 13px;
            color: var(--text-secondary);
            margin-bottom: 10px;
            min-height: 40px;
        }
        .signal-list {
            list-style: none;
            padding: 0;
            margin: 0;
            font-size: 11px;
            color: #888;
        }
        .signal-list li {
            margin-bottom: 4px;
            border-left: 2px solid rgba(255,255,255,0.1);
            padding-left: 6px;
        }
        .news-list {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 15px;
        }
        @media(max-width: 700px) {
            .news-list { grid-template-columns: 1fr; }
        }
        .news-card {
            background: rgba(255,255,255,0.01);
            border: 1px solid var(--border-color);
            border-radius: 8px;
            padding: 12px;
            text-decoration: none;
            color: var(--text-primary);
            transition: background 0.2s;
        }
        .news-card:hover {
            background: rgba(255,255,255,0.03);
        }
        .news-source {
            font-size: 10px;
            text-transform: uppercase;
            color: var(--mint);
            font-weight: bold;
        }
        .news-title {
            font-size: 13px;
            font-weight: bold;
            margin: 6px 0;
        }
        .news-summary {
            font-size: 12px;
            color: var(--text-secondary);
        }
        .loading-overlay {
            display: none;
            text-align: center;
            padding: 40px;
            font-size: 18px;
            color: var(--text-secondary);
        }
        .loading-dots:after {
            content: '.';
            animation: dots 1.5s steps(5, end) infinite;
        }
        @keyframes dots {
            0%, 20% { content: ''; }
            40% { content: '.'; }
            60% { content: '..'; }
            80%, 100% { content: '...'; }
        }
    </style>
</head>
<body>
    <div class="container">
        <header>
            <h1>Flowzint Finance AI - Testing Console</h1>
            <p style="margin:5px 0 0 0; font-size:12px; color:var(--text-secondary)">Test dynamic sub-agents, confidence values, and web results</p>
        </header>

        <div class="main-layout">
            <aside class="panel">
                <form id="analysis-form">
                    <label for="query">Stock Query</label>
                    <textarea id="query" rows="3">Analyze NVIDIA stock</textarea>

                    <label for="risk_tolerance">Risk Tolerance</label>
                    <select id="risk_tolerance">
                        <option value="low">Low</option>
                        <option value="medium" selected>Medium</option>
                        <option value="high">High</option>
                    </select>

                    <label for="horizon">Investment Horizon</label>
                    <select id="horizon">
                        <option value="short">Short</option>
                        <option value="medium" selected>Medium</option>
                        <option value="long">Long</option>
                    </select>

                    <label for="portfolio_context">Portfolio Context (Optional)</label>
                    <textarea id="portfolio_context" rows="3" placeholder="e.g. Already holding large-cap tech."></textarea>

                    <button type="submit" id="submit-btn">Run Multi-Agent Analysis</button>
                </form>
            </aside>

            <main class="panel" style="min-height: 400px; display:flex; flex-direction:column; justify-content:center;">
                <div id="loading" class="loading-overlay">
                    <div style="font-size:24px; margin-bottom:10px;">🤖</div>
                    <div>Agents are scanning and analyzing<span class="loading-dots"></span></div>
                    <div style="font-size:12px; margin-top:5px; color:#666;">This might take up to a minute if running live LLM crew...</div>
                </div>

                <div id="welcome-message" style="text-align:center; color:var(--text-secondary)">
                    <div style="font-size:48px; margin-bottom:15px;">📊</div>
                    <h3>Awaiting stock analysis query</h3>
                    <p style="font-size:13px; max-width:400px; margin:0 auto;">Enter a stock query on the left pane and run the analysis to view live dynamic metrics from the sub-agents.</p>
                </div>

                <div id="results" class="results-panel" style="display:none;">
                    <div class="recommendation-banner">
                        <div>
                            <span style="font-size:11px; text-transform:uppercase; color:var(--text-secondary);">Master Recommendation</span>
                            <h2 id="overall-summary" style="margin:5px 0 0 0; font-size:18px;"></h2>
                        </div>
                        <span id="recommendation-badge" class="badge"></span>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:15px;">
                        <div class="bar-container">
                            <div class="bar-label">
                                <span>Overall Confidence</span>
                                <span id="val-confidence">0%</span>
                            </div>
                            <div class="bar-track">
                                <div id="fill-confidence" class="bar-fill" style="background:var(--mint)"></div>
                            </div>
                        </div>

                        <div class="bar-container">
                            <div class="bar-label">
                                <span>Volatility / Risk Score</span>
                                <span id="val-risk">0%</span>
                            </div>
                            <div class="bar-track">
                                <div id="fill-risk" class="bar-fill" style="background:var(--berry)"></div>
                            </div>
                        </div>
                    </div>

                    <div style="margin-top:10px;">
                        <h3 style="font-size:14px; text-transform:uppercase; margin-bottom:10px; color:var(--text-secondary)">Sub-Agent Breakdowns</h3>
                        <div id="agents-grid" class="grid-3"></div>
                    </div>

                    <div style="margin-top:10px;">
                        <h3 style="font-size:14px; text-transform:uppercase; margin-bottom:10px; color:var(--text-secondary)">Recent News Scanned</h3>
                        <div id="news-grid" class="news-list"></div>
                    </div>
                </div>
            </main>
        </div>
    </div>

    <script>
        const form = document.getElementById('analysis-form');
        const submitBtn = document.getElementById('submit-btn');
        const loading = document.getElementById('loading');
        const welcome = document.getElementById('welcome-message');
        const results = document.getElementById('results');

        form.addEventListener('submit', async (e) => {
            e.preventDefault();
            submitBtn.disabled = true;
            welcome.style.display = 'none';
            results.style.display = 'none';
            loading.style.display = 'block';

            const query = document.getElementById('query').value;
            const risk_tolerance = document.getElementById('risk_tolerance').value;
            const horizon = document.getElementById('horizon').value;
            const portfolio_context = document.getElementById('portfolio_context').value || null;

            try {
                const res = await fetch('/analyze', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ query, risk_tolerance, horizon, portfolio_context })
                });

                if (!res.ok) throw new Error(await res.text());
                const data = await res.json();
                displayResults(data);
            } catch (err) {
                alert('Analysis failed: ' + err.message);
                welcome.style.display = 'block';
            } finally {
                loading.style.display = 'none';
                submitBtn.disabled = false;
            }
        });

        function displayResults(data) {
            const analysis = data.analyses[0]; // Take first stock
            
            document.getElementById('overall-summary').innerText = data.summary;
            
            const rec = analysis.recommendation;
            const badge = document.getElementById('recommendation-badge');
            badge.innerText = rec;
            badge.className = 'badge ' + (rec === 'Buy' ? 'badge-buy' : rec === 'Sell' ? 'badge-sell' : 'badge-hold');

            // Set progress bars
            const confidenceVal = Math.round(analysis.confidence * 100);
            document.getElementById('val-confidence').innerText = confidenceVal + '%';
            document.getElementById('fill-confidence').style.width = confidenceVal + '%';

            const riskVal = analysis.risk_score;
            document.getElementById('val-risk').innerText = riskVal + '%';
            document.getElementById('fill-risk').style.width = riskVal + '%';
            document.getElementById('fill-risk').style.width = riskVal + '%';
            document.getElementById('fill-risk').style.background = riskVal > 65 ? 'var(--berry)' : riskVal > 40 ? 'var(--amber)' : 'var(--mint)';

            // Render sub-agents
            const agentsGrid = document.getElementById('agents-grid');
            agentsGrid.innerHTML = '';
            analysis.agents.forEach(agent => {
                const score = agent.data.score || agent.data.risk_score || 50;
                
                const card = document.createElement('div');
                card.className = 'agent-card';
                card.innerHTML = `
                    <div class="agent-name">
                        <span>${agent.agent}</span>
                        <span style="font-size:11px; color:var(--text-secondary)">Conf: ${agent.confidence}</span>
                    </div>
                    <div class="agent-summary">${agent.summary}</div>
                    
                    <div class="bar-container" style="margin-bottom: 12px;">
                        <div class="bar-label" style="font-size:10px;">
                            <span>Score</span>
                            <span>${score}</span>
                        </div>
                        <div class="bar-track" style="height:4px;">
                            <div class="bar-fill" style="width: ${score}%; background: ${score >= 60 ? 'var(--mint)' : score <= 40 ? 'var(--berry)' : 'var(--amber)'}"></div>
                        </div>
                    </div>

                    <ul class="signal-list">
                        ${agent.signals.slice(0, 3).map(sig => `<li>${sig}</li>`).join('')}
                    </ul>
                `;
                agentsGrid.appendChild(card);
            });

            // Render news
            const newsGrid = document.getElementById('news-grid');
            newsGrid.innerHTML = '';
            if (analysis.news && analysis.news.length > 0) {
                analysis.news.slice(0, 4).forEach(item => {
                    const card = document.createElement('a');
                    card.className = 'news-card';
                    card.href = item.url || '#';
                    card.target = '_blank';
                    card.innerHTML = `
                        <div class="news-source">${item.source}</div>
                        <div class="news-title">${item.title}</div>
                        ${item.summary ? `<div class="news-summary">${item.summary}</div>` : ''}
                    `;
                    newsGrid.appendChild(card);
                });
            } else {
                newsGrid.innerHTML = '<div style="color:var(--text-secondary); font-size:12px;">No news items available in offline mode.</div>';
            }

            results.style.display = 'block';
        }
    </script>
</body>
</html>"""
    return HTMLResponse(content=html_content, status_code=200)


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
