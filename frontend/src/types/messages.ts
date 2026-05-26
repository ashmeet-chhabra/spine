/**
 * Shared WebSocket message types for SPINE harness.
 * Used by both frontend hooks/components for type safety.
 */

// ─── Client → Server messages ───────────────────────────────

export interface PingMessage {
  type: 'ping';
}

export interface ChatMessage {
  type: 'chat';
  apiKey: string;
  content: string;
  threadId: string;
  assistantId: string;
  modelName: string;
  llmProvider: string;
  systemPrompt: string;
  safetyMode: 'ask' | 'allow' | 'deny';
  memoryMode?: string;
  webSearchEnabled?: boolean;
  codebaseIndexingEnabled?: boolean;
  files?: string[];
  audioFile?: string;
  voiceMode?: 'direct' | 'rant';
  availableSubagents?: string[];
  agentRules?: {
    readMode?: 'allow' | 'ask' | 'deny';
    writeMode?: 'allow' | 'ask' | 'deny';
    editMode?: 'allow' | 'ask' | 'deny';
    bashMode?: 'allow' | 'ask' | 'deny';
    delegationMode?: 'allow' | 'ask' | 'deny';
    commandRules: Rule[];
    writeFileRules: Rule[];
    editFileRules?: Rule[];
    readFileRules?: Rule[];
    delegationRules?: Rule[];
  };
}

export interface PermissionResponseMessage {
  type: 'permission_response';
  toolCallId: string;
  allowed: boolean;
  modifiedContent?: string;
}

export interface GetMemoriesMessage {
  type: 'get_memories';
  apiKey: string;
  assistantId: string;
}

export interface AddMemoryMessage {
  type: 'add_memory';
  apiKey: string;
  assistantId: string;
  content: string;
}

export interface DeleteMemoryMessage {
  type: 'delete_memory';
  apiKey: string;
  assistantId: string;
  memoryId: string;
}

export interface VoiceStreamStartMessage {
  type: 'voice_stream_start';
  apiKey: string;
  voiceMode: 'direct' | 'rant';
}

export interface VoiceStreamChunkMessage {
  type: 'voice_stream_chunk';
  data: string; // Base64 encoded audio
}

export interface VoiceStreamStopMessage {
  type: 'voice_stream_stop';
}

export type ClientMessage =
  | PingMessage
  | ChatMessage
  | PermissionResponseMessage
  | GetMemoriesMessage
  | AddMemoryMessage
  | DeleteMemoryMessage
  | VoiceStreamStartMessage
  | VoiceStreamChunkMessage
  | VoiceStreamStopMessage
  | { type: 'register_thread'; threadId: string }
  | { type: 'cancel_run' }
  | { type: 'get_memories'; apiKey: string; assistantId: string }
  | { type: 'add_memory'; apiKey: string; assistantId: string; content: string }
  | { type: 'delete_memory'; apiKey: string; assistantId: string; memoryId: string }
  | { type: 'direct_command'; cmd: string; apiKey: string };

// ─── Server → Client messages ───────────────────────────────

export interface PongMessage {
  type: 'pong';
}

export interface StatusMessage {
  type: 'status';
  text: string;
}

export interface ChunkMessage {
  type: 'chunk';
  content: string;
}

export interface ReasoningChunkMessage {
  type: 'reasoning_chunk';
  content: string;
}

export interface SubagentChunkMessage {
  type: 'subagent_chunk';
  content: string;
  metadata?: { subAgentId?: string };
}

export interface SubagentReasoningMessage {
  type: 'subagent_reasoning';
  content: string;
  metadata?: { subAgentId?: string };
}

export interface ToolStartMessage {
  type: 'tool_start';
  tool: string;
  args: Record<string, unknown>;
  toolCallId: string;
}

export interface ToolEndMessage {
  type: 'tool_end';
  toolCallId: string;
  output: string;
  success?: boolean;
}

export interface CommandOutputMessage {
  type: 'command_output';
  data: string;
  stream: 'stdout' | 'stderr';
  toolCallId: string;
}

export interface WritePreviewMessage {
  type: 'write_preview';
  path: string;
  original: string;
  proposed: string;
  toolCallId: string;
}

export interface PermissionRequestMessage {
  type: 'permission_request';
  tool: string;
  args: { cmd?: string; path?: string };
  toolCallId: string;
}

export interface Task {
  id: string;
  title: string;
  status: 'todo' | 'in-progress' | 'completed' | 'failed';
  agentId?: string;
}

export interface TaskListUpdateMessage {
  type: 'task_list_update';
  tasks: Task[];
}

export interface MemoriesMessage {
  type: 'memories';
  memories: Memory[];
}

export interface DoneMessage {
  type: 'done';
  threadId?: string;
  assistantId?: string;
  contextUsage?: {
    tokens?: number;
    limit?: number;
    percentage?: number;
  };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
}

export interface VoiceTranscriptionMessage {
  type: 'voice_transcription';
  text: string;
  isFinal: boolean;
  voiceMode: 'direct' | 'rant';
}

export interface ErrorMessage {
  type: 'error';
  message: string;
}

export type ServerMessage =
  | PongMessage
  | StatusMessage
  | ChunkMessage
  | ReasoningChunkMessage
  | SubagentChunkMessage
  | SubagentReasoningMessage
  | ToolStartMessage
  | ToolEndMessage
  | CommandOutputMessage
  | WritePreviewMessage
  | PermissionRequestMessage
  | TaskListUpdateMessage
  | MemoriesMessage
  | DoneMessage
  | VoiceTranscriptionMessage
  | ErrorMessage;

// ─── Shared domain models ───────────────────────────────────

export interface SubagentRun {
  subAgentId: string;
  content: string;
  reasoning?: string;
  status: 'running' | 'completed';
}

export interface ToolCall {
  id: string;
  name: string;
  args: Record<string, unknown>;
  status: 'pending' | 'running' | 'completed' | 'rejected';
  output?: string;
  logs?: string;
}

export interface Message {
  messageId?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  reasoning?: string;
  toolCalls?: ToolCall[];
  subagentRuns?: SubagentRun[];
  contextUsage?: {
    tokens?: number;
    limit?: number;
    percentage?: number;
  };
  usage?: {
    inputTokens?: number;
    outputTokens?: number;
    totalTokens?: number;
  };
  modelName?: string;
  provider?: string;
  agentId?: string;
  files?: string[];
}

export interface Model {
  name: string;
  provider: string;
  modelType: string;
  inputCostPer1mTokens?: number | null;
  outputCostPer1mTokens?: number | null;
}

export interface Memory {
  id: string;
  content: string;
  metadata?: unknown;
  score?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface PendingPermission {
  type: 'run_command' | 'write_file' | 'read_file' | 'update_task_list';
  path?: string;
  original?: string;
  proposed?: string;
  cmd?: string;
  toolCallId: string;
}

export interface Rule {
  pattern: string;
  action: 'allow' | 'deny' | 'ask';
}

export interface PersonaProfile {
  id: string;
  name: string;
  description: string;
  systemPrompt: string;
  color?: string;
  safetyMode: 'ask' | 'allow' | 'deny';
  readMode?: 'allow' | 'ask' | 'deny';
  writeMode?: 'allow' | 'ask' | 'deny';
  editMode?: 'allow' | 'ask' | 'deny';
  bashMode?: 'allow' | 'ask' | 'deny';
  delegationMode?: 'allow' | 'ask' | 'deny';
  commandRules: Rule[];
  writeFileRules: Rule[];
  editFileRules?: Rule[];
  readFileRules?: Rule[];
  delegationRules?: Rule[];
  webSearchEnabled?: boolean;
  codebaseIndexingEnabled?: boolean;
  isNative?: boolean;
  isSubagent?: boolean;
}

export type WsStatus = 'connecting' | 'connected' | 'disconnected';

export const PRESET_PERSONAS: PersonaProfile[] = [
  {
    id: 'build',
    name: 'Build Agent',
    description: 'Specializes in implementation, editing files, and running builds/tests. Full access to most tools.',
    systemPrompt: 'You are SPINE Build Agent. You specialize in rapidly implementing changes, editing files, running test commands, installing packages, and performing builds. Write clean, complete code and execute tools automatically. When you finish a task from the Quest Log, use the update_task_list tool to mark it as completed.',
    safetyMode: 'allow',
    readMode: 'allow',
    writeMode: 'allow',
    editMode: 'allow',
    bashMode: 'allow',
    webSearchEnabled: true,
    codebaseIndexingEnabled: true,
    commandRules: [
      { pattern: '*', action: 'allow' },
      { pattern: 'rm -rf *', action: 'deny' },
      { pattern: 'rm -rf', action: 'deny' },
      { pattern: 'poweroff', action: 'deny' },
      { pattern: 'shutdown', action: 'deny' },
      { pattern: 'del *', action: 'deny' }
    ],
    writeFileRules: [
      { pattern: '*', action: 'allow' },
      { pattern: '.env', action: 'deny' }
    ],
    editFileRules: [
      { pattern: '*', action: 'allow' },
      { pattern: '.env', action: 'deny' }
    ],
    readFileRules: [
      { pattern: '*', action: 'allow' }
    ],
    color: '#06b6d4',
    isNative: true
  },
  {
    id: 'explorer',
    name: 'Code Explorer',
    description: 'Expert at navigating and mapping large codebases. Uses grep and file listing to find patterns and connections.',
    systemPrompt: 'You are SPINE Explorer. Your goal is to map the codebase, find string patterns, and understand complex relationships between files. You excel at finding where things are defined and used. You do not modify code.',
    safetyMode: 'allow',
    readMode: 'allow',
    writeMode: 'deny',
    editMode: 'deny',
    bashMode: 'deny',
    webSearchEnabled: true,
    codebaseIndexingEnabled: true,
    commandRules: [
      { pattern: '*', action: 'deny' }
    ],
    writeFileRules: [
      { pattern: '*', action: 'deny' }
    ],
    editFileRules: [
      { pattern: '*', action: 'deny' }
    ],
    readFileRules: [
      { pattern: '*', action: 'allow' }
    ],
    color: '#10b981',
    isNative: true
  },
  {
    id: 'reviewer',
    name: 'Quality Reviewer',
    description: 'Audits code for correctness, consistency, and errors. Can see session diffs and run linters/tests.',
    systemPrompt: 'You are SPINE Reviewer. You are a highly critical code reviewer focused on correctness, performance, and best practices. You analyze the session diff to ensure quality and run tests/linters to verify implementation. You do not write new code.',
    safetyMode: 'ask',
    readMode: 'allow',
    writeMode: 'deny',
    editMode: 'deny',
    bashMode: 'allow',
    webSearchEnabled: false,
    codebaseIndexingEnabled: true,
    commandRules: [
      { pattern: 'npm test', action: 'allow' },
      { pattern: 'npm run lint', action: 'allow' },
      { pattern: '*', action: 'ask' }
    ],
    writeFileRules: [
      { pattern: '*', action: 'deny' }
    ],
    editFileRules: [
      { pattern: '*', action: 'deny' }
    ],
    readFileRules: [
      { pattern: '*', action: 'allow' }
    ],
    color: '#ef4444',
    isNative: true
  },
  {
    id: 'plan',
    name: 'Plan Agent',
    description: 'High-level architectural planning persona. Restricted to writing plans in .spine/plans/.',
    systemPrompt: 'You are SPINE Plan Agent. Your job is to analyze the codebase, draft detailed architectural and implementation plans, and write them into the .spine/plans/ directory. Always use the update_task_list tool to provide a clear, step-by-step roadmap for the developer in the UI Quest Log.',
    safetyMode: 'deny',
    readMode: 'allow',
    writeMode: 'deny',
    editMode: 'deny',
    bashMode: 'deny',
    webSearchEnabled: true,
    codebaseIndexingEnabled: false,
    commandRules: [
      { pattern: '*', action: 'deny' },
      { pattern: 'git status', action: 'allow' }
    ],
    writeFileRules: [
      { pattern: '*', action: 'deny' },
      { pattern: '.spine/plans/**', action: 'allow' }
    ],
    editFileRules: [
      { pattern: '*', action: 'deny' },
      { pattern: '.spine/plans/**', action: 'allow' }
    ],
    readFileRules: [
      { pattern: '*', action: 'allow' }
    ],
    color: '#a855f7',
    isNative: true
  },
  {
    id: 'planner',
    name: 'Task Planner',
    description: 'Decomposes complex requests into ordered Quest Log tasks. Invokable directly or as a subagent by @build. No file modifications.',
    systemPrompt: 'You are SPINE Task Planner. You are a methodical project planner. Given a complex user request, you decompose it into a clear, ordered list of discrete, actionable engineering tasks. You MUST call the update_task_list tool to populate the Quest Log with your full task breakdown before explaining anything. Each task should be atomic and independently completable. After populating the Quest Log, briefly explain your reasoning. You do not write code or modify files.',
    safetyMode: 'deny',
    readMode: 'allow',
    writeMode: 'deny',
    editMode: 'deny',
    bashMode: 'deny',
    webSearchEnabled: false,
    codebaseIndexingEnabled: true,
    commandRules: [
      { pattern: '*', action: 'deny' }
    ],
    writeFileRules: [
      { pattern: '*', action: 'deny' }
    ],
    editFileRules: [
      { pattern: '*', action: 'deny' }
    ],
    readFileRules: [
      { pattern: '*', action: 'allow' }
    ],
    color: '#f59e0b',
    isNative: true,
    isSubagent: true
  }
];

export function getAgentColor(agent?: PersonaProfile | null, agentId?: string | null): string {
  if (agent?.color) return agent.color;
  const id = agent?.id || agentId;
  if (id === 'build') return '#06b6d4';
  if (id === 'plan') return '#a855f7';
  if (id === 'planner') return '#f59e0b';
  if (id === 'reviewer') return '#ef4444';
  if (id === 'explorer') return '#10b981';
  return '#10b981';
}

