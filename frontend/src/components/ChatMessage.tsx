import { Terminal, FileCode, CheckCircle, XCircle, Play, Search, ChevronDown, ChevronUp, Pencil, RotateCcw, Bot } from 'lucide-react';
import { type Message, type PendingPermission, type Model, type PersonaProfile, getAgentColor } from '../types/messages';
import { renderMarkdown } from '../utils/markdown';
import DiffViewer from './DiffViewer';
import { useState, useEffect, useRef } from 'react';
import ModelSelector from './ModelSelector';
import { AgentSelectorMenu } from './AgentSelector';
import SubagentContainer from './SubagentContainer';

function condenseModelName(name?: string): string {
  if (!name) return '';
  let condensed = name;
  condensed = condensed.replace(/-20\d{2}-?\d{2}-?\d{2}/, '');
  condensed = condensed.replace(/-20\d{2}/, '');
  condensed = condensed.replace(/-3-5-/, '-3.5-');
  condensed = condensed.replace(/-3-7-/, '-3.7-');
  condensed = condensed.replace(/-4-5-/, '-4.5-');
  return condensed;
}

function SearchCard({ tc }: { tc: any }) {
  const [expanded, setExpanded] = useState(false);
  const query = tc.args?.query || 'Web Search';
  const isRunning = tc.status === 'running' || tc.status === 'pending';
  const isRejected = tc.status === 'rejected';

  return (
    <div className={`search-card ${tc.status}`}>
      <button
        type="button"
        className="search-card-header"
        onClick={() => !isRunning && setExpanded(!expanded)}
        disabled={isRunning}
      >
        <div className="search-card-title">
          <Search size={14} className="search-icon" />
          <span>
            {isRunning
              ? `Searching the web: "${query}"...`
              : isRejected
              ? `Search blocked: "${query}"`
              : `Searched the web: "${query}"`}
          </span>
        </div>
        {!isRunning && !isRejected && (
          <div className="search-card-arrow">
            {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
          </div>
        )}
      </button>

      {expanded && tc.output && (
        <div className="search-card-body">
          <pre>{tc.output}</pre>
        </div>
      )}
    </div>
  );
}

interface ChatMessageProps {
  msg: Message;
  pendingPermission: PendingPermission | null;
  onPermissionResponse: (allowed: boolean, modifiedContent?: string) => void;
  activeCommandId: string | null;
  terminalLogs: string;
  index: number;
  onEditSubmit?: (index: number, newContent: string, selectedModelKey?: string, selectedAgentId?: string, files?: string[]) => void;
  onRetry?: (index: number) => void;
  disabled?: boolean;
  modelName?: string;
  models?: Model[];
  agentId?: string;
  agents?: PersonaProfile[];
  isUsingFallbackModels?: boolean;
  modelsFetchError?: string | null;
}

export default function ChatMessage({
  msg,
  pendingPermission,
  onPermissionResponse,
  activeCommandId,
  terminalLogs,
  index,
  onEditSubmit,
  onRetry,
  disabled,
  modelName,
  models,
  agentId,
  agents,
  isUsingFallbackModels = false,
  modelsFetchError = null
}: ChatMessageProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState(msg.content || '');
  
  // Resolve model key by checking models if provider is missing from message history
  const resolvedProvider = msg.provider || (modelName && models ? models.find(m => m.name === modelName)?.provider : undefined) || '';
  const resolvedModel = msg.modelName || modelName || '';
  const initialModelKey = resolvedProvider && resolvedModel ? `${resolvedProvider}/${resolvedModel}` : '';
  const resolvedAgent = agentId || msg.agentId || '';

  const [selectedModel, setSelectedModel] = useState(initialModelKey);
  const [selectedAgent, setSelectedAgent] = useState(resolvedAgent);
  const condensedName = condenseModelName(msg.modelName || modelName);

  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const [showModelMenu, setShowModelMenu] = useState(false);

  const agentBadgeRef = useRef<HTMLButtonElement | null>(null);
  const modelBadgeRef = useRef<HTMLButtonElement | null>(null);
  const agentMenuRef = useRef<HTMLDivElement | null>(null);
  const modelMenuRef = useRef<HTMLDivElement | null>(null);

  // Reset local selector states when edit mode is toggled or message data changes
  useEffect(() => {
    if (isEditing) {
      setEditedContent(msg.content || '');
      setSelectedModel(initialModelKey);
      setSelectedAgent(resolvedAgent);
      setShowAgentMenu(false);
      setShowModelMenu(false);
    }
  }, [isEditing, msg.content, initialModelKey, resolvedAgent]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      if (
        showAgentMenu &&
        agentMenuRef.current &&
        !agentMenuRef.current.contains(target) &&
        agentBadgeRef.current &&
        !agentBadgeRef.current.contains(target)
      ) {
        setShowAgentMenu(false);
      }
      if (
        showModelMenu &&
        modelMenuRef.current &&
        !modelMenuRef.current.contains(target) &&
        modelBadgeRef.current &&
        !modelBadgeRef.current.contains(target)
      ) {
        setShowModelMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showAgentMenu, showModelMenu]);
  return (
    <div className={`message-wrapper ${msg.role}`}>
      {/* Reasoning Delta block if reasoning is present */}
      {msg.role === 'assistant' && msg.reasoning && (
        <div className="message-reasoning">
          <div style={{
            fontSize: '11px',
            fontWeight: 600,
            color: 'var(--cyan)',
            borderBottom: '1px solid rgba(6,182,212,0.2)',
            paddingBottom: '4px',
            marginBottom: '6px'
          }}>
            Thinking Process
          </div>
          {msg.reasoning}
        </div>
      )}

      {/* Standard Message content */}
      {msg.role === 'user' && isEditing ? (
        <div className="message-edit-container">
          <textarea
            value={editedContent}
            onChange={(e) => setEditedContent(e.target.value)}
            className="message-edit-textarea"
            autoFocus
          />
          <div className="message-edit-actions">
            <div className="message-edit-selectors">
              {agents && agents.length > 0 && (
                <div style={{ position: 'relative', display: 'flex' }}>
                  <button
                    type="button"
                    className="input-agent-badge"
                    ref={agentBadgeRef}
                    onClick={() => {
                      setShowAgentMenu(!showAgentMenu);
                      setShowModelMenu(false);
                    }}
                    disabled={disabled}
                    title="Select Agent Profile"
                    style={{
                      alignSelf: 'center',
                      height: '28px',
                      '--agent-color': getAgentColor(agents?.find(a => a.id === selectedAgent), selectedAgent)
                    } as React.CSSProperties}
                  >
                    <span>@{selectedAgent}</span>
                  </button>
                  {showAgentMenu && agents && (
                    <div ref={agentMenuRef} style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '0', zIndex: 150 }}>
                      <AgentSelectorMenu
                        agents={agents}
                        selectedPersonaId={selectedAgent}
                        onSelectAgent={(id) => {
                          setSelectedAgent(id);
                          setShowAgentMenu(false);
                        }}
                        onClose={() => setShowAgentMenu(false)}
                      />
                    </div>
                  )}
                </div>
              )}
              {models && models.length > 0 && (
                <div style={{ position: 'relative', display: 'flex' }}>
                  <button
                    type="button"
                    className="input-model-badge"
                    ref={modelBadgeRef}
                    onClick={() => {
                      setShowModelMenu(!showModelMenu);
                      setShowAgentMenu(false);
                    }}
                    disabled={disabled}
                    title="Select LLM Model"
                    style={{ alignSelf: 'center', height: '28px' }}
                  >
                    <span>{selectedModel.split('/')[1] || selectedModel || 'Select Model...'}</span>
                  </button>
                  {showModelMenu && models && (
                    <div ref={modelMenuRef} style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: '0', zIndex: 150, width: '280px' }}>
                      <ModelSelector
                        modelName={selectedModel.split('/')[1] || ''}
                        llmProvider={selectedModel.split('/')[0] || ''}
                        models={models}
                        onModelChange={(name, provider) => {
                          setSelectedModel(`${provider}/${name}`);
                          setShowModelMenu(false);
                        }}
                        isUsingFallbackModels={isUsingFallbackModels}
                        modelsFetchError={modelsFetchError}
                        popupDirection="up"
                        onClose={() => setShowModelMenu(false)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="message-edit-buttons">
              <button
                type="button"
                className="btn btn-sm"
                onClick={() => setIsEditing(false)}
                disabled={disabled}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-sm btn-primary"
                onClick={() => {
                  if (editedContent.trim() || (msg.files && msg.files.length > 0)) {
                    onEditSubmit?.(index, editedContent, selectedModel, selectedAgent, msg.files);
                    setIsEditing(false);
                  }
                }}
                disabled={
                  disabled ||
                  (!editedContent.trim() && (!msg.files || msg.files.length === 0)) ||
                  (editedContent.trim() === (msg.content || '').trim() &&
                    selectedModel === initialModelKey &&
                    selectedAgent === resolvedAgent)
                }
              >
                Save & Submit
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="message-content-container" style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          {msg.files && msg.files.length > 0 && (
            <div className="message-attachments" style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '4px' }}>
              {msg.files.map((file, idx) => {
                const isImage = /\.(png|jpg|jpeg|gif|webp|bmp)$/i.test(file);
                const host = window.location.hostname || 'localhost';
                const fileUrl = `http://${host}:3001/${file.replace(/\\/g, '/')}`;
                if (isImage) {
                  return (
                    <a key={idx} href={fileUrl} target="_blank" rel="noopener noreferrer" style={{ display: 'block' }}>
                      <img
                        src={fileUrl}
                        alt="Visual upload context"
                        style={{
                          maxWidth: '280px',
                          maxHeight: '180px',
                          borderRadius: '6px',
                          border: '1px solid var(--border-color)',
                          objectFit: 'cover',
                          display: 'block'
                        }}
                      />
                    </a>
                  );
                }
                const filename = file.split('/').pop()?.split('\\').pop() || 'Attachment';
                return (
                  <div key={idx} className="file-attachment-badge" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    padding: '6px 12px',
                    borderRadius: '6px',
                    fontSize: '11px',
                    color: 'var(--text-primary)'
                  }}>
                    <span>📎 {filename}</span>
                  </div>
                );
              })}
            </div>
          )}
          {msg.content && (
            <div className="message-content">
              {renderMarkdown(msg.content)}
            </div>
          )}
        </div>
      )}

      {msg.role === 'user' && !isEditing && (
        <div className="message-toolbar">
          {modelName && (
            <span className="toolbar-model-name" title={`Model: ${modelName}`}>
              {condenseModelName(modelName)}
            </span>
          )}
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => {
              setEditedContent(msg.content || '');
              setIsEditing(true);
            }}
            disabled={disabled}
            title="Edit prompt"
          >
            <Pencil size={13} />
          </button>
          <button
            type="button"
            className="toolbar-btn"
            onClick={() => onRetry?.(index)}
            disabled={disabled}
            title="Retry prompt"
          >
            <RotateCcw size={13} />
          </button>
        </div>
      )}

      {/* Display tool calls / permissions / terminal output */}
      {msg.role === 'assistant' && msg.toolCalls && msg.toolCalls.map((tc) => {
        const isPending = pendingPermission && pendingPermission.toolCallId === tc.id;
        const isActiveCmd = activeCommandId === tc.id;

        if (isPending) {
          if (pendingPermission.type === 'write_file') {
            return (
              <DiffViewer
                key={tc.id}
                path={pendingPermission.path || ''}
                original={pendingPermission.original || ''}
                proposed={pendingPermission.proposed || ''}
                onApprove={(modifiedContent) => onPermissionResponse(true, modifiedContent)}
                onDeny={() => onPermissionResponse(false)}
              />
            );
          } else if (pendingPermission.type === 'run_command') {
            return (
              <div key={tc.id} className="permission-card">
                <div className="permission-card-header">
                  <Terminal size={16} />
                  <span>Permission Request: Run Command</span>
                </div>
                <div className="permission-cmd">
                  <code>{pendingPermission.cmd}</code>
                </div>
                <div className="permission-actions">
                  <button className="btn btn-sm btn-danger" onClick={() => onPermissionResponse(false)}>
                    Deny
                  </button>
                  <button className="btn btn-sm btn-approve" onClick={() => onPermissionResponse(true)}>
                    Allow Command
                  </button>
                </div>
              </div>
            );
          } else if (pendingPermission.type === 'read_file') {
            return (
              <div key={tc.id} className="permission-card">
                <div className="permission-card-header">
                  <FileCode size={16} />
                  <span>Permission Request: Read File</span>
                </div>
                <div className="permission-cmd">
                  <code>Read: {pendingPermission.path}</code>
                </div>
                <div className="permission-actions">
                  <button className="btn btn-sm btn-danger" onClick={() => onPermissionResponse(false)}>
                    Deny
                  </button>
                  <button className="btn btn-sm btn-approve" onClick={() => onPermissionResponse(true)}>
                    Allow Read
                  </button>
                </div>
              </div>
            );
          } else if (pendingPermission.type === 'invoke_subagent' as any) {
            const agentId = (pendingPermission as any).agentId;
            const prompt = (pendingPermission as any).prompt;
            const agentColor = getAgentColor(null, agentId);

            return (
              <div key={tc.id} className="permission-card" style={{ borderColor: agentColor }}>
                <div className="permission-card-header" style={{ background: `${agentColor}15`, color: agentColor }}>
                  <Bot size={16} />
                  <span>Delegation Request: Deploy @{agentId}</span>
                </div>
                <div className="permission-cmd">
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>Task Assignment:</div>
                  <div style={{ fontSize: '13px', lineHeight: '1.5' }}>{prompt}</div>
                </div>
                <div className="permission-actions">
                  <button className="btn btn-sm btn-danger" onClick={() => onPermissionResponse(false)}>
                    Deny
                  </button>
                  <button 
                    className="btn btn-sm" 
                    style={{ background: agentColor, color: '#000', fontWeight: 600 }}
                    onClick={() => onPermissionResponse(true)}
                  >
                    Approve @{agentId}
                  </button>
                </div>
              </div>
            );
          }
        }
        if (tc.name === 'search_web') {
          return <SearchCard key={tc.id} tc={tc} />;
        }
        if (tc.name === 'run_command') {
          let terminalOutput = '';
          if (isActiveCmd) {
            terminalOutput = terminalLogs || 'Initiating shell...';
          } else if (tc.output) {
            try {
              const parsed = JSON.parse(tc.output);
              if (parsed && (parsed.stdout !== undefined || parsed.stderr !== undefined)) {
                terminalOutput = [parsed.stdout, parsed.stderr].filter(Boolean).join('\n') || `Exit code: ${parsed.code}`;
              } else {
                terminalOutput = tc.output;
              }
            } catch {
              terminalOutput = tc.output;
            }
          } else {
            terminalOutput = tc.status === 'rejected' ? 'Command execution rejected by user.' : 'Command queued...';
          }

          return (
            <div key={tc.id} className="terminal-block">
              <div className="terminal-header">
                <span className="tool-name">
                  <Terminal size={14} />
                  Command: {String(tc.args.cmd)}
                </span>
                <span className={`tool-status-badge ${isActiveCmd ? 'running' : tc.status}`}>
                  {isActiveCmd ? 'running' : tc.status}
                </span>
              </div>
              <div className="terminal-body">
                {terminalOutput}
              </div>
            </div>
          );
        }

        // Standard completed or rejected tool blocks
        const isWrite = tc.name === 'write_file';
        const statusIcon = tc.status === 'completed' ? (
          <CheckCircle size={14} className="text-emerald" style={{ color: 'var(--emerald)' }} />
        ) : tc.status === 'rejected' ? (
          <XCircle size={14} className="text-rose" style={{ color: 'var(--rose)' }} />
        ) : (
          <Play size={14} className="text-purple" style={{ color: 'var(--accent)' }} />
        );

        return (
          <div key={tc.id} className="tool-call-block">
            <div className="tool-call-header">
              <span className="tool-name">
                {isWrite ? <FileCode size={14} /> : statusIcon}
                {tc.name}
              </span>
              <span className={`tool-status-badge ${tc.status}`}>
                {tc.status}
              </span>
            </div>
            <div className="tool-args">
              {isWrite ? (
                <span><strong>Path:</strong> {String(tc.args.path)}</span>
              ) : (
                <span><strong>Args:</strong> {JSON.stringify(tc.args)}</span>
              )}
            </div>
            {tc.output && (
              <div className="tool-output">
                {tc.output}
              </div>
            )}
          </div>
        );
      })}

      {/* Subagent Runs block */}
      {msg.role === 'assistant' && msg.subagentRuns && msg.subagentRuns.length > 0 && (
        <div className="subagent-runs-wrapper" style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {msg.subagentRuns.map((run, i) => (
            <SubagentContainer key={i} run={run} />
          ))}
        </div>
      )}

      {/* Message Metadata (Role and Token Usage Stats) */}
      <div className="message-meta">
        <span className="ai-metadata">
          {condensedName && (
            <span className="model-info">{condensedName}</span>
          )}
          {msg.role === 'assistant' && msg.usage && (msg.usage.inputTokens !== undefined || msg.usage.outputTokens !== undefined) && (
            <span className="token-info">
              {msg.usage.inputTokens ?? 0} in, {msg.usage.outputTokens ?? 0} out
            </span>
          )}
        </span>
      </div>
    </div>
  );
}
