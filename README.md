# SPINE

A chat-based developer harness that bridges autonomous AI agents and local system safety. Built on [Backboard](https://backboard.ai).

## Quick Start

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start the backend
cd ../backend && npm run dev

# In another terminal, start the frontend
cd frontend && npm run dev
```

Open `http://localhost:5173` and enter your Backboard API key to begin.

## Features

- **Multi-Agent Orchestration** — Specialized agents (build, explorer, reviewer, planner) that can delegate tasks to each other
- **Realtime Voice** — Speech-to-text with "As-Is" and "AI Optimize" modes
- **Safety Controls** — Per-agent global permissions and glob-pattern file/command rules
- **Interactive Diff Editor** — Monaco-powered side-by-side diffs for every file change
- **Backboard Router** — Auto-selects the optimal model; supports fastest/cheapest/failover routing rules
- **Agent Generator** — Describe what you need and get a configured custom agent
- **Web Search & Memory** — Agents can search the web and retain project context across sessions

## Tech Stack

- **Frontend**: React 19, TypeScript, Vite, Monaco Editor, Lucide icons
- **Backend**: Hono (TypeScript), WebSocket server, Backboard SDK
- **Models**: Anthropic, OpenAI, Google, and more via Backboard

## Configuration

All agent permissions, command rules, and file access rules are configured through the Agents panel (sidebar > Agents).
