import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { existsSync, writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import { BackboardClient, ChatMessagesResponse } from 'backboard-sdk';
import { getFileTree, readFile, writeFile } from '../tools.js';
import { activeSessions, pendingPermissions } from '../logic/state.js';

const api = new Hono();

// Enable CORS for frontend dev server
api.use('/*', cors({
  origin: '*',
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'X-API-Key']
}));

// API Endpoint: File/Audio Upload
api.post('/upload', async (c) => {
  try {
    const body = await c.req.parseBody();
    const file = body['file'];
    if (!file || !(file instanceof File)) {
      return c.json({ error: 'No file provided' }, 400);
    }
    
    mkdirSync('temp_uploads', { recursive: true });
    const fileName = `${Date.now()}-${file.name}`;
    const filePath = join('temp_uploads', fileName);
    
    const buffer = await file.arrayBuffer();
    writeFileSync(filePath, Buffer.from(buffer));
    
    console.log(`[Server] File uploaded successfully to ${filePath}`);
    return c.json({ success: true, filePath, fileName });
  } catch (err: any) {
    console.error('[Server] Upload error:', err);
    return c.json({ error: err.message || 'Upload failed' }, 500);
  }
});

interface ModelCacheEntry {
  models: any[];
  timestamp: number;
}
const modelsCache = new Map<string, ModelCacheEntry>();
const CACHE_TTL = 30 * 60 * 1000;

api.get('/models', async (c) => {
  const apiKey = c.req.query('apiKey') || c.req.header('X-API-Key');
  const includeAll = c.req.query('includeAll') === 'true';

  if (!apiKey) return c.json({ error: 'API key is required' }, 400);

  const cacheKey = `${apiKey}-${includeAll}`;
  const cached = modelsCache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return c.json({ models: cached.models });
  }

  try {
    const client = new BackboardClient({ apiKey });
    const allModels: any[] = [];

    if (includeAll) {
      let skip = 0;
      const limit = 200;
      while (true) {
        const page = await client.listModels({ supportsTools: true, limit, skip });
        allModels.push(...page.models);
        if (allModels.length >= page.total || page.models.length < limit) break;
        skip += limit;
      }
    } else {
      const providers = ['anthropic', 'openai', 'google', 'openrouter', 'cohere', 'xai', 'aws-bedrock', 'cerebras'];
      await Promise.all(providers.map(async (provider) => {
        try {
          let skip = 0;
          const limit = 200;
          while (true) {
            const page = await client.listModels({ supportsTools: true, limit, skip, provider });
            allModels.push(...page.models);
            if (allModels.length >= page.total || page.models.length < limit) break;
            skip += limit;
          }
        } catch (err: any) {
          console.error(`[API] Failed to fetch models for provider ${provider}:`, err.message);
        }
      }));
    }

    const seen = new Set<string>();
    const uniqueModels = allModels.filter((m) => {
      const key = `${m.provider}-${m.name}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    modelsCache.set(cacheKey, { models: uniqueModels, timestamp: Date.now() });
    return c.json({ models: uniqueModels });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch models' }, 500);
  }
});

api.get('/providers', async (c) => {
  const apiKey = c.req.query('apiKey') || c.req.header('X-API-Key');
  if (!apiKey) return c.json({ error: 'API key is required' }, 400);
  try {
    const client = new BackboardClient({ apiKey });
    const providersRes = await client.listProviders();
    return c.json({ providers: providersRes.providers });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch providers' }, 500);
  }
});

api.get('/threads', async (c) => {
  const apiKey = c.req.query('apiKey') || c.req.header('X-API-Key');
  const assistantId = c.req.query('assistantId');
  if (!apiKey) return c.json({ error: 'API key is required' }, 400);
  try {
    const client = new BackboardClient({ apiKey });
    let threads = assistantId ? await client.listThreadsForAssistant(assistantId) : await client.listThreads();
    threads.sort((a: any, b: any) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    return c.json({ threads });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch threads' }, 500);
  }
});

api.get('/threads/:threadId', async (c) => {
  const apiKey = c.req.query('apiKey') || c.req.header('X-API-Key');
  const threadId = c.req.param('threadId');
  if (!apiKey) return c.json({ error: 'API key is required' }, 400);
  try {
    const client = new BackboardClient({ apiKey });
    const thread = await client.getThread(threadId);
    return c.json({ thread });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch thread' }, 500);
  }
});

api.delete('/threads/:threadId', async (c) => {
  const apiKey = c.req.query('apiKey') || c.req.header('X-API-Key');
  const threadId = c.req.param('threadId');
  if (!apiKey) return c.json({ error: 'API key is required' }, 400);
  try {
    const session = activeSessions.get(threadId);
    if (session) {
      session.abort();
      activeSessions.delete(threadId);
    }
    for (const [toolCallId, record] of pendingPermissions.entries()) {
      if (record.threadId === threadId) {
        record.resolve({ allowed: false, reason: 'Thread deleted.' });
        pendingPermissions.delete(toolCallId);
      }
    }
    const client = new BackboardClient({ apiKey });
    await client.deleteThread(threadId);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to delete thread' }, 500);
  }
});

api.post('/generate-agent', async (c) => {
  try {
    const { description, apiKey } = await c.req.json();
    if (!apiKey) return c.json({ error: 'API key is required' }, 400);
    if (!description || !description.trim()) {
      return c.json({ error: 'Agent description is required' }, 400);
    }

    const client = new BackboardClient({ apiKey });
    const systemPrompt = `You are SPINE Agent Architect. Your job is to design a custom AI coding agent based on a user's description.

Given the user's description of an agent, generate a JSON configuration for it. Return ONLY valid JSON with no markdown formatting or code fences.

The JSON must have these fields:
- "name": A short, descriptive name for the agent (e.g. "CSS Audit Agent")
- "handle": A single-word lowercase alphanumeric handle with hyphens (e.g. "css-auditor")
- "description": A one-sentence summary of what the agent does
- "systemPrompt": A 2-4 sentence system prompt instructing the agent on its role, tools, and boundaries
- "readMode": "allow" | "ask" | "deny"
- "writeMode": "allow" | "ask" | "deny"
- "editMode": "allow" | "ask" | "deny"
- "bashMode": "allow" | "ask" | "deny"
- "delegationMode": "allow" | "ask" | "deny"
- "webSearchEnabled": true | false
- "codebaseIndexingEnabled": true | false

Rules of thumb:
- Read-only agents (reviewers, auditors) should have writeMode/editMode/bashMode: "deny"
- Agents that modify code should have writeMode/editMode: "ask" at minimum
- Agents that run tests need bashMode: "allow"
- Delegation should usually be "deny" for narrow-scope agents, "ask" otherwise
- Codebase indexing is useful for agents that need to understand project structure`;

    const res = await client.sendMessage({
      content: description,
      systemPrompt,
      stream: false
    });

    const chatRes = res as ChatMessagesResponse;
    const rawContent = chatRes.content || '';

    // Extract JSON from the response (handle possible markdown wrapping)
    let jsonStr = rawContent.trim();
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      jsonStr = jsonMatch[0];
    }

    const config = JSON.parse(jsonStr);

    // Validate required fields
    const required = ['name', 'handle', 'systemPrompt', 'readMode', 'writeMode', 'editMode', 'bashMode', 'delegationMode'];
    for (const field of required) {
      if (!config[field]) {
        return c.json({ error: `Generated agent missing field: ${field}` }, 500);
      }
    }

    return c.json({ agent: config });
  } catch (err: any) {
    console.error('[API] generate-agent error:', err);
    return c.json({ error: err.message || 'Failed to generate agent' }, 500);
  }
});

api.get('/files', async (c) => {
  try {
    const files = await getFileTree();
    return c.json({ files });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to fetch file tree' }, 500);
  }
});

api.get('/file/read', async (c) => {
  const path = c.req.query('path');
  if (!path) return c.json({ error: 'Path is required' }, 400);
  try {
    const content = await readFile(path);
    return c.json({ content });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to read file' }, 500);
  }
});

api.post('/file/write', async (c) => {
  try {
    const { path, content } = await c.req.json();
    if (!path) return c.json({ error: 'Path is required' }, 400);
    await writeFile(path, content);
    return c.json({ success: true });
  } catch (err: any) {
    return c.json({ error: err.message || 'Failed to write file' }, 500);
  }
});

export default api;
