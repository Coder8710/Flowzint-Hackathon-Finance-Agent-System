#!/bin/bash
# Flowzint Finance Agent System — setup_and_push.sh — Production Ready
set -e

REPO_URL="https://github.com/Coder8710/Flowzint-Hackathon-Finance-Agent-System.git"
BRANCH_NAME="feature/production-agents-$(date +%Y%m%d-%H%M)"

# Clone if not already inside the repo
if [ ! -d ".git" ]; then
  git clone $REPO_URL .
fi

# Create and switch to feature branch
git checkout -b $BRANCH_NAME

# Stage only agent-related files
git add agents/news.py agents/fundamental.py agents/technical.py agents/sentiment.py
git add crews/finance_crew.py
git add tasks.py crew.py
git add requirements.txt

git commit -m "feat: production-ready agents with structured outputs, memory, rate limiting, and crew orchestration

- All 4 agents upgraded: verbose=False, memory=True, max_iter=15, max_rpm=10, cache=True
- Structured JSON output schemas enforced in agent goals and task expected_output
- Context chaining: fundamental/technical get news context, sentiment gets all three
- Agent factory functions added to each agent module (create_*_agent)
- Standalone crew.py with run_analysis(ticker) for headless crew execution
- tasks.py with parameterized task factories using {ticker} dynamic variable
- finance_crew.py upgraded to use agent factories instead of inline definitions
- Python logging replaces verbose stdout output
- requirements.txt updated with production dependencies"

git push origin $BRANCH_NAME

echo ""
echo "✅ Done. Branch: $BRANCH_NAME"
echo "👉 Open PR here: https://github.com/Coder8710/Flowzint-Hackathon-Finance-Agent-System/compare/$BRANCH_NAME"
