# SPINE

The Local Autonomous Harness and Multi-Agent Gatekeeper

SPINE is a developer harness that bridges autonomous AI agents and local system safety. It provides a chat-based control center where you can orchestrate specialized AI agents, execute terminal commands, and modify codebases under a transparent, granular safety-approval mechanism. Built on Backboard.

<img width="1842" height="948" alt="Screenshot 2026-05-26 225134" src="https://github.com/user-attachments/assets/4a535fb7-2883-40cd-86e6-7515de9057ae" />

---

## What It Does

SPINE transforms the AI chat experience into a professional multi-agent orchestration platform:

1. **Specialized Expert Squad** — Move beyond generic personas. SPINE features dedicated agents like @explorer for codebase mapping and regex searching, @reviewer for auditing diffs and running diagnostics, @build for rapid implementation, @planner for architectural roadmaps, and custom agents you create yourself.

2. **Autonomous Delegation** — The @build agent can delegate sub-tasks to specialists. It might task the explorer to find a bug or the reviewer to verify its own implementation, all visible in nested, collapsible UI threads. Each agent operates with its own system prompt, tool set, and permission boundaries.

3. **Realtime Voice** — A streaming voice interface with live transcription. Two modes: "As-Is" for raw speech-to-text via Backboard's realtime model, and "Optimize" which distills rambling brainstorms into structured developer instructions.

<img width="1163" height="679" alt="Screenshot 2026-05-26 225258" src="https://github.com/user-attachments/assets/c432430b-5574-4930-8b17-865822985e07" />
<img width="1272" height="709" alt="Screenshot 2026-05-26 225304" src="https://github.com/user-attachments/assets/668bb43e-3637-42bd-8695-3be123bd404d" />


5. **Safety Controls** — Manage agent operations with global safety modes (allow, ask, deny) and precise glob-pattern rules for file access and shell commands (e.g., `*.env: deny` or `rm -rf *: ask`). An integrated rule syntax guide makes configuration straightforward.

6. **Interactive Diff Editor** — Every file modification appears as a side-by-side diff powered by Monaco. You can tweak the agent's proposed code inline before accepting changes.

7. **Backboard Router** — Auto-selects the optimal model for each request. Supports routing strategies: default (GPT-4o), fastest, cheapest, or auto-failover.

8. **Agent Generator** — Describe the agent you need in plain language and SPINE generates a configured custom agent with prompt, permissions, and rules ready to use.

9. **Adaptive UI** — Controls like settings, agents panel, and model selection are integrated into sidebar pillars that stay accessible even when panels are collapsed.

---

## How It Uses Backboard

SPINE leverages Backboard as its intelligence and orchestration engine:

- **Multi-Agent Recursion** — Backboard's flexible session management spawns nested AISession instances, enabling true recursive delegation where agents invoke other agents as tools.

- **Realtime Voice Streaming** — Backboard's binary streaming API bridges raw microphone data to the model with minimal latency, powering the live transcription experience.

- **Dynamic Model Switching** — Toggle between Anthropic, OpenAI, Google, and more on the fly. SPINE queries Backboard's catalog to surface only tool-capable models.

<img width="570" height="502" alt="Screenshot 2026-05-26 225216" src="https://github.com/user-attachments/assets/4024f6eb-82bc-48b5-b9bf-d34b55ce6bdc" />


- **Living Memory** — Instead of a static AGENTS.md rules file, SPINE uses Backboard's memory endpoints to autonomously retain codebase guidelines, setup preferences, and architectural patterns across sessions. Memories inject directly into context on every run.

- **System Prompt Morphing** — SPINE maps its agent concepts onto Backboard Assistants by dynamically updating system prompts and tool definitions before every turn, letting multiple experts share a single conversation thread.

---

## Quick Start

```bash
# Install dependencies
cd backend && npm install
cd ../frontend && npm install

# Start the backend (runs on port 3001)
cd ../backend && npm run dev

# In another terminal, start the frontend (runs on port 5173)
cd frontend && npm run dev
```

Open http://localhost:5173, enter your Backboard API key on the onboarding page, and start a conversation.

### Configuration

Agent permissions, command rules, and file access rules are configured through the Agents panel accessible from the sidebar. Each agent has independent settings for:
- Global action modes (allow, ask, deny) for file reads, writes, edits, shell commands, and sub-agent delegation
- Glob-pattern permission rules with `*: allow` defaults and specific deny/ask overrides
- Web search access, codebase indexing, and sub-agent helper flags

---

## Features in Detail

<img width="642" height="695" alt="Screenshot 2026-05-26 225153" src="https://github.com/user-attachments/assets/4a801664-4588-434c-b9c8-2a4e78059427" />

### Agents

| Agent | Role |
|---|---|
| @build | Implements changes, edits files, runs commands, installs packages |
| @explorer | Maps codebase, finds patterns, traces relationships |
| @reviewer | Audits diffs, runs diagnostics, enforces quality |
| @planner | Analyzes codebase, drafts implementation plans |
| @task-planner | Decomposes requests into actionable task lists |
| Custom | Create your own with tailored prompts and permission rules |

### Model Support

SPINE queries Backboard's model catalog at startup and surfaces all tool-capable models. Supported providers include Anthropic (Claude), OpenAI (GPT-4o, GPT-4o-mini), Google (Gemini), and more. The Backboard Router option auto-selects the optimal model based on your chosen routing strategy.

### Voice Input

The voice recorder streams audio in 500ms chunks to Backboard's realtime transcription endpoint. Two modes:
- **As-Is** — Direct speech-to-text transcription using Backboard's realtime model
- **Optimize** — Transcribes then refines the text through an AI pass that distills rambling speech into clean developer instructions

---

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Monaco Editor, Lucide icons
- **Backend:** Hono (TypeScript), WebSocket server, Backboard SDK
- **Runtime:** Node.js

---

## Future

- Automated visual auditing using Backboard Vision support
- Semantic code indexing with Backboard Document Embeddings for RAG-powered context in large monorepos

 <img width="1807" height="941" alt="Screenshot 2026-05-26 225229" src="https://github.com/user-attachments/assets/027c6d37-86c9-4a88-a0b1-53b62a4c91bf" />
