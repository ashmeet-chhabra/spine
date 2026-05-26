# SPINE 🦾
### *The Local Autonomous Harness & Multi-Agent Permissions Gatekeeper*

This is probably the safest submission — just a coding agent, really. I wanted to put as many Backboard features through their paces as possible, and building a comprehensive developer harness felt like the strongest bet. Backboard handled most of the heavy lifting under the hood while I focused on making this as configurable and extensible as I could.

The name SPINE was chosen to sit alongside Backboard semantically. The UI follows the Backboard design system as closely as possible.

---

SPINE is a resilient developer harness designed to bridge the gap between autonomous AI agents and local system safety. It provides a professional, chat-based control center where developers can orchestrate specialized AI agents, execute terminal commands, and modify codebases under a transparent, highly granular safety-approval mechanism.

---

## ⚡ What it Does

SPINE transforms the "AI Chat" experience into a professional **Multi-Agent Orchestration** platform:

1.  **Specialized Expert Squad**: Move beyond generic personas. SPINE features dedicated agents like **@explorer** (for codebase mapping/regex searching) and **@reviewer** (for auditing diffs and running diagnostics).
2.  **Autonomous Delegation (Sub-Agents)**: The **@build** agent can intelligently delegate sub-tasks to specialists. It might "hire" the explorer to find a bug or the reviewer to verify its own implementation—all visible in nested, collapsible UI threads.
3.  **Realtime Voice**: A zero-latency streaming voice interface. As you speak, a live transcription overlay appears. Support for "As Is" mode or "AI Optimize" (Rant) mode, where brainstorms are distilled into structured developer instructions.
4.  **Transparent Safety Boundaries**: Manage agent operations (file I/O and shell access) using global safety modes and precise glob-pattern rules (e.g., `*.env: deny` or `rm -rf *: ask`). An integrated **Rule Syntax Guide** makes configuration effortless.
5.  **Interactive Diff Editor (Monaco)**: Every file modification is presented in a side-by-side diff. Developers can tweak the agent's proposed code inline before accepting the changes.
6.  **Local-First Identity**: A sleek onboarding flow lets you set up a local profile. Your name is only used for the UI. Agents will not try to befriend you here.
7.  **Adaptive UI Layout**: Reclaimed vertical real estate by removing the top header. Controls like Settings, Permissions, and Model selection are integrated into **Sidebar Control Pillars** that stay accessible even when the panels are collapsed.

---

## 🛠 How We Use Backboard

SPINE leverages **Backboard** as its foundational intelligence and orchestration engine:

-   **Multi-Agent Recursion**: SPINE uses Backboard's flexible session management to spawn nested `AISession` instances. This allows for true recursive delegation where agents can "call" other agents as tools.
-   **Realtime Voice WebSocket API**: SPINE utilizes Backboard's binary streaming capabilities to bridge raw microphone data to the model with minimal latency, providing the high-fidelity transcription feedback that powers the "Whisper-flow" experience.
-   **Dynamic Model & Provider Switching**: Developers can toggle between Anthropic, OpenAI, Google, and more on the fly. SPINE queries Backboard's catalog to ensure only tool-capable models are surfaced for the harness.
-   **Living Memory (AGENTS.md Alternative)**: Instead of manually maintaining a static `AGENTS.md` rules file, SPINE leverages Backboard's memory endpoints to autonomously learn and retain codebase guidelines, setup preferences, and architectural patterns "on steroids". It dynamically injects these memories directly into the system prompt context on every run.
-   **System-Prompt Morphing**: SPINE maps its rich "Agent" concepts onto Backboard Assistants by dynamically updating the `system_prompt` and tool definitions before every run, allowing multiple experts to collaborate within a single conversation thread.

---

## 🏆 Target Categories

- [x] **Useful**: SPINE is a daily-driver tool that makes autonomous agents safe for production codebases by putting the human in the loop of every file edit and shell command.
- [x] **Creative**: Reimagines the sidebar as a persistent "Control Pillar" and introduces a nested delegation UI that makes complex multi-agent workflows readable.
- [x] **Multi‑feature**: Combines real-time binary voice streaming, WebSocket orchestration, Monaco-powered diffing, and complex permission logic into a single cohesive app.
- [x] **Craziest**: Implements a recursive agent architecture where remote LLMs orchestrate local OS operations via a hierarchy of sub-agent specialists.

---

## 🚀 Future Roadmap

*   **Figma MCP Bridge**: Integrating the Model Context Protocol to allow the **@designer** agent to "read" design tokens and component specs directly from Figma JSON.
*   **Automated Visual Auditing**: Using Backboard's Vision support to take screenshots of proposed UI changes and auto-correcting layout shifts before the human even sees them.
*   **Semantic Code Indexing**: Leveraging Backboard's native Document Embeddings to provide RAG-powered context for massive monorepos.
