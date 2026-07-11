# Frontend

Next.js analysis console for Flowzint Finance AI.

## Run

```bash
npm install
copy .env.local.example .env.local
npm run dev
```

## Features
- **Hybrid Autocomplete Search**: Features a fast, local-first autocomplete lookup that falls back to the backend `/search` API to resolve any company name into its exact Yahoo Finance ticker symbol before analysis.
- **Dynamic AI Scorecards**: Renders the output of six specialized AI agents into digestible, visual scorecards and charts.
- **Theme Support**: Includes a dark/light mode toggle with premium glassmorphism design.

> **Note for AI Coding Assistants**: Please see [`AGENTS.md`](./AGENTS.md) for the frontend AI agent architectural context.
