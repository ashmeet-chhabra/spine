import { WebSocket } from 'ws';
import { AISession } from '../ai.js';

export interface PendingPermissionRecord {
  threadId: string;
  tool: string;
  args: any;
  toolCallId: string;
  resolve: (res: { allowed: boolean; modifiedContent?: string; reason?: string }) => void;
  originalContent?: string;
}

export const pendingPermissions = new Map<string, PendingPermissionRecord>();
export const threadSockets = new Map<string, WebSocket>();
export const activeSessions = new Map<string, AISession>();
export const activeVoiceSessions = new Map<WebSocket, any>();

let globalActiveWs: WebSocket | null = null;

export function getActiveWs() {
  return globalActiveWs;
}

export function setActiveWs(ws: WebSocket | null) {
  globalActiveWs = ws;
}

export function safeSend(ws: WebSocket, data: any): void {
  try {
    if (ws.readyState === ws.OPEN) {
      ws.send(JSON.stringify(data));
    }
  } catch (err) {
    console.error('[WS] safeSend failed:', err);
  }
}

export function sendToThread(threadId: string | undefined, data: any): void {
  const ws = threadId ? threadSockets.get(threadId) : globalActiveWs;
  if (ws) {
    safeSend(ws, data);
  } else if (globalActiveWs) {
    safeSend(globalActiveWs, data);
  }
}
