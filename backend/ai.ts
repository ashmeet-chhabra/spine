import { BackboardClient, ChatMessagesResponse } from 'backboard-sdk';
import { readFile, writeFile, runCommand, scanDirectoryTree, listFiles, grepSearch } from './tools.js';
import { join } from 'path';
import { existsSync } from 'fs';

const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

export const TOOLS_CATEGORIES = {
  CORE: [
    {
      type: "function",
      function: {
        name: "read_file",
        description: "Read the contents of a file from the workspace. Returns the full file content.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "The path to the file relative to the project root."
            }
          },
          required: ["path"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "write_file",
        description: "Write or overwrite a file in the workspace. Shows a diff preview to the user before writing.",
        parameters: {
          type: "object",
          properties: {
            path: {
              type: "string",
              description: "The path to the file relative to the project root."
            },
            content: {
              type: "string",
              description: "The complete new content to write to the file."
            }
          },
          required: ["path", "content"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "update_task_list",
        description: "Update the visible checklist of tasks in the UI Quest Log. Use this to set the initial plan and mark items as completed/in-progress.",
        parameters: {
          type: "object",
          properties: {
            tasks: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  id: { type: "string", description: "Unique identifier for the task." },
                  title: { type: "string", description: "Clear, concise description of the task." },
                  status: { 
                    type: "string", 
                    enum: ["todo", "in-progress", "completed", "failed"],
                    description: "Current progress state."
                  },
                  agentId: { type: "string", description: "Optional agent ID assigned to this task." }
                },
                required: ["id", "title", "status"]
              }
            }
          },
          required: ["tasks"]
        }
      }
    },
    {
      type: "function",
      function: {
        name: "remember_fact",
        description: "Save a new project fact or developer preference to the persistent assistant memory. Use this when you discover important configurations, ports, test command details, file locations, or setup rules that should be remembered in future chats.",
        parameters: {
          type: "object",
          properties: {
            fact: {
              type: "string",
              description: "The project fact, rule, or preference to remember (e.g. 'Frontend dev server runs on port 3000', 'Prettier is used for code formatting'). Keep it concise and factual."
            }
          },
          required: ["fact"]
        }
      }
    }
  ],
  BASH: [
    {
      type: "function",
      function: {
        name: "run_command",
        description: "Execute a command in the local shell. Requires explicit user permission in the UI.",
        parameters: {
          type: "object",
          properties: {
            cmd: {
              type: "string",
              description: "The command to run (e.g. 'npm install', 'npm test')."
            }
          },
          required: ["cmd"]
        }
      }
    }
  ],
  DISCOVERY: [
    {
      type: "function",
      function: {
        name: "list_files",
        description: "Returns a flat list of all relevant files in the project root.",
        parameters: {
          type: "object",
          properties: {}
        }
      }
    },
    {
      type: "function",
      function: {
        name: "grep_search",
        description: "Search for a regex pattern in the project files.",
        parameters: {
          type: "object",
          properties: {
            pattern: {
              type: "string",
              description: "The regex pattern to search for."
            },
            includePattern: {
              type: "string",
              description: "Optional glob-like pattern to filter files (e.g. '*.ts')."
            }
          },
          required: ["pattern"]
        }
      }
    }
  ],
  REVIEW: [
    {
      type: "function",
      function: {
        name: "get_session_diff",
        description: "Returns the diff of all files modified in the current conversation thread.",
        parameters: {
          type: "object",
          properties: {}
        }
      }
    }
  ],
  ORCHESTRATION: [
    {
      type: "function",
      function: {
        name: "invoke_agent",
        description: "Delegate a sub-task to a specialized helper agent (e.g. 'explorer' for code search, 'reviewer' for audits, 'planner' for task decomposition).",
        parameters: {
          type: "object",
          properties: {
            agentId: {
              type: "string",
              enum: ["explorer", "reviewer", "planner"],
              description: "The ID of the sub-agent helper to invoke."
            },
            prompt: {
              type: "string",
              description: "The specific instruction or question for the sub-agent."
            }
          },
          required: ["agentId", "prompt"]
        }
      }
    }
  ]
};

export const SUBAGENT_SYSTEM_PROMPTS: Record<string, string> = {
  explorer: 'You are SPINE Explorer. Your goal is to map the codebase, find string patterns, and understand complex relationships between files. You excel at finding where things are defined and used. You do not modify code.',
  reviewer: 'You are SPINE Reviewer. You are a highly critical code reviewer focused on correctness, performance, and best practices. You analyze the session diff to ensure quality and run tests/linters to verify implementation. You do not write new code.',
  planner: 'You are SPINE Planner. You are a methodical project planner. Given a complex user request, you decompose it into a clear, ordered list of discrete, actionable engineering tasks. You MUST call the update_task_list tool to populate the Quest Log with your tasks before explaining anything. Each task should be atomic and completable. You do not write code or modify files.'
};

function impliesCodebaseAccess(prompt: string): boolean {
  if (!prompt) return false;
  const lowercase = prompt.toLowerCase();
  
  // Direct keywords related to files/folders/code/project structure/reading/tools
  const keywords = [
    'file', 'folder', 'directory', 'project', 'workspace', 'codebase', 'repo', 'repository',
    'read', 'explain', 'show', 'view', 'find', 'search', 'list', 'scan', 'index',
    'change', 'modify', 'edit', 'write', 'implement', 'refactor', 'fix', 'debug', 'audit',
    'structure', 'tree', 'map', 'files', 'folders'
  ];
  
  if (keywords.some(k => lowercase.includes(k))) {
    return true;
  }
  
  // File extensions (e.g. .ts, .tsx, .css, .json, .py, .md)
  const extRegex = /\b\w+\.(tsx?|jsx?|json|html?|css|py|sh|md|ya?ml|env)\b/i;
  if (extRegex.test(lowercase)) {
    return true;
  }
  
  // Path-like sequences (containing slashes) excluding URLs
  if ((lowercase.includes('/') || lowercase.includes('\\')) && !lowercase.includes('http://') && !lowercase.includes('https://')) {
    return true;
  }
  
  return false;
}

function getRoutingRule(modelName: string): string | null {
  if (!modelName.startsWith('backboard-router')) return null;
  const prefix = 'backboard-router:';
  if (modelName === 'backboard-router') return 'default';
  if (modelName.startsWith(prefix)) return modelName.slice(prefix.length);
  return 'default';
}

export interface AISessionOptions {
  apiKey: string;
  threadId?: string;
  assistantId?: string;
  systemPrompt?: string;
  modelName?: string;
  llmProvider?: string;
  webSearchEnabled?: boolean;
  codebaseIndexingEnabled?: boolean;
  agentId?: string;
  agentRules?: any;
  availableSubagents?: string[];
}

export class AISession {
  private client: BackboardClient;
  private apiKey: string;
  public threadId?: string;
  public assistantId?: string;
  private systemPrompt?: string;
  public modelName: string;
  public llmProvider: string;
  private webSearchEnabled: boolean;
  private codebaseIndexingEnabled: boolean;
  public agentId?: string;
  public agentRules?: any;
  public availableSubagents: string[] = [];
  public aborted: boolean = false;
  private modifiedFiles: Map<string, { original: string; current: string }> = new Map();

  constructor(options: AISessionOptions) {
    this.client = new BackboardClient({ apiKey: options.apiKey });
    this.apiKey = options.apiKey;
    this.threadId = options.threadId;
    this.assistantId = options.assistantId;
    this.systemPrompt = options.systemPrompt || "You are SPINE, a local AI coding harness. You write clean, safe, professional code, read and write files, and execute shell commands with the user's explicit permission.";
    this.modelName = options.modelName || "claude-3-5-sonnet-20241022";
    this.llmProvider = options.llmProvider || "anthropic";
    this.webSearchEnabled = options.webSearchEnabled || false;
    this.codebaseIndexingEnabled = options.codebaseIndexingEnabled || false;
    this.agentId = options.agentId;
    this.agentRules = options.agentRules;
    this.availableSubagents = options.availableSubagents || [];
  }

  private getToolsForAgent(): any[] {
    const tools: any[] = [...TOOLS_CATEGORIES.CORE];
    
    // Core Bash & Discovery tools are generally available to agents with relevant permissions
    // Build agent (or default) has access to everything
    if (this.agentId === 'build' || !this.agentId) {
      tools.push(...TOOLS_CATEGORIES.BASH, ...TOOLS_CATEGORIES.DISCOVERY, ...TOOLS_CATEGORIES.REVIEW);
    } else if (this.agentId === 'explorer') {
      tools.push(...TOOLS_CATEGORIES.DISCOVERY);
    } else if (this.agentId === 'reviewer') {
      tools.push(...TOOLS_CATEGORIES.BASH, ...TOOLS_CATEGORIES.REVIEW);
    } else if (this.agentId === 'planner') {
      // Planner: discovery for codebase context + CORE for update_task_list. No bash, no write.
      tools.push(...TOOLS_CATEGORIES.DISCOVERY);
    } else {
      // Default fallback for custom agents
      tools.push(...TOOLS_CATEGORIES.DISCOVERY);
    }

    // Orchestration tools (delegation)
    // Respect explicit delegationMode if provided, otherwise only Build can delegate by default
    const delegationMode = this.agentRules?.delegationMode || (this.agentId === 'build' ? 'allow' : 'ask');
    if (delegationMode !== 'deny') {
      tools.push(...TOOLS_CATEGORIES.ORCHESTRATION);
    }

    return tools;
  }

  public abort() {
    this.aborted = true;
  }

  private async refineRant(transcript: string): Promise<string> {
    try {
      const refinementClient = new BackboardClient({ apiKey: this.apiKey });
      const prompt = `You are a prompt optimizer for an AI developer coding agent. The user is a developer who brainstormed out loud (talked in a rant) while writing code. 
Take their raw speech transcription and distill it into a clean, concise, structured, and actionable set of developer instructions for a coding assistant. 
Do not write code yourself. Do not add conversational fluff or introductory text. Just output the refined developer instructions directly.

User speech transcription:
"${transcript}"`;

      const rantRule = getRoutingRule(this.modelName);
      const rantOpts: any = {
        content: prompt,
        stream: false
      };
      if (!rantRule) {
        rantOpts.modelName = this.modelName;
        rantOpts.llmProvider = this.llmProvider;
      } else if (rantRule !== 'default') {
        rantOpts.modelName = rantRule;
      }
      const res = await refinementClient.sendMessage(rantOpts);
      
      const chatMessagesRes = res as ChatMessagesResponse;
      return chatMessagesRes.content || transcript;
    } catch (err) {
      console.error('[AI] Rant refinement failed:', err);
      return transcript;
    }
  }

  async sendMessage(
    content: string,
    onChunk: (type: 'content' | 'reasoning' | 'subagent_chunk' | 'subagent_reasoning', text: string, metadata?: any) => void,
    onToolStart: (toolName: string, args: any, toolCallId: string) => void,
    onToolEnd: (toolCallId: string, output: string, success?: boolean) => void,
    requestPermission: (tool: string, args: any, toolCallId: string) => Promise<{ allowed: boolean; modifiedContent?: string; reason?: string }>,
    onCommandOutput?: (data: string, stream: 'stdout' | 'stderr', toolCallId: string) => void,
    onTaskListUpdate?: (tasks: any[]) => void,
    memoryMode: string = 'Auto',
    files?: string[],
    audioFile?: string,
    voiceMode?: 'direct' | 'rant',
    availableSubagents?: string[]
    ): Promise<{ threadId: string; assistantId: string; contextUsage?: any; usage?: any }> {
    this.aborted = false;
    if (availableSubagents) this.availableSubagents = availableSubagents;
    const toolsDefinitions = this.getToolsForAgent();

    let memoriesContext = '';
    if (memoryMode !== 'off' && this.assistantId) {
      try {
        const result = await this.client.getMemories(this.assistantId, { pageSize: 100 });
        const raw = result?.memories ?? result?.data ?? (Array.isArray(result) ? result : []);
        if (raw.length > 0) {
          memoriesContext = `\n\n[Persistent Memories / Project Context]\nYou must adhere to the following project-specific facts:\n` + 
            raw.map((m: any) => `- ${m.memory || m.content}`).join('\n');
          console.log(`[AI] Loaded ${raw.length} memories for prompt injection.`);
        }
      } catch (err) {
        console.error('[AI] Failed to fetch memories for prompt injection:', err);
      }
    }

    let finalSystemPrompt = this.systemPrompt || '';
    if (this.codebaseIndexingEnabled && impliesCodebaseAccess(content)) {
      const tree = await scanDirectoryTree();
      finalSystemPrompt = `${finalSystemPrompt}\n\n[Workspace Codebase Directory Structure]\n${tree}`;
    }
    if (memoriesContext) {
      finalSystemPrompt = `${finalSystemPrompt}${memoriesContext}`;
    }

    let stream;
    if ((files && files.length > 0) || audioFile) {
      // Lazy load assistant and thread for multipart uploads
      if (!this.assistantId) {
        const assistant = await this.client.createAssistant({
          name: `SPINE Assistant (${this.agentId || 'default'})`,
          system_prompt: finalSystemPrompt,
          tools: toolsDefinitions
        });
        this.assistantId = assistant.assistantId;
      } else {
        await this.client.updateAssistant(this.assistantId, {
          system_prompt: finalSystemPrompt,
          tools: toolsDefinitions
        });
      }
      if (!this.threadId) {
        const thread = await this.client.createThread(this.assistantId);
        this.threadId = thread.threadId;
      }

      let finalContent = content;
      if (audioFile) {
        onChunk('content', `*Transcribing voice audio...*\n`);
        const addRes = (await this.client.addMessage(this.threadId, {
          audioFile,
          voice: { stt: {} },
          sendToLlm: 'off',
          llmProvider: this.llmProvider,
          modelName: this.modelName
        })) as ChatMessagesResponse;
        
        const lastMsg = addRes.messages?.[addRes.messages.length - 1];
        const transcript = (lastMsg?.voiceRecords?.stt?.transcript as string) || lastMsg?.content || '';
        console.log('[AI] Audio transcribed:', transcript);
        
        if (voiceMode === 'rant' && transcript.trim()) {
          onChunk('content', `*Refining speech transcript rant...*\n`);
          try {
            finalContent = await this.refineRant(transcript);
            onChunk('content', `\n*Speech Transcription:* "${transcript}"\n*Distilled Instruction:* "${finalContent}"\n\n`);
          } catch (err) {
            console.error('[AI] Rant refinement failed:', err);
            finalContent = transcript;
            onChunk('content', `\n*Speech Transcription:* "${finalContent}"\n\n`);
          }
        } else {
          finalContent = transcript;
          onChunk('content', `\n*Speech Transcription:* "${finalContent}"\n\n`);
        }

        if (this.codebaseIndexingEnabled && impliesCodebaseAccess(finalContent)) {
          const tree = await scanDirectoryTree();
          finalSystemPrompt = `${this.systemPrompt || ''}\n\n[Workspace Codebase Directory Structure]\n${tree}`;
          if (memoriesContext) {
            finalSystemPrompt = `${finalSystemPrompt}${memoriesContext}`;
          }
          await this.client.updateAssistant(this.assistantId, {
            system_prompt: finalSystemPrompt,
            tools: toolsDefinitions
          });
        }
      }

      // Ensure file paths are absolute for Backboard SDK
      const absoluteFiles = files?.map(f => {
        const abs = join(PROJECT_ROOT, f);
        return existsSync(abs) ? abs : f;
      });

      const routingRule = getRoutingRule(this.modelName);
      const addMsgOpts: any = {
        content: finalContent,
        files: absoluteFiles,
        stream: true,
        memory: memoryMode as any,
        webSearch: this.webSearchEnabled ? 'Auto' : 'off',
        metadata: {
          agentId: this.agentId,
          agent_id: this.agentId,
        }
      };
      if (!routingRule) {
        addMsgOpts.llmProvider = this.llmProvider;
        addMsgOpts.modelName = this.modelName;
        addMsgOpts.metadata.modelName = this.modelName;
        addMsgOpts.metadata.model_name = this.modelName;
        addMsgOpts.metadata.provider = this.llmProvider;
        addMsgOpts.metadata.llm_provider = this.llmProvider;
      } else if (routingRule !== 'default') {
        addMsgOpts.modelName = routingRule;
        addMsgOpts.metadata.modelName = routingRule;
        addMsgOpts.metadata.model_name = routingRule;
        addMsgOpts.metadata.provider = 'backboard';
        addMsgOpts.metadata.llm_provider = 'backboard';
      }
      stream = await this.client.addMessage(this.threadId, addMsgOpts);
    } else {
      let finalContent = content;
      if (voiceMode === 'rant' && finalContent.trim()) {
        onChunk('content', `*Refining speech transcript rant...*\n`);
        try {
          const distilled = await this.refineRant(finalContent);
          onChunk('content', `\n*Speech Transcription:* "${finalContent}"\n*Distilled Instruction:* "${distilled}"\n\n`);
          finalContent = distilled;
        } catch (err) {
          onChunk('content', `\n*Speech Transcription:* "${finalContent}"\n\n`);
        }
      }

      const sendRoutingRule = getRoutingRule(this.modelName);
      const sendMsgOpts: any = {
        content: finalContent,
        threadId: this.threadId,
        assistantId: this.assistantId,
        systemPrompt: finalSystemPrompt,
        tools: toolsDefinitions,
        stream: true,
        memory: memoryMode as any,
        webSearch: this.webSearchEnabled ? 'Auto' : 'off',
        metadata: {
          agentId: this.agentId,
          agent_id: this.agentId,
        }
      };
      if (!sendRoutingRule) {
        sendMsgOpts.llmProvider = this.llmProvider;
        sendMsgOpts.modelName = this.modelName;
        sendMsgOpts.metadata.modelName = this.modelName;
        sendMsgOpts.metadata.model_name = this.modelName;
        sendMsgOpts.metadata.provider = this.llmProvider;
        sendMsgOpts.metadata.llm_provider = this.llmProvider;
      } else if (sendRoutingRule !== 'default') {
        sendMsgOpts.modelName = sendRoutingRule;
        sendMsgOpts.metadata.modelName = sendRoutingRule;
        sendMsgOpts.metadata.model_name = sendRoutingRule;
        sendMsgOpts.metadata.provider = 'backboard';
        sendMsgOpts.metadata.llm_provider = 'backboard';
      }
      stream = await this.client.sendMessage(sendMsgOpts);
    }

    let currentStream = stream as AsyncGenerator<any>;
    let contextUsage: any = null;
    let usage: any = null;

    while (true) {
      if (this.aborted) {
        console.log('[AI] Session aborted before next turn');
        break;
      }
      let requiresActionData: any = null;

      try {
        for await (const chunk of currentStream) {
          if (this.aborted) {
            console.log('[AI] Session aborted during stream chunk processing');
            break;
          }
          // Extract thread and assistant IDs dynamically from any chunk carrying them
          const tid = chunk.thread_id || chunk.threadId || chunk.thread?.threadId || chunk.thread?.thread_id;
          if (tid && !this.threadId) {
            this.threadId = tid;
          }
          const aid = chunk.assistant_id || chunk.assistantId || chunk.assistant?.assistantId || chunk.assistant?.assistant_id;
          if (aid && !this.assistantId) {
            this.assistantId = aid;
          }

          // Capture context usage
          if (chunk.context_usage || chunk.contextUsage) {
            contextUsage = chunk.context_usage || chunk.contextUsage;
          }

          // Capture token usage stats
          if (chunk.usage || chunk.input_tokens || chunk.output_tokens || chunk.total_tokens || chunk.message?.input_tokens) {
            usage = {
              inputTokens: chunk.input_tokens ?? chunk.message?.input_tokens ?? chunk.usage?.input_tokens ?? chunk.usage?.inputTokens,
              outputTokens: chunk.output_tokens ?? chunk.message?.output_tokens ?? chunk.usage?.output_tokens ?? chunk.usage?.outputTokens,
              totalTokens: chunk.total_tokens ?? chunk.message?.total_tokens ?? chunk.usage?.total_tokens ?? chunk.usage?.totalTokens,
            };
          }

          if (chunk.type === 'content_streaming') {
            onChunk('content', chunk.content || '');
          } else if (chunk.type === 'reasoning_streaming') {
            onChunk('reasoning', chunk.content || '');
          } else if (chunk.type === 'requires_action' || chunk.status === 'requires_action' || chunk.status === 'REQUIRES_ACTION') {
            requiresActionData = chunk;
          } else if (chunk.tool_calls || chunk.toolCalls) {
            requiresActionData = chunk;
          }

          // Capture inline/server-side tools like search_web
          if (chunk.type === 'tool_calls' || chunk.tool_calls) {
            const calls = chunk.tool_calls || [];
            for (const call of calls) {
              const name = call.function?.name;
              if (name === 'search_web') {
                let parsedArgs = {};
                try {
                  parsedArgs = typeof call.function.arguments === 'string'
                    ? JSON.parse(call.function.arguments)
                    : (call.function.parsedArguments || {});
                } catch {}
                onToolStart('search_web', parsedArgs, call.id);
              }
            }
          }
          if (chunk.type === 'tool_outputs' || chunk.tool_outputs) {
            const outputs = chunk.tool_outputs || [];
            for (const out of outputs) {
              onToolEnd(out.tool_call_id || out.toolCallId, out.output, !out.output.startsWith('Error'));
            }
          }
        }
      } catch (streamErr: any) {
        console.error('[AI] Stream iteration error:', streamErr.message || streamErr);
        // Break out of the loop gracefully instead of crashing
        break;
      }

      // If no action is required, we are done
      if (!requiresActionData) {
        break;
      }

      // Fallback: Resolve thread and assistant IDs from requiresActionData if not captured already
      if (requiresActionData.thread_id && !this.threadId) {
        this.threadId = requiresActionData.thread_id;
      } else if (requiresActionData.threadId && !this.threadId) {
        this.threadId = requiresActionData.threadId;
      }
      if (requiresActionData.assistant_id && !this.assistantId) {
        this.assistantId = requiresActionData.assistant_id;
      } else if (requiresActionData.assistantId && !this.assistantId) {
        this.assistantId = requiresActionData.assistantId;
      }

      const rawCalls = requiresActionData.tool_calls || requiresActionData.toolCalls || [];
      if (rawCalls.length === 0) {
        break;
      }

      const toolOutputs: Array<{ tool_call_id: string; output: string }> = [];

      for (const call of rawCalls) {
        const id = call.id;
        const name = call.function.name;
        let args = call.function.parsedArguments;
        if (typeof args === 'string') {
          try {
            args = JSON.parse(args);
          } catch {
            args = {};
          }
        } else if (!args && call.function.arguments) {
          try {
            args = JSON.parse(call.function.arguments);
          } catch {
            args = {};
          }
        }

        onToolStart(name, args, id);

        let output = "";
        let success = true;

        try {
          if (name === 'read_file') {
            const permissionRes = await requestPermission('read_file', { path: args.path }, id);
            if (permissionRes.allowed) {
              const fileContent = await readFile(args.path);
              output = fileContent;
            } else {
              output = permissionRes.reason || "Error: Read rejected by user or rules.";
              success = false;
            }
          } else if (name === 'write_file') {
            // For write_file, show preview and wait for permission
            const permissionRes = await requestPermission('write_file', { path: args.path, content: args.content }, id);
            if (permissionRes.allowed) {
              const contentToWrite = permissionRes.modifiedContent !== undefined ? permissionRes.modifiedContent : args.content;
              
              // Track for session diff
              if (!this.modifiedFiles.has(args.path)) {
                let original = "";
                try { original = await readFile(args.path); } catch {}
                this.modifiedFiles.set(args.path, { original, current: contentToWrite });
              } else {
                const entry = this.modifiedFiles.get(args.path)!;
                entry.current = contentToWrite;
              }

              const writeRes = await writeFile(args.path, contentToWrite);
              output = writeRes;
            } else {
              output = permissionRes.reason || "Error: Write rejected by user.";
              success = false;
            }
          } else if (name === 'update_task_list') {
            if (onTaskListUpdate) {
              onTaskListUpdate(args.tasks);
              output = `Task list updated with ${args.tasks.length} items.`;
            } else {
              output = "Error: UI not connected to task tracker.";
              success = false;
            }
          } else if (name === 'run_command') {
            // For run_command, require permission
            const permissionRes = await requestPermission('run_command', { cmd: args.cmd }, id);
            if (permissionRes.allowed) {
              const cmdRes = await runCommand({
                cmd: args.cmd,
                onStdout: (data) => {
                  if (onCommandOutput) onCommandOutput(data, 'stdout', id);
                },
                onStderr: (data) => {
                  if (onCommandOutput) onCommandOutput(data, 'stderr', id);
                }
              });
              output = JSON.stringify({
                code: cmdRes.code,
                stdout: cmdRes.stdout,
                stderr: cmdRes.stderr
              });
              if (cmdRes.code !== 0) {
                success = false;
              }
            } else {
              output = permissionRes.reason || "Error: Command execution rejected by user.";
              success = false;
            }
          } else if (name === 'list_files') {
            const fileList = await listFiles();
            output = fileList.join('\n');
          } else if (name === 'grep_search') {
            const searchResults = await grepSearch(args.pattern, args.includePattern);
            output = searchResults;
          } else if (name === 'get_session_diff') {
            if (this.modifiedFiles.size === 0) {
              output = "No files have been modified in this session yet.";
            } else {
              let diffOutput = "Files modified in this session:\n\n";
              for (const [path, entry] of this.modifiedFiles.entries()) {
                diffOutput += `--- ${path} (Original)\n+++ ${path} (Modified)\n`;
                diffOutput += `(Changes were made to this file. Use read_file to see latest content if needed)\n\n`;
              }
              output = diffOutput;
            }
          } else if (name === 'remember_fact') {
            if (memoryMode === 'off') {
              output = "Error: Memory is turned off. Turn it on in settings to remember facts.";
              success = false;
            } else if (!this.assistantId) {
              output = "Error: No assistant session initialized yet to store facts.";
              success = false;
            } else {
              await this.client.addMemory(this.assistantId, { content: args.fact });
              output = `Successfully saved project fact: "${args.fact}"`;
            }
          } else if (name === 'invoke_agent') {
            const subAgentId = args.agentId;
            const subPrompt = args.prompt;

            // Strict boundary: Only agents explicitly defined as sub-agents can be invoked
            // Include native ones as fallback
            const nativeSubagents = ['explorer', 'reviewer', 'planner'];
            const isSubagent = this.availableSubagents.includes(subAgentId) || nativeSubagents.includes(subAgentId);
            
            if (!isSubagent) {
              output = `Error: Agent @${subAgentId} is not a registered sub-agent. Only helper agents can be invoked.`;
              onToolEnd(id, output, false);
              toolOutputs.push({ tool_call_id: id, output });
              continue;
            }

            // Delegation Permission Gating
            const delegationMode = this.agentRules?.delegationMode || (this.agentId === 'build' ? 'allow' : 'ask');
            if (delegationMode === 'ask') {
              const allowed = await requestPermission('invoke_agent', { agentId: subAgentId, prompt: subPrompt }, id);
              if (!allowed.allowed) {
                output = `User rejected delegation to @${subAgentId}. Task cancelled.`;
                onToolEnd(id, output, false);
                toolOutputs.push({ tool_call_id: id, output });
                continue;
              }
            } else if (delegationMode === 'deny') {
              output = `Error: Delegation blocked by agent permission rules.`;
              onToolEnd(id, output, false);
              toolOutputs.push({ tool_call_id: id, output });
              continue;
            }

            // Inherit parent constraints to prevent permission escalation
            // If parent is read-only, sub-agent MUST be read-only
            const subAgentRules = {
              ...(this.agentRules || {}), // Start with parent rules
              readMode: 'allow', // Sub-agents can always read by design
              writeMode: this.agentRules?.writeMode === 'deny' ? 'deny' : 'allow',
              editMode: this.agentRules?.editMode === 'deny' ? 'deny' : 'allow',
              bashMode: this.agentRules?.bashMode === 'deny' ? 'deny' : 'allow',
              delegationMode: 'deny' // Sub-agents cannot recursively delegate for now
            };

            const subSession = new AISession({
              apiKey: this.apiKey,
              modelName: this.modelName,
              llmProvider: this.llmProvider,
              agentId: subAgentId,
              agentRules: subAgentRules,
              availableSubagents: this.availableSubagents,
              systemPrompt: SUBAGENT_SYSTEM_PROMPTS[subAgentId] || subAgentId,
              webSearchEnabled: this.webSearchEnabled,
              codebaseIndexingEnabled: this.codebaseIndexingEnabled
            });

            onChunk('content', `\n\n--- [Delegating to @${subAgentId}] ---\n`);

            let subAgentOutput = "";
            await subSession.sendMessage(
              subPrompt,
              (type, text) => {
                if (type === 'content') {
                  subAgentOutput += text;
                  onChunk('subagent_chunk', text, { subAgentId });
                } else if (type === 'reasoning') {
                  onChunk('subagent_reasoning', text, { subAgentId });
                }
              },
              () => {}, 
              () => {},
              requestPermission, 
              onCommandOutput,
              undefined, // onTaskListUpdate
              memoryMode // memoryMode is the 8th parameter
            );

            onChunk('content', `\n--- [@${subAgentId} task completed] ---\n\n`);
            output = subAgentOutput || `Agent ${subAgentId} completed the task.`;
          }
        } catch (err: any) {
          success = false;
          // Better error classification
          const errMsg = (err.message || String(err)).toLowerCase();
          if (errMsg.includes('unauthorized') || errMsg.includes('401')) {
            throw new Error('Invalid API key. Check your Backboard API Key.');
          }
          if (errMsg.includes('model') && (errMsg.includes('not found') || errMsg.includes('unsupported'))) {
            throw new Error('Model not available. Try a different model or provider.');
          }
          output = `Error executing tool: ${err.message || err}`;
        }

        onToolEnd(id, output, success);
        toolOutputs.push({ tool_call_id: id, output });
      }

      if (this.aborted) {
        console.log('[AI] Session aborted before submitting tool outputs');
        break;
      }

      try {
        // Submit tool outputs back to continue stream
        const nextStream = await this.client.submitToolOutputsSimple({
          threadId: this.threadId || requiresActionData.thread_id,
          toolOutputs,
          stream: true
        });
        currentStream = nextStream as AsyncGenerator<any>;
      } catch (err: any) {
        if (err.message && err.message.includes('No pending tool calls found')) {
          console.warn('[AI] Suppressing Backboard warning (run already completed/expired):', err.message);
          break;
        }
        throw err;
      }
    }

    // Return the final conversation identifiers and usage stats
    return {
      threadId: this.threadId!,
      assistantId: this.assistantId!,
      contextUsage,
      usage
    };
  }

}
