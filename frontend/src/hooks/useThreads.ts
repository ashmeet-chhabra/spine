import { useState, useEffect, useCallback } from 'react';
import type { Message, ToolCall } from '../types/messages';

export interface ThreadInfo {
  threadId: string;
  createdAt: string;
  title: string;
}

export function useThreads(apiKey: string) {
  const [threads, setThreads] = useState<ThreadInfo[]>([]);
  const [threadsLoading, setThreadsLoading] = useState(false);

  const fetchThreads = useCallback(async () => {
    if (!apiKey) {
      setThreads([]);
      return;
    }

    setThreadsLoading(true);
    try {
      const host = window.location.hostname || 'localhost';
      const res = await fetch(`http://${host}:3001/api/threads?t=${Date.now()}`, {
        headers: { 'X-API-Key': apiKey }
      });
      if (!res.ok) throw new Error('Failed to fetch threads');
      const data = await res.json();
      
      if (data.threads && Array.isArray(data.threads)) {
        const formatted: ThreadInfo[] = data.threads.map((t: any) => {
          // Generate a title based on the first message, or default to "New Conversation"
          let title = 'New Conversation';
          if (t.messages && t.messages.length > 0) {
            const firstUserMsg = t.messages.find((m: any) => m.role === 'user');
            if (firstUserMsg && firstUserMsg.content) {
              title = firstUserMsg.content.substring(0, 30) + (firstUserMsg.content.length > 30 ? '...' : '');
            } else if (t.messages[0].content) {
              title = t.messages[0].content.substring(0, 30) + (t.messages[0].content.length > 30 ? '...' : '');
            }
          }
          return {
            threadId: t.threadId,
            createdAt: t.createdAt,
            title
          };
        });
        setThreads(formatted);
      }
    } catch (err) {
      console.error('[Threads] fetchThreads error:', err);
    } finally {
      setThreadsLoading(false);
    }
  }, [apiKey]);

  const deleteThread = useCallback(async (threadId: string) => {
    if (!apiKey) return;
    try {
      const host = window.location.hostname || 'localhost';
      const res = await fetch(`http://${host}:3001/api/threads/${threadId}`, {
        method: 'DELETE',
        headers: { 'X-API-Key': apiKey }
      });
      if (!res.ok) throw new Error('Failed to delete thread');
      
      // Update local state
      setThreads((prev) => prev.filter((t) => t.threadId !== threadId));
    } catch (err) {
      console.error('[Threads] deleteThread error:', err);
    }
  }, [apiKey]);

  const loadThreadMessages = useCallback(async (threadId: string): Promise<Message[]> => {
    if (!apiKey) return [];
    try {
      const host = window.location.hostname || 'localhost';
      const res = await fetch(`http://${host}:3001/api/threads/${threadId}`, {
        headers: { 'X-API-Key': apiKey }
      });
      if (!res.ok) throw new Error('Failed to load thread messages');
      const data = await res.json();
      
      if (data.thread && data.thread.messages) {
        let hiddenIds: string[] = [];
        try {
          const hiddenStr = localStorage.getItem('spine_hidden_message_ids') || '[]';
          hiddenIds = JSON.parse(hiddenStr) as string[];
        } catch (e) {
          console.error('Error reading spine_hidden_message_ids:', e);
        }

        const filteredMessages = data.thread.messages.filter((m: any) => {
          const id = m.messageId || m.id;
          return !hiddenIds.includes(id);
        });

        return filteredMessages.map((m: any) => {
          let toolCalls: ToolCall[] | undefined = undefined;
          
          if (m.metadata?.tool_calls && Array.isArray(m.metadata.tool_calls)) {
            toolCalls = m.metadata.tool_calls.map((tc: any) => {
              let parsedArgs = {};
              try {
                parsedArgs = typeof tc.function.arguments === 'string'
                  ? JSON.parse(tc.function.arguments)
                  : tc.function.arguments || {};
              } catch {
                parsedArgs = {};
              }
              return {
                id: tc.id,
                name: tc.function.name,
                args: parsedArgs,
                status: 'completed', // Past tool calls are completed/settled
                output: tc.output // If output exists
              };
            });
          }
          
          return {
            messageId: m.messageId || m.id,
            role: m.role === 'user' ? 'user' : m.role === 'assistant' ? 'assistant' : 'system',
            content: m.content,
            toolCalls,
            modelName: m.metadata?.run_llm_model_name || m.metadata?.modelName || m.metadata?.model_name,
            provider: m.metadata?.run_llm_provider || m.metadata?.provider || m.metadata?.llm_provider,
            agentId: m.metadata?.agentId || m.metadata?.agent_id,
            usage: m.metadata?.usage ? {
              inputTokens: m.metadata.usage.inputTokens || m.metadata.usage.input_tokens,
              outputTokens: m.metadata.usage.outputTokens || m.metadata.usage.output_tokens
            } : undefined
          };
        });
      }
      return [];
    } catch (err) {
      console.error('[Threads] loadThreadMessages error:', err);
      return [];
    }
  }, [apiKey]);

  useEffect(() => {
    fetchThreads();
  }, [fetchThreads]);

  return {
    threads,
    threadsLoading,
    fetchThreads,
    deleteThread,
    loadThreadMessages
  };
}
