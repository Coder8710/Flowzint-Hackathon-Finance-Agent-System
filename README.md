# Multi-Agent AI Finance Stock Analyzer

## Project Description
Build a multi-agent AI-powered finance assistant that analyzes stocks and companies using:
- real-time news
- financial data
- technical analysis
- market sentiment
- risk analysis

Users can ask questions like:
- "Analyze NVIDIA stock"
- "Should I invest in Tesla?"
- "Compare Apple vs Microsoft"

The system uses multiple AI agents coordinated by a Master Agent to generate intelligent investment insights.

---

# Architecture

## Master Agent
Main orchestrator that:
- understands user query
- delegates tasks to sub agents
- combines responses
- generates final investment report

---

# Sub Agents

## News Agent
- searches latest finance news
- summarizes market events

## Fundamental Analysis Agent
- analyzes revenue, profit, debt, P/E ratio, growth

## Technical Analysis Agent
- analyzes RSI, MACD, trends, support/resistance

## Sentiment Analysis Agent
- analyzes Reddit, Twitter/X, market sentiment

## Risk Analysis Agent
- detects volatility, competition, investment risks

## Portfolio Advisor Agent
- provides personalized investment suggestions

---

# Workflow

User Query
→ Master Agent
→ Sub Agents perform analysis
→ Outputs combined
→ Final AI investment report generated

---

# Tech Stack

## Frontend
- Next.js
- React
- TailwindCSS

## Backend
- FastAPI

## AI Framework
- CrewAI

## APIs & Tools
- OpenAI/Gemini API
- Yahoo Finance API
- Tavily Search API
- Firecrawl/Playwright

---

# Final Output

The AI should provide:
- Buy/Sell/Hold suggestion
- Financial analysis
- Technical analysis
- Sentiment analysis
- Risk score
- AI-generated investment insights