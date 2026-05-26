import { serve } from '@hono/node-server';
import { serveStatic } from '@hono/node-server/serve-static';
import { Hono } from 'hono';
import { WebSocketServer } from 'ws';
import { join } from 'path';
import { existsSync } from 'fs';

import apiRoutes from './routes/api.js';
import { setupWebSocket } from './websocket.js';

const PORT = 3001;
const app = new Hono();

// Attach modular API routes
app.route('/api', apiRoutes);

// Serve uploaded files statically
app.use('/temp_uploads/*', serveStatic({ root: './' }));

// Serve frontend build static files if they exist
const distPath = join(process.cwd(), 'frontend', 'dist');
if (existsSync(distPath)) {
  console.log(`[Server] Serving static files from ${distPath}`);
  app.use('/*', serveStatic({ root: './frontend/dist' }));
} else {
  console.log(`[Server] Static path ${distPath} not found. Running in API-only mode.`);
  app.get('/', (c) => c.text('SPINE Backend API running. Start the frontend developer server on port 5173.'));
}

// Start Node server
const server = serve({
  fetch: app.fetch,
  port: PORT
}, (info) => {
  console.log(`[Server] SPINE Backend running on http://localhost:${info.port}`);
});

// Attach WebSocket server
const wss = new WebSocketServer({ server: server as any });
setupWebSocket(wss);

// Graceful shutdown
function gracefulShutdown(signal: string) {
  console.log(`\n[Server] ${signal} received. Shutting down gracefully...`);
  wss.clients.forEach((ws) => {
    try {
      ws.close(1001, 'Server shutting down');
    } catch { /* ignore */ }
  });
  (server as any).close(() => {
    console.log('[Server] HTTP server closed.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[Server] Forced exit after timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
});

process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Rejection:', reason);
});
