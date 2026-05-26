# SPINE 🦾

SPINE is a local developer harness and AI agent runner designed to bridge the gap between autonomous AI agents and local system safety. It provides a visual, chat-based interface for collaborating with diverse AI agent personas, executing terminal commands, and modifying codebases under a transparent, granular safety-approval mechanism.

## 🏗 Project Architecture

The project is structured as a monorepo-style application with a decoupled backend and frontend:

- **Root**: Orchestration and shared configuration.
- **Backend (`/backend`)**: A Node.js/TypeScript server built with **Hono**.
  - Uses **WebSockets (`ws`)** for real-time streaming of agent reasoning, chat, and tool outputs.
  - Integrates the **Backboard SDK** as the primary intelligence orchestrator.
  - Implements **safety-gated local tools**: `read_file`, `write_file`, and `run_command`.
- **Frontend (`/frontend`)**: A modern **React** application built with **Vite** and **TypeScript**.
  - Features an interactive **Monaco-powered Diff Viewer** for safe code reviews.
  - Includes a permissions dashboard for managing agent safety rules and personas.
  - Manages persistent state using LocalStorage and Backboard's Thread/Memory APIs.

## 🚀 Getting Started

### Prerequisites
- Node.js (v18+)
- npm

### Installation
```bash
npm install
cd frontend && npm install
```

### Running the Development Environment
From the project root, run the following command to start both the backend and frontend concurrently:
```bash
npm run dev
```
- **Backend**: http://localhost:3001
- **Frontend**: http://localhost:5173

## 🛠 Key Features & Tools

### Multi-Agent Personas
SPINE supports dynamic switching between agent personas (e.g., `@build`, `@architect`, `@plan`) within the same conversation thread. Each persona can have unique system prompts and safety configurations.

### Permissions & Safety
- **Granular Rules**: Define `allow`, `ask`, or `deny` actions for specific file patterns and terminal commands.
- **Interactive Diffs**: All file modifications are presented in a side-by-side diff editor. You can edit the proposed changes inline before accepting them.
- **Safety-Gated Shell**: Agents can run commands locally, but dangerous operations are gated behind human approval.

### Integration with Backboard
SPINE leverages Backboard for:
- **Model Orchestration**: Access to Claude, GPT-4, Gemini, and more.
- **Thread Management**: Stateful conversation history.
- **Assistant Memory**: Persistent storage of project facts and developer preferences.

## 📜 Development Conventions

### 🧠 Expertise & Intent Alignment
Distinguish between **Directives** (unambiguous requests for action or implementation) and **Inquiries** (requests for analysis, advice, brainstorming, or observations). 

- **Inquiries**: Assume all requests are Inquiries unless they contain an explicit instruction to perform a task. If the user asks a question, wants to plan, brainstorm, or clarify something, your scope is strictly limited to research and analysis. You MUST NOT initiate implementation or modify files. Propose a strategy or answer the question, then stop and wait for a Directive.
- **Directives**: Only proceed with file modifications when issued a clear, explicit instruction to perform a task (e.g., "Implement this", "Fix this bug", "Update the file").

### 🚫 Strict: No Code Placeholders
When modifying files, **NEVER** use placeholders, omission comments (e.g., `// ... rest of code`), or partial snippets. Every code change must be idiomatically complete and syntactically valid. Truncated code causes build failures and application crashes. Always provide the full content or use surgical `replace` calls with enough context to ensure integrity.

- **Language**: TypeScript is used across the entire stack for type safety and maintainability.
- **Backend**: Prefers Hono for its lightweight and fast middleware-based routing.
- **Frontend**: Uses functional React components with hooks for state management. Styling is handled via a combination of Vanilla CSS and interactive components.
- **Tooling**:
  - `tsx` for running the TypeScript backend in development.
  - `vite` for fast frontend builds and hot module replacement.
  - `concurrently` to manage multiple processes from a single command.

## 📂 Directory Structure Highlights

- `backend/server.ts`: The main entry point for the Hono/WebSocket server.
- `backend/ai.ts`: Orchestrates the `AISession` and Backboard SDK interactions.
- `backend/tools.ts`: Defines the implementation of local sandbox tools.
- `frontend/src/App.tsx`: The primary UI layout and application logic.
- `frontend/src/components/`: Reusable UI components (Chat, DiffViewer, Permissions, etc.).
- `scratch/`: Contains utility scripts for testing and development helpers.
