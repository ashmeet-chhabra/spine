import { existsSync } from 'fs';
import { AISession } from '../ai.js';
import { getSafePath, isReadOnlyCommand, readFile } from '../tools.js';
import { evaluateRules, Rule } from './rules.js';
import { pendingPermissions, safeSend, sendToThread } from './state.js';

export async function executeToolWithPermissions(
  tool: string,
  args: any,
  toolCallId: string,
  activeSession: AISession,
  agentRules: any,
  safetyMode: 'ask' | 'allow' | 'deny'
): Promise<{ allowed: boolean; output?: string }> {
  return new Promise((resolvePromise) => {
    const handleResolve = (res: { allowed: boolean; output?: string }) => {
      resolvePromise(res);
    };

    if (tool === 'read_file') {
      const mode = agentRules?.readMode || safetyMode;
      const { action } = evaluateRules(agentRules?.readFileRules, args.path, mode);
      
      if (action === 'allow') { handleResolve({ allowed: true }); return; }
      if (action === 'deny') { handleResolve({ allowed: false, output: 'Blocked by rules' }); return; }
      
      pendingPermissions.set(toolCallId, { 
        threadId: activeSession.threadId!, 
        tool, 
        args, 
        toolCallId, 
        resolve: (res) => handleResolve({ allowed: res.allowed, output: res.reason }) 
      });
      sendToThread(activeSession.threadId, { type: 'permission_request', tool, args, toolCallId });

    } else if (tool === 'write_file') {
      let safePath: string;
      try { 
        safePath = getSafePath(args.path); 
      } catch (err: any) { 
        handleResolve({ allowed: false, output: err.message }); 
        return; 
      }
      
      const fileExists = existsSync(safePath);
      const mode = fileExists ? (agentRules?.editMode || safetyMode) : (agentRules?.writeMode || safetyMode);
      const rules = fileExists ? agentRules?.editFileRules : agentRules?.writeFileRules;
      const { action } = evaluateRules(rules, args.path, mode);
      
      if (action === 'allow') { handleResolve({ allowed: true }); return; }
      if (action === 'deny') { handleResolve({ allowed: false, output: 'Blocked by rules' }); return; }
      
      pendingPermissions.set(toolCallId, { 
        threadId: activeSession.threadId!, 
        tool, 
        args, 
        toolCallId, 
        resolve: (res) => handleResolve({ allowed: res.allowed, output: res.reason }) 
      });

      (async () => {
        let original = '';
        try { original = await readFile(args.path); } catch {}
        const record = pendingPermissions.get(toolCallId);
        if (record) record.originalContent = original;
        sendToThread(activeSession.threadId, { 
          type: 'write_preview', 
          path: args.path, 
          original, 
          proposed: args.content, 
          toolCallId 
        });
      })();

    } else if (tool === 'run_command') {
      const mode = agentRules?.bashMode || safetyMode;
      const { action, matched } = evaluateRules(agentRules?.commandRules, args.cmd, mode);
      
      if (action === 'allow') { handleResolve({ allowed: true }); return; }
      if (action === 'deny') { handleResolve({ allowed: false, output: 'Blocked by rules' }); return; }
      if (!matched && isReadOnlyCommand(args.cmd)) { handleResolve({ allowed: true }); return; }
      
      pendingPermissions.set(toolCallId, { 
        threadId: activeSession.threadId!, 
        tool, 
        args, 
        toolCallId, 
        resolve: (res) => handleResolve({ allowed: res.allowed, output: res.reason }) 
      });
      sendToThread(activeSession.threadId, { type: 'permission_request', tool, args, toolCallId });

    } else if (tool === 'invoke_agent') {
      const mode = agentRules?.delegationMode || (activeSession.agentId === 'build' ? 'allow' : 'ask');
      const { action } = evaluateRules(agentRules?.delegationRules, args.agentId, mode);

      if (action === 'allow') { handleResolve({ allowed: true }); return; }
      if (action === 'deny') { handleResolve({ allowed: false, output: 'Blocked by rules' }); return; }

      pendingPermissions.set(toolCallId, { 
        threadId: activeSession.threadId!, 
        tool, 
        args, 
        toolCallId, 
        resolve: (res) => handleResolve({ allowed: res.allowed, output: res.reason }) 
      });
      sendToThread(activeSession.threadId, { type: 'permission_request', tool, args, toolCallId });

    } else {
      handleResolve({ allowed: false, output: `Unknown tool '${tool}'` });
    }
  });
}
