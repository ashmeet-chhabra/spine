import { WebSocket, WebSocketServer } from 'ws';
import { BackboardClient } from 'backboard-sdk';
import { AISession } from './ai.js';
import { 
  activeSessions, 
  activeVoiceSessions, 
  pendingPermissions, 
  threadSockets, 
  setActiveWs, 
  safeSend, 
  sendToThread 
} from './logic/state.js';
import { executeToolWithPermissions } from './logic/toolExecutor.js';

export function setupWebSocket(wss: WebSocketServer) {
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    setActiveWs(ws);

    const pingInterval = setInterval(() => {
      safeSend(ws, { type: 'ping' });
    }, 30000);

    ws.on('message', async (message: string) => {
      try {
        const data = JSON.parse(message);

        if (data.type === 'ping') {
          safeSend(ws, { type: 'pong' });
          return;
        }

        console.log('[WS] Received:', data.type);

        if (data.type === 'voice_stream_start') {
          const { apiKey, voiceMode } = data;
          try {
            const client = new BackboardClient({ apiKey });
            const voiceSession = await client.voiceRealtime({
              onTranscription: (transcript: string, isFinal: boolean) => {
                safeSend(ws, {
                  type: 'voice_transcription',
                  text: transcript,
                  isFinal,
                  voiceMode
                });
              }
            });
            activeVoiceSessions.set(ws, voiceSession);
            console.log('[WS] Realtime voice session started');
          } catch (err: any) {
            console.error('[WS] Failed to start voice realtime:', err);
            safeSend(ws, { type: 'error', message: 'Failed to start realtime voice: ' + err.message });
          }
          return;
        }

        if (data.type === 'voice_stream_chunk') {
          const voiceSession = activeVoiceSessions.get(ws);
          if (voiceSession) {
            try {
              const audioBuffer = Buffer.from(data.data, 'base64');
              voiceSession.sendAudio(audioBuffer);
            } catch (err) {
              console.error('[WS] Error sending audio chunk:', err);
            }
          }
          return;
        }

        if (data.type === 'voice_stream_stop') {
          const voiceSession = activeVoiceSessions.get(ws);
          if (voiceSession) {
            voiceSession.stop();
            activeVoiceSessions.delete(ws);
            console.log('[WS] Realtime voice session stopped');
          }
          return;
        }

        if (data.type === 'register_thread') {
          const { threadId } = data;
          if (threadId) {
            threadSockets.set(threadId, ws);
            console.log(`[WS] Registered socket to thread ${threadId}`);

            for (const [toolCallId, record] of pendingPermissions.entries()) {
              if (record.threadId === threadId) {
                if (record.tool === 'write_file') {
                  safeSend(ws, {
                    type: 'write_preview',
                    path: record.args.path,
                    original: record.originalContent ?? '',
                    proposed: record.args.content,
                    toolCallId
                  });
                } else if (record.tool === 'run_command' || record.tool === 'read_file') {
                  safeSend(ws, {
                    type: 'permission_request',
                    tool: record.tool,
                    args: record.args,
                    toolCallId
                  });
                }
              }
            }
          }
          return;
        }

        if (data.type === 'get_memories') {
          const { apiKey, assistantId } = data;
          if (!apiKey || !assistantId) {
            safeSend(ws, { type: 'memories', memories: [] });
            return;
          }
          try {
            const client = new BackboardClient({ apiKey });
            const result = await client.getMemories(assistantId, { pageSize: 100 });
            // Normalize: SDK may return { memories: [...] } or { data: [...] } or an array
            const raw = result?.memories ?? result?.data ?? (Array.isArray(result) ? result : []);
            const memories = raw.map((m: any) => ({
              id: m.id || m.memory_id,
              content: m.memory || m.content,
              metadata: m.metadata,
              createdAt: m.created_at || m.createdAt,
              updatedAt: m.updated_at || m.updatedAt,
              score: m.score
            }));
            safeSend(ws, { type: 'memories', memories });
          } catch (err: any) {
            console.error('[WS] get_memories error:', err.message || err);
            safeSend(ws, { type: 'memories', memories: [] });
          }
          return;
        }

        if (data.type === 'add_memory') {
          const { apiKey, assistantId, content } = data;
          if (!apiKey || !assistantId || !content) return;
          try {
            const client = new BackboardClient({ apiKey });
            await client.addMemory(assistantId, { content });
            // Re-fetch and broadcast updated list
            const result = await client.getMemories(assistantId, { pageSize: 100 });
            const raw = result?.memories ?? result?.data ?? (Array.isArray(result) ? result : []);
            const memories = raw.map((m: any) => ({
              id: m.id || m.memory_id,
              content: m.memory || m.content,
              metadata: m.metadata,
              createdAt: m.created_at || m.createdAt,
              updatedAt: m.updated_at || m.updatedAt,
              score: m.score
            }));
            safeSend(ws, { type: 'memories', memories });
          } catch (err: any) {
            console.error('[WS] add_memory error:', err.message || err);
            safeSend(ws, { type: 'error', message: `Failed to add memory: ${err.message}` });
          }
          return;
        }

        if (data.type === 'delete_memory') {
          const { apiKey, assistantId, memoryId } = data;
          if (!apiKey || !assistantId || !memoryId) return;
          try {
            const client = new BackboardClient({ apiKey });
            await client.deleteMemory(assistantId, memoryId);
            // Re-fetch and broadcast updated list
            const result = await client.getMemories(assistantId, { pageSize: 100 });
            const raw = result?.memories ?? result?.data ?? (Array.isArray(result) ? result : []);
            const memories = raw.map((m: any) => ({
              id: m.id || m.memory_id,
              content: m.memory || m.content,
              metadata: m.metadata,
              createdAt: m.created_at || m.createdAt,
              updatedAt: m.updated_at || m.updatedAt,
              score: m.score
            }));
            safeSend(ws, { type: 'memories', memories });
          } catch (err: any) {
            console.error('[WS] delete_memory error:', err.message || err);
            safeSend(ws, { type: 'error', message: `Failed to delete memory: ${err.message}` });
          }
          return;
        }

        if (data.type === 'cancel_run') {
          for (const [tid, socket] of threadSockets.entries()) {
            if (socket === ws) {
              const session = activeSessions.get(tid);
              if (session) {
                session.abort();
                activeSessions.delete(tid);
                for (const [toolCallId, record] of pendingPermissions.entries()) {
                  if (record.threadId === tid) {
                    record.resolve({ allowed: false, reason: 'Run cancelled by user.' });
                    pendingPermissions.delete(toolCallId);
                  }
                }
              }
            }
          }
          return;
        }

        if (data.type === 'permission_response') {
          const record = pendingPermissions.get(data.toolCallId);
          if (record) {
            record.resolve({
              allowed: data.allowed,
              modifiedContent: data.modifiedContent
            });
            pendingPermissions.delete(data.toolCallId);
          }
          return;
        }

        if (data.type === 'chat') {
          const { apiKey, content, threadId, assistantId, modelName, llmProvider, systemPrompt, safetyMode = 'ask', memoryMode = 'Auto', webSearchEnabled, codebaseIndexingEnabled, files, audioFile, voiceMode, agentRules, agentId, availableSubagents } = data;

          if (!apiKey) {
            safeSend(ws, { type: 'error', message: 'API key is required.' });
            return;
          }

          if (threadId) {
            const existing = activeSessions.get(threadId);
            if (existing) {
              existing.abort();
              activeSessions.delete(threadId);
            }
            threadSockets.set(threadId, ws);
          }

          const activeSession = new AISession({
            apiKey, threadId, assistantId, modelName, llmProvider, systemPrompt,
            webSearchEnabled, codebaseIndexingEnabled, agentId, agentRules, availableSubagents
          });

          if (threadId) activeSessions.set(threadId, activeSession);

          const registerSessionIfResolved = () => {
            if (activeSession.threadId) {
              if (!activeSessions.has(activeSession.threadId)) {
                activeSessions.set(activeSession.threadId, activeSession);
              }
              threadSockets.set(activeSession.threadId, ws);
            }
          };

          try {
            if (activeSession.threadId) {
              sendToThread(activeSession.threadId, { type: 'status', text: 'SPINE is thinking...' });
            } else {
              safeSend(ws, { type: 'status', text: 'SPINE is thinking...' });
            }

            const result = await activeSession.sendMessage(
              content,
              (chunkType, text, metadata) => {
                registerSessionIfResolved();
                let type: string = 'chunk';
                if (chunkType === 'reasoning') type = 'reasoning_chunk';
                else if (chunkType === 'subagent_chunk') type = 'subagent_chunk';
                else if (chunkType === 'subagent_reasoning') type = 'subagent_reasoning';
                sendToThread(activeSession.threadId, { type, content: text, metadata });
              },
              async (toolName, args, toolCallId) => {
                registerSessionIfResolved();
                sendToThread(activeSession.threadId, { type: 'tool_start', tool: toolName, args, toolCallId });
              },
              (toolCallId, output, success) => {
                registerSessionIfResolved();
                sendToThread(activeSession.threadId, { type: 'tool_end', toolCallId, output, success });
              },
            (tool, args, toolCallId) => {
              registerSessionIfResolved();
              return executeToolWithPermissions(
                tool,
                args,
                toolCallId,
                activeSession,
                agentRules,
                safetyMode
              );
            },
              (outputData, stream, toolCallId) => {
                registerSessionIfResolved();
                sendToThread(activeSession.threadId, { type: 'command_output', data: outputData, stream, toolCallId });
              },
              // onTaskListUpdate
              (tasks) => {
                registerSessionIfResolved();
                sendToThread(activeSession.threadId, { type: 'task_list_update', tasks });
              },
              memoryMode, files, audioFile, voiceMode, availableSubagents

            );

            sendToThread(activeSession.threadId, {
              type: 'done',
              threadId: result.threadId,
              assistantId: result.assistantId,
              contextUsage: result.contextUsage,
              usage: result.usage
            });

          } catch (err: any) {
            console.error(err);
            sendToThread(activeSession.threadId, { type: 'error', message: err.message || 'Stream processing error' });
          } finally {
            if (activeSession.threadId && activeSessions.get(activeSession.threadId) === activeSession) {
              activeSessions.delete(activeSession.threadId);
            }
          }
        }
      } catch (err: any) {
        console.error(err);
        safeSend(ws, { type: 'error', message: 'Invalid WebSocket message format' });
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clearInterval(pingInterval);
      const voiceSession = activeVoiceSessions.get(ws);
      if (voiceSession) {
        voiceSession.stop();
        activeVoiceSessions.delete(ws);
      }
    });
  });
}
