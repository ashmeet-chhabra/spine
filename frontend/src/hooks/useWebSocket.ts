import { useState, useEffect, useRef, useCallback } from 'react';
import type { Message, Memory, PendingPermission, WsStatus, ServerMessage } from '../types/messages';

interface UseWebSocketProps {
  apiKey: string;
  threadId: string;
  setThreadId: (id: string) => void;
  assistantId: string;
  setAssistantId: (id: string) => void;
  modelName: string;
  llmProvider: string;
  systemPrompt: string;
  safetyMode: 'ask' | 'allow' | 'deny';
  memoryMode: string;
  webSearchEnabled?: boolean;
  codebaseIndexingEnabled?: boolean;
  agentRules: {
    readMode?: 'allow' | 'ask' | 'deny';
    writeMode?: 'allow' | 'ask' | 'deny';
    editMode?: 'allow' | 'ask' | 'deny';
    bashMode?: 'allow' | 'ask' | 'deny';
    commandRules: any[];
    writeFileRules: any[];
    editFileRules?: any[];
    readFileRules?: any[];
    delegationMode?: 'allow' | 'ask' | 'deny';
    delegationRules?: any[];
  };
  agentId?: string;
  availableSubagents?: string[];
  onRunComplete?: (threadId: string) => void;
  onVoiceTranscription?: (text: string, isFinal: boolean, mode: 'direct' | 'rant') => void;
}

function safeSend(ws: WebSocket | null, data: object): boolean {
  if (ws && ws.readyState === WebSocket.OPEN) {
    try {
      ws.send(JSON.stringify(data));
      return true;
    } catch (err) {
      console.error('[WS] Failed to send:', err);
    }
  }
  return false;
}

export function useWebSocket({
  apiKey,
  threadId,
  setThreadId,
  assistantId,
  setAssistantId,
  modelName,
  llmProvider,
  systemPrompt,
  safetyMode,
  memoryMode,
  webSearchEnabled,
  codebaseIndexingEnabled,
  agentRules,
  agentId,
  availableSubagents,
  onRunComplete,
  onVoiceTranscription
}: UseWebSocketProps) {
  const [wsStatus, setWsStatus] = useState<WsStatus>('disconnected');
  const [messages, setMessages] = useState<Message[]>([]);
  const [statusText, setStatusText] = useState('');
  const [loading, setLoading] = useState(false);
  const [memories, setMemories] = useState<Memory[]>([]);
  const [memoriesLoading, setMemoriesLoading] = useState(false);
  const [pendingPermission, setPendingPermission] = useState<PendingPermission | null>(null);
  const [activeCommandId, setActiveCommandId] = useState<string | null>(null);
  const [terminalLogs, setTerminalLogs] = useState('');
  const [latestContextUsage, setLatestContextUsage] = useState<{
    tokens?: number;
    limit?: number;
    percentage?: number;
  } | null>(null);
  const [tasks, setTasks] = useState<any[]>([]);

  // Refs to handle connection dropovers and user steers
  const pendingPermissionRef = useRef<PendingPermission | null>(null);
  useEffect(() => {
    pendingPermissionRef.current = pendingPermission;
  }, [pendingPermission]);

  const onRunCompleteRef = useRef(onRunComplete);
  useEffect(() => { onRunCompleteRef.current = onRunComplete; }, [onRunComplete]);

  interface QueuedMessage {
    content: string;
    files?: string[];
    audioFile?: string;
    voiceMode?: 'direct' | 'rant';
  }

  const queuedMessageRef = useRef<QueuedMessage | null>(null);
  const isSendingRef = useRef(false);
  const pendingSendQueueRef = useRef<Array<any>>([]);

  // Refs to prevent WebSocket callbacks from capturing stale values
  const apiKeyRef = useRef(apiKey);
  const assistantIdRef = useRef(assistantId);
  const threadIdRef = useRef(threadId);
  const modelNameRef = useRef(modelName);
  const llmProviderRef = useRef(llmProvider);
  const systemPromptRef = useRef(systemPrompt);
  const safetyModeRef = useRef(safetyMode);
  const memoryModeRef = useRef(memoryMode);
  const webSearchEnabledRef = useRef(webSearchEnabled);
  const codebaseIndexingEnabledRef = useRef(codebaseIndexingEnabled);
  const agentRulesRef = useRef(agentRules);
  const agentIdRef = useRef(agentId);
  const availableSubagentsRef = useRef(availableSubagents);

  useEffect(() => { apiKeyRef.current = apiKey; }, [apiKey]);
  useEffect(() => { assistantIdRef.current = assistantId; }, [assistantId]);
  useEffect(() => { threadIdRef.current = threadId; }, [threadId]);
  useEffect(() => { modelNameRef.current = modelName; }, [modelName]);
  useEffect(() => { llmProviderRef.current = llmProvider; }, [llmProvider]);
  useEffect(() => { systemPromptRef.current = systemPrompt; }, [systemPrompt]);
  useEffect(() => { safetyModeRef.current = safetyMode; }, [safetyMode]);
  useEffect(() => { memoryModeRef.current = memoryMode; }, [memoryMode]);
  useEffect(() => { webSearchEnabledRef.current = webSearchEnabled; }, [webSearchEnabled]);
  useEffect(() => { codebaseIndexingEnabledRef.current = codebaseIndexingEnabled; }, [codebaseIndexingEnabled]);
  useEffect(() => { agentRulesRef.current = agentRules; }, [agentRules]);
  useEffect(() => { agentIdRef.current = agentId; }, [agentId]);
  useEffect(() => { availableSubagentsRef.current = availableSubagents; }, [availableSubagents]);

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const setThreadIdRef = useRef(setThreadId);
  const setAssistantIdRef = useRef(setAssistantId);
  const onVoiceTranscriptionRef = useRef(onVoiceTranscription);

  useEffect(() => { setThreadIdRef.current = setThreadId; }, [setThreadId]);
  useEffect(() => { setAssistantIdRef.current = setAssistantId; }, [setAssistantId]);
  useEffect(() => { onVoiceTranscriptionRef.current = onVoiceTranscription; }, [onVoiceTranscription]);

  // Fetch memories helper
  const fetchMemories = useCallback((aid?: string) => {
    const activeAid = aid || assistantIdRef.current;
    const activeApiKey = apiKeyRef.current;
    if (!activeAid || !activeApiKey) return;
    safeSend(wsRef.current, {
      type: 'get_memories',
      apiKey: activeApiKey,
      assistantId: activeAid
    });
    setMemoriesLoading(true);
  }, []);

  // Add memory helper
  const handleAddMemory = useCallback((content: string) => {
    const activeAid = assistantIdRef.current;
    const activeApiKey = apiKeyRef.current;
    if (!activeAid || !activeApiKey) return;
    safeSend(wsRef.current, {
      type: 'add_memory',
      apiKey: activeApiKey,
      assistantId: activeAid,
      content
    });
  }, []);

  // Delete memory helper
  const handleDeleteMemory = useCallback((memoryId: string) => {
    const activeAid = assistantIdRef.current;
    const activeApiKey = apiKeyRef.current;
    if (!activeAid || !activeApiKey) return;
    safeSend(wsRef.current, {
      type: 'delete_memory',
      apiKey: activeApiKey,
      assistantId: activeAid,
      memoryId
    });
  }, []);

  // Permission response helper
  const handlePermissionResponse = useCallback((allowed: boolean, modifiedContent?: string) => {
    if (!pendingPermission) return;

    safeSend(wsRef.current, {
      type: 'permission_response',
      toolCallId: pendingPermission.toolCallId,
      allowed,
      modifiedContent
    });

    // Update locally displayed call status
    setMessages((prev) => {
      if (prev.length === 0) return prev;
      const lastIdx = prev.length - 1;
      const last = prev[lastIdx];
      if (last && last.role === 'assistant') {
        const calls = last.toolCalls ? [...last.toolCalls] : [];
        const targetIdx = calls.findIndex((c) => c.id === pendingPermission.toolCallId);
        if (targetIdx !== -1) {
          const updatedCalls = [...calls];
          updatedCalls[targetIdx] = {
            ...calls[targetIdx],
            status: allowed ? 'running' as const : 'rejected' as const
          };
          const updatedLast = {
            ...last,
            toolCalls: updatedCalls
          };
          return [...prev.slice(0, lastIdx), updatedLast];
        }
      }
      return prev;
    });

    setPendingPermission(null);
  }, [pendingPermission]);

  // ── WebSocket Connection (mount-only) ──────────────────────────
  useEffect(() => {
    let isUnmounted = false;
    let pingInterval: ReturnType<typeof setInterval> | null = null;

    function connect() {
      if (isUnmounted) return;

      // Clean up previous socket
      if (wsRef.current) {
        try { wsRef.current.close(); } catch { /* ignore */ }
      }

      const host = window.location.hostname || 'localhost';
      const wsUrl = `ws://${host}:3001/ws`;
      console.log('[WS] Connecting to', wsUrl);
      setWsStatus('connecting');

      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        if (isUnmounted) { ws.close(); return; }
        console.log('[WS] Connected');
        setWsStatus('connected');
        reconnectAttemptsRef.current = 0;

        // Start heartbeat
        if (pingInterval) clearInterval(pingInterval);
        pingInterval = setInterval(() => {
          safeSend(ws, { type: 'ping' });
        }, 10_000);

        // Register current thread
        if (threadIdRef.current) {
          safeSend(ws, {
            type: 'register_thread',
            threadId: threadIdRef.current
          });
        }

        // Dequeue any pending messages
        while (pendingSendQueueRef.current.length > 0) {
          const nextMsg = pendingSendQueueRef.current[0];
          const sent = safeSend(ws, nextMsg);
          if (sent) {
            pendingSendQueueRef.current.shift();
          } else {
            break;
          }
        }

        // Fetch memories if we have the ids
        if (apiKeyRef.current && assistantIdRef.current) {
          safeSend(ws, {
            type: 'get_memories',
            apiKey: apiKeyRef.current,
            assistantId: assistantIdRef.current
          });
        }
      };

      ws.onmessage = (event) => {
        if (isUnmounted) return;
        try {
          const data = JSON.parse(event.data) as ServerMessage;

          switch (data.type) {
            case 'pong':
              break;

            case 'voice_transcription':
              if (onVoiceTranscriptionRef.current) {
                onVoiceTranscriptionRef.current(data.text, data.isFinal, data.voiceMode);
              }
              break;

            case 'status':
              setStatusText(data.text);
              break;

            case 'chunk':
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const lastIdx = prev.length - 1;
                const last = prev[lastIdx];
                if (last && last.role === 'assistant') {
                  const updatedLast = {
                    ...last,
                    content: last.content + data.content
                  };
                  return [...prev.slice(0, lastIdx), updatedLast];
                }
                return prev;
              });
              break;

            case 'subagent_chunk':
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const lastIdx = prev.length - 1;
                const last = prev[lastIdx];
                if (last && last.role === 'assistant') {
                  const subAgentId = data.metadata?.subAgentId || 'unknown';
                  const runs = last.subagentRuns ? [...last.subagentRuns] : [];
                  let runIdx = runs.findIndex(r => r.subAgentId === subAgentId && r.status === 'running');
                  
                  if (runIdx === -1) {
                    runs.push({ subAgentId, content: data.content, status: 'running' });
                  } else {
                    runs[runIdx] = { ...runs[runIdx], content: runs[runIdx].content + data.content };
                  }

                  const updatedLast = { ...last, subagentRuns: runs };
                  return [...prev.slice(0, lastIdx), updatedLast];
                }
                return prev;
              });
              break;

            case 'reasoning_chunk':
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const lastIdx = prev.length - 1;
                const last = prev[lastIdx];
                if (last && last.role === 'assistant') {
                  const updatedLast = {
                    ...last,
                    reasoning: (last.reasoning || '') + data.content
                  };
                  return [...prev.slice(0, lastIdx), updatedLast];
                }
                return prev;
              });
              break;

            case 'task_list_update':
              setTasks(data.tasks);
              break;

            case 'subagent_reasoning':
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const lastIdx = prev.length - 1;
                const last = prev[lastIdx];
                if (last && last.role === 'assistant') {
                  const subAgentId = data.metadata?.subAgentId || 'unknown';
                  const runs = last.subagentRuns ? [...last.subagentRuns] : [];
                  let runIdx = runs.findIndex(r => r.subAgentId === subAgentId && r.status === 'running');
                  
                  if (runIdx === -1) {
                    runs.push({ subAgentId, content: '', reasoning: data.content, status: 'running' });
                  } else {
                    runs[runIdx] = { ...runs[runIdx], reasoning: (runs[runIdx].reasoning || '') + data.content };
                  }

                  const updatedLast = { ...last, subagentRuns: runs };
                  return [...prev.slice(0, lastIdx), updatedLast];
                }
                return prev;
              });
              break;

            case 'tool_start':
              setStatusText(`Running tool: ${data.tool}...`);
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const lastIdx = prev.length - 1;
                const last = prev[lastIdx];
                if (last && last.role === 'assistant') {
                  const calls = last.toolCalls ? [...last.toolCalls] : [];
                  const exists = calls.some((c) => c.id === data.toolCallId);
                  if (!exists) {
                    const updatedLast = {
                      ...last,
                      toolCalls: [
                        ...calls,
                        {
                          id: data.toolCallId,
                          name: data.tool,
                          args: data.args,
                          status: 'running' as const
                        }
                      ]
                    };
                    return [...prev.slice(0, lastIdx), updatedLast];
                  }
                }
                return prev;
              });
              break;

            case 'tool_end':
              setStatusText('');
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const lastIdx = prev.length - 1;
                const last = prev[lastIdx];
                if (last && last.role === 'assistant') {
                  const calls = last.toolCalls ? [...last.toolCalls] : [];
                  const targetIdx = calls.findIndex((c) => c.id === data.toolCallId);
                  if (targetIdx !== -1) {
                    const toolCall = calls[targetIdx];
                    const updatedCalls = [...calls];
                    const isSuccess = data.success !== undefined ? data.success : !data.output.startsWith('Error');
                    updatedCalls[targetIdx] = {
                      ...calls[targetIdx],
                      status: isSuccess ? 'completed' as const : 'rejected' as const,
                      output: data.output
                    };

                    let updatedSubagentRuns = last.subagentRuns ? [...last.subagentRuns] : [];
                    if (toolCall.name === 'invoke_subagent' || toolCall.name === 'invoke_agent') {
                      const agentId = (toolCall.args as any).agentId;
                      updatedSubagentRuns = updatedSubagentRuns.map(r => 
                        r.subAgentId === agentId && r.status === 'running' ? { ...r, status: 'completed' as const } : r
                      );
                    }

                    const updatedLast = {
                      ...last,
                      toolCalls: updatedCalls,
                      subagentRuns: updatedSubagentRuns
                    };
                    return [...prev.slice(0, lastIdx), updatedLast];
                  }
                }
                return prev;
              });
              setActiveCommandId(null);
              setTerminalLogs('');
              break;

            case 'command_output':
              setActiveCommandId(data.toolCallId);
              setTerminalLogs((prev) => prev + data.data);
              break;

            case 'write_preview':
              setStatusText('');
              setPendingPermission({
                type: 'write_file',
                path: data.path,
                original: data.original,
                proposed: data.proposed,
                toolCallId: data.toolCallId
              });
              break;

            case 'permission_request':
              setStatusText('');
              setPendingPermission({
                type: data.tool as 'run_command' | 'read_file',
                cmd: data.args.cmd,
                path: data.args.path,
                toolCallId: data.toolCallId
              });
              break;

            case 'memories':
              setMemories(data.memories);
              setMemoriesLoading(false);
              break;

            case 'done':
              setLoading(false);
              isSendingRef.current = false;
              setStatusText('');
              if (data.threadId) {
                setThreadIdRef.current(data.threadId);
              }
              if (data.assistantId) {
                setAssistantIdRef.current(data.assistantId);
              }
              if (data.contextUsage) {
                setLatestContextUsage(data.contextUsage);
              }
              setMessages((prev) => {
                if (prev.length === 0) return prev;
                const lastIdx = prev.length - 1;
                const last = prev[lastIdx];
                if (last && last.role === 'assistant') {
                  const updatedLast = {
                    ...last,
                    contextUsage: data.contextUsage,
                    usage: data.usage
                  };
                  return [...prev.slice(0, lastIdx), updatedLast];
                }
                return prev;
              });
              
              // Trigger final sync to update message list with backend IDs & metadata
              if (onRunCompleteRef.current) {
                const activeTid = data.threadId || threadIdRef.current;
                if (activeTid) {
                  onRunCompleteRef.current(activeTid);
                }
              }

              // Fetch memories after response
              if (data.assistantId && apiKeyRef.current) {
                safeSend(wsRef.current, {
                  type: 'get_memories',
                  apiKey: apiKeyRef.current,
                  assistantId: data.assistantId
                });
              }
              // Dequeue steer message if present
              if (queuedMessageRef.current) {
                const payload = queuedMessageRef.current;
                queuedMessageRef.current = null;
                setTimeout(() => {
                  sendMessage(payload.content, payload.files, payload.audioFile, payload.voiceMode);
                }, 50);
              }
              break;

            case 'error':
              setLoading(false);
              isSendingRef.current = false;
              setStatusText('');
              setMessages((prev) => [
                ...prev,
                { role: 'system', content: `⚠️ Error: ${data.message}` }
              ]);
              // Dequeue steer message if present
              if (queuedMessageRef.current) {
                const payload = queuedMessageRef.current;
                queuedMessageRef.current = null;
                setTimeout(() => {
                  sendMessage(payload.content, payload.files, payload.audioFile, payload.voiceMode);
                }, 50);
              }
              break;

            default:
              break;
          }
        } catch (err) {
          console.error('[WS] Error parsing message:', err);
        }
      };

      ws.onerror = (event) => {
        console.error('[WS] Error event:', event);
      };

      ws.onclose = (event) => {
        if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
        if (isUnmounted) return;
        console.log(`[WS] Closed: code=${event.code} reason="${event.reason}" clean=${event.wasClean}`);
        setWsStatus('disconnected');

        if (isSendingRef.current) {
          setLoading(false);
          isSendingRef.current = false;
          setStatusText('');
          setMessages((prev) => [
            ...prev,
            { role: 'system', content: '⚠️ Connection lost. The assistant was interrupted.' }
          ]);
        }

        const delay = Math.min(1000 * Math.pow(2, reconnectAttemptsRef.current), 15000);
        if (reconnectTimeoutRef.current) clearTimeout(reconnectTimeoutRef.current);
        reconnectTimeoutRef.current = setTimeout(() => {
          reconnectAttemptsRef.current += 1;
          console.log(`[WS] Reconnecting (attempt ${reconnectAttemptsRef.current})...`);
          connect();
        }, delay);
      };
    }

    connect();

    return () => {
      isUnmounted = true;
      if (pingInterval) { clearInterval(pingInterval); pingInterval = null; }
      if (wsRef.current) { wsRef.current.close(); }
      if (reconnectTimeoutRef.current) { clearTimeout(reconnectTimeoutRef.current); }
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Mount-only — all state accessed via refs

  // Automatically fetch memories when ids change and we're connected
  useEffect(() => {
    if (apiKey && assistantId && wsStatus === 'connected') {
      fetchMemories();
    }
  }, [apiKey, assistantId, wsStatus, fetchMemories]);

  // Reset loading and pending states when the threadId changes (e.g. user switched thread in sidebar)
  useEffect(() => {
    if (loading && wsStatus === 'connected') {
      safeSend(wsRef.current, { type: 'cancel_run' });
    }
    setLoading(false);
    isSendingRef.current = false;
    setPendingPermission(null);
    setStatusText('');
    queuedMessageRef.current = null;
    
    if (wsStatus === 'connected' && threadId) {
      safeSend(wsRef.current, { type: 'register_thread', threadId });
    }
  }, [threadId, wsStatus]);

  // Send message
  const sendMessage = useCallback((content: string, files?: string[], audioFile?: string, voiceMode?: 'direct' | 'rant') => {
    if (!content.trim() && !audioFile && (!files || files.length === 0)) return;

    if (loading || isSendingRef.current) {
      const activePermission = pendingPermissionRef.current;
      if (activePermission) {
        // Queue the message to be sent after the current run finishes
        queuedMessageRef.current = { content, files, audioFile, voiceMode };
        
        // Reject the pending action
        safeSend(wsRef.current, {
          type: 'permission_response',
          toolCallId: activePermission.toolCallId,
          allowed: false
        });

        // Update locally displayed call status
        setMessages((prev) => {
          if (prev.length === 0) return prev;
          const lastIdx = prev.length - 1;
          const last = prev[lastIdx];
          if (last && last.role === 'assistant') {
            const calls = last.toolCalls ? [...last.toolCalls] : [];
            const targetIdx = calls.findIndex((c) => c.id === activePermission.toolCallId);
            if (targetIdx !== -1) {
              const updatedCalls = [...calls];
              updatedCalls[targetIdx] = {
                ...calls[targetIdx],
                status: 'rejected' as const
              };
              const updatedLast = {
                ...last,
                toolCalls: updatedCalls
              };
              return [...prev.slice(0, lastIdx), updatedLast];
            }
          }
          return prev;
        });

        setPendingPermission(null);
        setStatusText('Cancelling action and sending message...');
      }
      return;
    }

    if (!apiKeyRef.current) {
      setMessages((prev) => [...prev, { role: 'system', content: '⚠️ Please configure your Backboard API Key in settings first.' }]);
      return;
    }

    setLoading(true);
    isSendingRef.current = true;

    const isDirectCmd = content.startsWith('!');
    
    if (isDirectCmd) {
      const cmd = content.substring(1).trim();
      if (!cmd) {
        setLoading(false);
        isSendingRef.current = false;
        setMessages((prev) => [...prev, { role: 'system', content: '⚠️ Please provide a command to execute after "!"' }]);
        return;
      }

      setMessages((prev) => [
        ...prev,
        { role: 'user', content, modelName: modelNameRef.current, provider: llmProviderRef.current, agentId: agentIdRef.current },
        { 
          role: 'assistant', 
          content: 'Executing command directly...', 
          toolCalls: [{ id: 'direct_cmd', name: 'run_command', args: { cmd }, status: 'running' }],
          modelName: modelNameRef.current,
          provider: llmProviderRef.current,
          agentId: agentIdRef.current
        }
      ]);

      const sent = safeSend(wsRef.current, {
        type: 'direct_command',
        apiKey: apiKeyRef.current,
        cmd
      });

      if (!sent) {
        pendingSendQueueRef.current.push({
          type: 'direct_command',
          apiKey: apiKeyRef.current,
          cmd
        });
        setStatusText('Waiting for connection to execute...');
      }
    } else {
      setMessages((prev) => [
        ...prev,
        {
          role: 'user',
          content: content || (audioFile ? '🎤 (Voice input)' : ''),
          modelName: modelNameRef.current,
          provider: llmProviderRef.current,
          agentId: agentIdRef.current,
          files
        },
        { role: 'assistant', content: '', reasoning: '', toolCalls: [], modelName: modelNameRef.current, provider: llmProviderRef.current, agentId: agentIdRef.current }
      ]);

      const sent = safeSend(wsRef.current, {
        type: 'chat',
        apiKey: apiKeyRef.current,
        content,
        threadId: threadIdRef.current,
        assistantId: assistantIdRef.current,
        modelName: modelNameRef.current,
        llmProvider: llmProviderRef.current,
        systemPrompt: systemPromptRef.current,
        safetyMode: safetyModeRef.current,
        memoryMode: memoryModeRef.current,
        webSearchEnabled: webSearchEnabledRef.current,
        codebaseIndexingEnabled: codebaseIndexingEnabledRef.current,
        files,
        audioFile,
        voiceMode,
        availableSubagents: availableSubagentsRef.current,
        agentRules: agentRulesRef.current
      });

      if (!sent) {
        pendingSendQueueRef.current.push({
          type: 'chat',
          apiKey: apiKeyRef.current,
          content,
          threadId: threadIdRef.current,
          assistantId: assistantIdRef.current,
          modelName: modelNameRef.current,
          llmProvider: llmProviderRef.current,
          systemPrompt: systemPromptRef.current,
          safetyMode: safetyModeRef.current,
          memoryMode: memoryModeRef.current,
          webSearchEnabled: webSearchEnabledRef.current,
          codebaseIndexingEnabled: codebaseIndexingEnabledRef.current,
          files,
          audioFile,
          voiceMode,
          availableSubagents: availableSubagentsRef.current,
          agentRules: agentRulesRef.current
        });
        setStatusText('Waiting for connection to send...');
      }
    }
  }, [loading]);

  const handleNewThread = useCallback(() => {
    safeSend(wsRef.current, { type: 'cancel_run' });
    setThreadIdRef.current('');
    localStorage.removeItem('spine_thread_id');
    setMessages([]);
    setTasks([]); // Clear tasks
    setPendingPermission(null);
    setTerminalLogs('');
    setActiveCommandId(null);
    setLatestContextUsage(null);
    setLoading(false);
    isSendingRef.current = false;
    setStatusText('');
    queuedMessageRef.current = null;
  }, []);

  const handleResetAll = useCallback(() => {
    safeSend(wsRef.current, { type: 'cancel_run' });
    setThreadIdRef.current('');
    setAssistantIdRef.current('');
    localStorage.removeItem('spine_thread_id');
    localStorage.removeItem('spine_assistant_id');
    setMessages([]);
    setTasks([]); // Clear tasks
    setMemories([]);
    setPendingPermission(null);
    setTerminalLogs('');
    setActiveCommandId(null);
    setLatestContextUsage(null);
    setLoading(false);
    isSendingRef.current = false;
    setStatusText('');
    queuedMessageRef.current = null;
  }, []);

  const startVoiceStream = useCallback((mode: 'direct' | 'rant') => {
    safeSend(wsRef.current, {
      type: 'voice_stream_start',
      apiKey: apiKeyRef.current,
      voiceMode: mode
    });
  }, []);

  const sendVoiceChunk = useCallback((base64Data: string) => {
    safeSend(wsRef.current, {
      type: 'voice_stream_chunk',
      data: base64Data
    });
  }, []);

  const stopVoiceStream = useCallback(() => {
    safeSend(wsRef.current, {
      type: 'voice_stream_stop'
    });
  }, []);

  return {
    wsStatus,
    messages,
    setMessages,
    statusText,
    loading,
    memories,
    memoriesLoading,
    pendingPermission,
    activeCommandId,
    terminalLogs,
    latestContextUsage,
    tasks,
    setTasks,
    sendMessage,
    handlePermissionResponse,
    handleAddMemory,
    handleDeleteMemory,
    fetchMemories,
    handleNewThread,
    handleResetAll,
    startVoiceStream,
    sendVoiceChunk,
    stopVoiceStream
  };
}
