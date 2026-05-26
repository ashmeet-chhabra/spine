import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Settings, Plus, ArrowUp, Loader2, Trash2, Shield, Paperclip, X, MessageSquare, FileCode, Folder, ChevronRight, ChevronDown, FileText, RefreshCw, ListTodo, ChevronLeft } from 'lucide-react';
import ChatMessage from './components/ChatMessage';
import FileEditor from './components/FileEditor';
import WelcomeScreen from './components/WelcomeScreen';
import SettingsPanel from './components/SettingsPanel';
import ConfirmModal from './components/ConfirmModal';
import AgentsPanel from './components/AgentsPanel';
import TaskTracker from './components/TaskTracker';
import VoiceRecorder from './components/VoiceRecorder';
import OnboardingPage from './components/OnboardingPage';
import ModelSelector from './components/ModelSelector';
import { AgentSelectorMenu } from './components/AgentSelector';
import { useWebSocket } from './hooks/useWebSocket';
import { useThreads } from './hooks/useThreads';
import { useModels } from './hooks/useModels';
import { useLocalStorage } from './hooks/useLocalStorage';
import { PRESET_PERSONAS, getAgentColor } from './types/messages';
import type { PersonaProfile } from './types/messages';
import './App.css';

export interface Tab { id: string; type: 'thread' | 'file'; title: string; }

function modelDisplayName(name: string): string {
  if (name === 'backboard-router') return 'Backboard Router';
  if (name.startsWith('backboard-router:')) {
    const rule = name.slice('backboard-router:'.length);
    return `Router: ${rule.charAt(0).toUpperCase() + rule.slice(1)}`;
  }
  return name;
}

function FileTree({ nodes, expandedFolders, toggleFolder, openFile, activeTabId }: any) {
  return (
    <div className="file-tree">
      {nodes.map((n: any) => (
        <div key={n.path}>
          {n.type === 'directory' ? (
            <>
              <div className="file-tree-item folder" onClick={() => toggleFolder(n.path)}>
                {expandedFolders.has(n.path) ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                <Folder size={14} className="icon" />
                <span>{n.name}</span>
              </div>
              {expandedFolders.has(n.path) && n.children && (
                <div style={{ paddingLeft: '16px' }}>
                  <FileTree nodes={n.children} expandedFolders={expandedFolders} toggleFolder={toggleFolder} openFile={openFile} activeTabId={activeTabId} />
                </div>
              )}
            </>
          ) : (
            <div className={`file-tree-item file ${activeTabId === `file:${n.path}` ? 'active' : ''}`} onClick={() => openFile(n)}>
              <FileText size={14} className="icon" style={{ opacity: 0.6 }} />
              <span>{n.name}</span>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = useLocalStorage<any>('spine_profile', null);
  const apiKey = profile?.backboardKey || '';

  const [openTabs, setOpenTabs] = useState<Tab[]>([]);
  const [activeTabId, setActiveTabId] = useState<string | null>(null);
  const [fileTree, setFileTree] = useState<any[]>([]);
  const [filesLoading, setFilesLoading] = useState(false);
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  const fetchFileTree = useCallback(async () => {
    setFilesLoading(true);
    try {
      const host = window.location.hostname || 'localhost';
      const res = await fetch(`http://${host}:3001/api/files`);
      const data = await res.json();
      setFileTree(data.files || []);
    } catch (err) { console.error('Files error:', err); }
    finally { setFilesLoading(false); }
  }, []);

  useEffect(() => { fetchFileTree(); }, [fetchFileTree]);

  const toggleFolder = (path: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(path)) next.delete(path);
      else next.add(path);
      return next;
    });
  };

  const openFile = (node: any) => {
    const id = `file:${node.path}`;
    if (!openTabs.find(t => t.id === id)) {
      setOpenTabs(prev => [...prev, { id, type: 'file', title: node.name }]);
    }
    setActiveTabId(id);
    setActiveView('chat');
  };

  const closeTab = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setOpenTabs(prev => {
      const filtered = prev.filter(t => t.id !== id);
      if (activeTabId === id) {
        setActiveTabId(filtered.length > 0 ? filtered[filtered.length - 1].id : null);
      }
      return filtered;
    });
  };

  const handleTabClick = (tab: Tab) => {
    setActiveTabId(tab.id);
    if (tab.type === 'thread') {
      setThreadId(tab.id);
      loadThreadMessages(tab.id).then(setMessages).catch(console.error);
    }
    setActiveView('chat');
  };

  const [agents, setAgents] = useState<PersonaProfile[]>(() => {
    const saved = window.localStorage.getItem('spine_agents');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (err) {
        console.error('Failed to parse spine_agents from localStorage:', err);
      }
    }
    return PRESET_PERSONAS;
  });
  const [selectedPersonaId, setSelectedPersonaId] = useLocalStorage('spine_selected_persona_id', 'build');
  const [showAgentMenu, setShowAgentMenu] = useState(false);
  const activeAgent = useMemo(() => agents.find(a => a.id === selectedPersonaId) || agents[0], [agents, selectedPersonaId]);
  const handleUpdateAgent = useCallback((id: string, f: any) => setAgents(prev => { const n = prev.map(a => a.id === id ? { ...a, ...f } : a); window.localStorage.setItem('spine_agents', JSON.stringify(n)); return n; }), []);
  const handleDeleteAgent = useCallback((id: string) => setConfirmModal({ title: 'Delete Agent', message: `Delete @${id}?`, isDanger: true, onConfirm: () => { setAgents(prev => { const n = prev.filter(a => a.id !== id); window.localStorage.setItem('spine_agents', JSON.stringify(n)); return n; }); if (selectedPersonaId === id) setSelectedPersonaId('build'); } }), [selectedPersonaId, setSelectedPersonaId]);
  const handleCreateAgent = useCallback((a: any) => { setAgents(prev => { const n = [...prev, a]; window.localStorage.setItem('spine_agents', JSON.stringify(n)); return n; }); setSelectedPersonaId(a.id); }, [setSelectedPersonaId]);
  const handleResetAgent = useCallback((id: string) => { const def = PRESET_PERSONAS.find(p => p.id === id); if (def) setConfirmModal({ title: 'Reset Agent', message: `Reset @${id}?`, isDanger: true, onConfirm: () => setAgents(prev => { const n = prev.map(a => a.id === id ? { ...def } : a); window.localStorage.setItem('spine_agents', JSON.stringify(n)); return n; }) }); }, []);

  const [confirmModal, setConfirmModal] = useState<any>(null);
  const [memoryMode, setMemoryMode] = useLocalStorage('spine_memory_mode', 'Auto');
  const [showSettings, setShowSettings] = useState(false);
  const [showThreadSelector, setShowThreadSelector] = useState(false);
  const threadSelectorRef = useRef<any>(null);
  const [showLeftSidebar, setShowLeftSidebar] = useLocalStorage('spine_show_left_sidebar', true);
  const [showRightSidebar, setShowRightSidebar] = useLocalStorage('spine_show_right_sidebar', true);
  const [inputText, setInputText] = useState('');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [activeView, setActiveView] = useState<string>('chat');
  const [showModelMenu, setShowModelMenu] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState<string[]>([]);
  const [attachedFileNames, setAttachedFileNames] = useState<string[]>([]);
  const [isUploadingFile, setIsUploadingFile] = useState(false);
  const [liveTranscription, setLiveTranscription] = useState('');
  const [rightSidebarTab, setRightSidebarTab] = useState<'files' | 'tasks'>('files');
  const agentMenuRef = useRef<any>(null);
  const modelMenuRef = useRef<any>(null);
  const agentBadgeRef = useRef<any>(null);
  const modelBadgeRef = useRef<any>(null);

  const handleModelChange = useCallback((n: string, p: string) => { 
    window.localStorage.setItem('spine_model_name', n);
    window.localStorage.setItem('spine_llm_provider', p);
    window.location.reload();
  }, []);
  const modelName = window.localStorage.getItem('spine_model_name') || 'claude-3-5-sonnet-latest';
  const llmProvider = window.localStorage.getItem('spine_llm_provider') || 'anthropic';

  const [threadId, setThreadId] = useLocalStorage('spine_thread_id', '');
  const [assistantId, setAssistantId] = useLocalStorage('spine_assistant_id', '');

  const {
    threads,
    threadsLoading,
    fetchThreads,
    deleteThread,
    loadThreadMessages
  } = useThreads(apiKey);

  const {
    messages,
    setMessages,
    statusText,
    loading,
    wsStatus,
    pendingPermission,
    activeCommandId,
    terminalLogs,
    tasks,
    memories,
    memoriesLoading,
    latestContextUsage,
    sendMessage,
    handlePermissionResponse,
    handleAddMemory,
    handleDeleteMemory,
    fetchMemories,
    handleNewThread: baseHandleNewThread,
    handleResetAll,
    startVoiceStream,
    sendVoiceChunk,
    stopVoiceStream
  } = useWebSocket({
    apiKey,
    threadId,
    setThreadId,
    assistantId,
    setAssistantId,
    modelName,
    llmProvider,
    systemPrompt: activeAgent.systemPrompt,
    safetyMode: activeAgent.safetyMode || 'ask',
    memoryMode,
    webSearchEnabled: activeAgent.webSearchEnabled,
    codebaseIndexingEnabled: activeAgent.codebaseIndexingEnabled,
    agentRules: {
      readMode: activeAgent.readMode,
      writeMode: activeAgent.writeMode,
      bashMode: activeAgent.bashMode,
      commandRules: activeAgent.commandRules || [],
      writeFileRules: activeAgent.writeFileRules || [],
      readFileRules: activeAgent.readFileRules || [],
    },
    agentId: activeAgent.id,
    onVoiceTranscription: (text, isFinal) => {
      setLiveTranscription(text);
      if (isFinal) {
        setTimeout(() => setLiveTranscription(''), 2000);
      }
    },
    onRunComplete: (tid) => {
      fetchThreads();
      // Update tab title if it's the current thread
      if (tid === threadId) {
        loadThreadMessages(tid).then(msgs => {
          setMessages(msgs);
          if (msgs.length > 0) {
            const firstMsg = msgs.find(m => m.role === 'user')?.content || msgs[0].content;
            const title = firstMsg.substring(0, 30) + (firstMsg.length > 30 ? '...' : '');
            setOpenTabs(prev => prev.map(t => t.id === tid ? { ...t, title } : t));
          }
        });
      }
    }
  });

  const handleNewThread = useCallback(() => {
    baseHandleNewThread();
    setThreadId('');
  }, [baseHandleNewThread, setThreadId]);

  const { models, isUsingFallbackModels, modelsFetchError } = useModels(apiKey, (_loadedModels) => {
    // If the currently selected model is not in the loaded list, you could auto-select here.
    // For now we just let the modelName stand.
  });

  const handleFileUpload = async (e: any) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setIsUploadingFile(true);
    setUploadError(null);
    try {
      const formData = new FormData();
      formData.append('file', f);
      const host = window.location.hostname || 'localhost';
      const res = await fetch(`http://${host}:3001/api/upload`, { method: 'POST', body: formData });
      if (!res.ok) {
        throw new Error(`Upload returned status ${res.status}`);
      }
      const data = await res.json();
      if (data.path) {
        setAttachedFiles(prev => [...prev, data.path]);
        setAttachedFileNames(prev => [...prev, f.name]);
      } else {
        throw new Error(data.message || 'No path returned from server');
      }
    } catch (err: any) { 
      console.error('Upload failed', err); 
      setUploadError(err.message || 'File upload failed. Make sure the backend is running.');
    }
    finally { setIsUploadingFile(false); }
  };

  const handleRemoveAttachment = (idx: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== idx));
    setAttachedFileNames(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e?: any) => {
    if (e) e.preventDefault();
    if (!inputText.trim() && attachedFiles.length === 0) return;
    sendMessage(inputText, attachedFiles);
    setInputText('');
    setAttachedFiles([]);
    setAttachedFileNames([]);
    if (textareaRef.current) textareaRef.current.style.height = 'auto';
  };

  const handleEditSubmit = useCallback((_idx: number, content: string, modelKey?: string, agentId?: string, files?: string[]) => {
    const p = { content, modelKey, agentId, files };
    if (p.modelKey) {
      const [provider, name] = p.modelKey.split('/');
      handleModelChange(name, provider);
    }
    if (p.agentId) setSelectedPersonaId(p.agentId);
    setTimeout(() => sendMessage(p.content || '', p.files), 50);
  }, [sendMessage, handleModelChange, setSelectedPersonaId]);

  const handleRetry = useCallback((_idx: number) => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
    if (lastUserMsg) sendMessage(lastUserMsg.content || '', lastUserMsg.files);
  }, [messages, sendMessage]);

  const messagesEndRef = useRef<any>(null);
  const messagesContainerRef = useRef<any>(null);
  const textareaRef = useRef<any>(null);
  const lastLen = useRef(0);

  useEffect(() => {
    // Only auto-scroll if we are already at the bottom (within a small threshold)
    // or if a brand-new message was just added.
    const isNewMessage = messages.length !== lastLen.current;
    
    // Check global scroll position
    const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 50;

    if (isNewMessage || atBottom) {
      window.scrollTo({ top: document.documentElement.scrollHeight, behavior: 'auto' });
    }
    
    lastLen.current = messages.length;
  }, [messages, statusText]);

  useEffect(() => { if (threadId && apiKey && messages.length === 0) loadThreadMessages(threadId).then(setMessages).catch(console.error); }, [threadId, apiKey, loadThreadMessages, setMessages]);
  useEffect(() => { fetchThreads(); }, [threadId, fetchThreads]);

  const handleTextareaInput = (e: any) => { setInputText(e.target.value); e.target.style.height = 'auto'; e.target.style.height = Math.min(e.target.scrollHeight, 200) + 'px'; };

  const handlePromptClick = useCallback((prompt: string) => sendMessage(prompt), [sendMessage]);
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showThreadSelector && threadSelectorRef.current && !threadSelectorRef.current.contains(event.target)) {
        setShowThreadSelector(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showThreadSelector]);

  if (!apiKey) return <OnboardingPage onComplete={setProfile} />;

  return (
    <div className="app-container" style={{
      '--left-col-width': showLeftSidebar ? '280px' : '48px',
      '--right-col-width': showRightSidebar ? '280px' : '48px',
    } as any}>
      {activeView === 'permissions' ? (
        <div className="full-page-view">
          <AgentsPanel agents={agents} selectedPersonaId={selectedPersonaId} setSelectedPersonaId={setSelectedPersonaId} onUpdateAgent={handleUpdateAgent} onDeleteAgent={handleDeleteAgent} onCreateAgent={handleCreateAgent} onResetAgent={handleResetAgent} onBack={() => setActiveView('chat')} apiKey={apiKey} />
        </div>
      ) : (
        <div className="main-layout">
          {/* ── Top Left: Logo & Toggle ── */}
          <div className={`top-controls-left ${!showLeftSidebar ? 'collapsed' : ''}`}>
            {!showLeftSidebar ? (
              <div 
                className="header-logo" 
                onClick={() => setShowLeftSidebar(true)} 
                style={{ 
                  cursor: 'pointer', 
                  transform: 'scale(0.8)', 
                  transformOrigin: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Expand Sidebar"
              >
                <img src="/spine_logo.png" className="header-logo-img spine-brand" alt="SPINE" />
                <span className="logo-text-divider">+</span>
                <img src="/backboard_logo.png" className="header-logo-img backboard-brand" alt="Backboard" />
              </div>
            ) : (
              <>
                <div className="header-logo" onClick={() => { setActiveView('chat'); handleNewThread(); }} style={{ cursor: 'pointer' }}>
                  <img src="/spine_logo.png" className="header-logo-img spine-brand" alt="SPINE" />
                  <span className="logo-text-divider">+</span>
                  <img src="/backboard_logo.png" className="header-logo-img backboard-brand" alt="Backboard" />
                </div>

                <button className="sidebar-toggle-btn" onClick={() => setShowLeftSidebar(false)} title="Collapse sidebar">
                  <ChevronLeft size={16} />
                </button>
              </>
            )}
          </div>

          {/* ── Top Center: Tabs ── */}
          <div className="tabs-bar">
            <div className="tabs-list">
              {openTabs.map(t => (
                <button key={t.id} className={`tab-pill ${activeTabId === t.id ? 'active' : ''}`} onClick={() => handleTabClick(t)}>
                  {t.type === 'thread' ? <MessageSquare size={12} /> : <FileCode size={12} />}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{t.title}</span>
                  <span className="tab-close-btn" onClick={(e) => closeTab(t.id, e)}><X size={10} /></span>
                </button>
              ))}
            </div>
            <div className="tabs-status-area" style={{ paddingLeft: '12px', marginLeft: 'auto', display: 'flex', alignItems: 'center' }}>
              <span className={`header-status ${wsStatus}`}><span className={`status-dot ${wsStatus}`} />{wsStatus === 'connected' ? 'Connected' : wsStatus === 'connecting' ? 'Reconnecting...' : 'Disconnected'}</span>
            </div>
          </div>

          {/* ── Top Right: Toggle ── */}
          <div className={`top-controls-right ${!showRightSidebar ? 'collapsed' : ''}`}>
            {showRightSidebar && (
              <div className="sidebar-tabs">
                <button className={`sidebar-tab ${rightSidebarTab === 'files' ? 'active' : ''}`} onClick={() => setRightSidebarTab('files')}><FileCode size={14} /><span>Files</span></button>
                <button className={`sidebar-tab ${rightSidebarTab === 'tasks' ? 'active' : ''}`} onClick={() => setRightSidebarTab('tasks')}><ListTodo size={14} /><span>Tasks</span>{tasks.some(t => t.status === 'in-progress') && <span className="tab-indicator" />}</button>
              </div>
            )}
            <button className="sidebar-toggle-btn" onClick={() => setShowRightSidebar(!showRightSidebar)} title="Toggle items">
              {showRightSidebar ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* ── Left Sidebar: Conversations ── */}
          <aside className={`threads-sidebar ${!showLeftSidebar ? 'collapsed' : ''}`}>
            {!showLeftSidebar ? (
              <div className="sidebar-rail-icons">
                <button className="icon-btn" onClick={async () => { handleNewThread(); await fetchThreads(); }} title="New Thread">
                  <Plus size={18} />
                </button>
                <div style={{ position: 'relative' }}>
                  <button className="icon-btn" onClick={() => setShowThreadSelector(!showThreadSelector)} title="Recent Threads">
                    <MessageSquare size={18} />
                  </button>
                  {showThreadSelector && (
                    <div ref={threadSelectorRef} className="thread-selector-popup" style={{
                      position: 'absolute', left: 'calc(100% + 12px)', top: 0,
                      width: '240px', background: 'var(--bg-primary)',
                      border: '1px solid var(--border-color)', borderRadius: '12px',
                      boxShadow: 'var(--shadow-lg)', zIndex: 1000, padding: '8px'
                    }}>
                      <div className="menu-section-header">Recent Conversations</div>
                      <div className="sidebar-thread-list" style={{ maxHeight: '300px' }}>
                        {threads.map(t => (
                          <button key={t.threadId} className={`thread-item ${threadId === t.threadId ? 'active' : ''}`} onClick={async () => { const ms = await loadThreadMessages(t.threadId); setMessages(ms); setThreadId(t.threadId); setActiveTabId(t.threadId); setShowThreadSelector(false); }}>
                            <span className="thread-title">{t.title}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', paddingBottom: '16px' }}>
                  <button className={`icon-btn ${activeView === 'permissions' ? 'active' : ''}`} onClick={() => setActiveView('permissions')} title="Agents"><Shield size={18} /></button>
                  <button className="icon-btn" onClick={() => setShowSettings(!showSettings)} title="Settings"><Settings size={18} /></button>
                </div>
              </div>
            ) : (
              <>
                <div className="sidebar-thread-list" style={{ paddingTop: '16px' }}>
                  <button className="thread-item new-thread-btn" onClick={async () => { handleNewThread(); await fetchThreads(); }} style={{ marginBottom: '8px', border: '1px dashed var(--border-color)', justifyContent: 'center' }}>
                    <Plus size={14} style={{ marginRight: '8px' }} /> <span>New Conversation</span>
                  </button>
                  {threadsLoading && threads.length === 0 ? <div style={{ textAlign: 'center', padding: '20px' }}>Loading...</div> : threads.map(t => (
                    <button key={t.threadId} className={`thread-item ${threadId === t.threadId ? 'active' : ''}`} onClick={async () => { const ms = await loadThreadMessages(t.threadId); setMessages(ms); setThreadId(t.threadId); setActiveTabId(t.threadId); }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: 1, overflow: 'hidden' }}><MessageSquare size={13} style={{ opacity: threadId === t.threadId ? 0.95 : 0.45 }} /><span className="thread-title">{t.title}</span></div>
                      <span className="thread-delete-btn" onClick={(e) => { e.stopPropagation(); setConfirmModal({ title: 'Delete Conversation', message: 'This will permanently delete this conversation and all its messages.', isDanger: true, onConfirm: async () => { const deletedId = t.threadId; await deleteThread(deletedId); if (activeTabId === deletedId) { handleNewThread(); setActiveTabId(null); } setOpenTabs(prev => prev.filter(x => x.id !== deletedId)); await fetchThreads(); } }); }}><Trash2 size={12} /></span>
                    </button>
                  ))}
                </div>
                <div className="sidebar-footer">
                  <button className={`btn btn-sm ${activeView === 'permissions' ? 'active' : ''}`} onClick={() => setActiveView('permissions')} style={{ flex: 1, justifyContent: 'center' }} title="Agents"><Shield size={14} /> Agents</button>
                  <button className="icon-btn" onClick={() => setShowSettings(!showSettings)} title="Settings"><Settings size={16} /></button>
                </div>
              </>
            )}
          </aside>

          {/* ── Main Content ── */}
          <div className="main-content-area">
            {activeTabId && activeTabId.startsWith('file:') ? <FileEditor path={activeTabId.replace('file:', '')} onSave={fetchFileTree} /> : (
              <main className="chat-section">
                {messages.length === 0 ? <WelcomeScreen onPromptClick={handlePromptClick} /> : (
                  <div className="messages-container" ref={messagesContainerRef}>
                    <div className="messages-inner">
                      {messages.map((m, i) => (
                        <ChatMessage key={i} index={i} msg={m} pendingPermission={pendingPermission && i === messages.length - 1 ? pendingPermission : null} onPermissionResponse={handlePermissionResponse} activeCommandId={activeCommandId} terminalLogs={terminalLogs} onEditSubmit={handleEditSubmit} onRetry={handleRetry} disabled={loading} modelName={m.modelName} models={models} agentId={m.agentId} agents={agents} isUsingFallbackModels={isUsingFallbackModels} modelsFetchError={modelsFetchError} />
                      ))}
                      <div ref={messagesEndRef} />
                    </div>
                  </div>
                )}
                <div className="input-area">
                  <div className="input-area-inner">
                    <form onSubmit={handleSubmit}>
                      {attachedFileNames.length > 0 && <div className="input-attachments">{attachedFileNames.map((n, i) => <div key={i} className="attachment-badge"><span>📎 {n}</span><button type="button" onClick={() => handleRemoveAttachment(i)}><X size={12} /></button></div>)}</div>}

                      <div className="input-selectors-row">
                        {activeAgent && (
                          <div style={{ position: 'relative', display: 'flex' }}>
                            <button
                              type="button"
                              className="input-agent-badge"
                              ref={agentBadgeRef}
                              onClick={(e) => { e.stopPropagation(); setShowAgentMenu(!showAgentMenu); setShowModelMenu(false); }}
                              style={{ '--agent-color': getAgentColor(activeAgent) } as any}
                            >
                              <span>@{activeAgent.id}</span>
                            </button>
                            {showAgentMenu && (
                              <div ref={agentMenuRef} style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, zIndex: 1000 }}>
                                <AgentSelectorMenu
                                  agents={agents}
                                  selectedPersonaId={selectedPersonaId}
                                  onSelectAgent={(id: string) => { setSelectedPersonaId(id); setShowAgentMenu(false); }}
                                  onClose={() => setShowAgentMenu(false)}
                                />
                              </div>
                            )}
                          </div>
                        )}
                        <div style={{ position: 'relative', display: 'flex' }}>
                          <button
                            type="button"
                            className="input-model-badge"
                            ref={modelBadgeRef}
                            onClick={(e) => { e.stopPropagation(); setShowModelMenu(!showModelMenu); setShowAgentMenu(false); }}
                          >
                            <span>{modelDisplayName(modelName)}</span>
                          </button>
                          {showModelMenu && (
                            <div className="model-selector-popover" ref={modelMenuRef} style={{ position: 'absolute', bottom: 'calc(100% + 8px)', left: 0, width: '280px', zIndex: 1000 }}>
                              <ModelSelector
                                modelName={modelName}
                                llmProvider={llmProvider}
                                models={models}
                                onModelChange={handleModelChange}
                                isUsingFallbackModels={isUsingFallbackModels}
                                modelsFetchError={modelsFetchError}
                                popupDirection="up"
                                onClose={() => setShowModelMenu(false)}
                              />
                            </div>
                          )}
                        </div>
                      </div>

                      {loading && (
                        <div style={{
                          height: '2px',
                          width: '100%',
                          borderRadius: '2px',
                          background: 'rgba(0, 123, 252, 0.1)',
                          overflow: 'hidden',
                          position: 'relative',
                          marginBottom: '6px'
                        }}>
                          <div className="loading-bar-fill" />
                        </div>
                      )}
                      <div className={`input-box ${inputText.startsWith('!') ? 'shell-mode' : ''}`}>
                        <input type="file" id="up" style={{ display: 'none' }} onChange={handleFileUpload} accept="image/*" />
                        <label htmlFor="up" className="icon-btn">{isUploadingFile ? <Loader2 size={14} className="spin" /> : <Paperclip size={14} />}</label>
                        <textarea ref={textareaRef} placeholder="Ask SPINE to write code, run commands, or explain files…" value={inputText} onChange={handleTextareaInput} onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); } }} className="chat-textarea" rows={1} />
                        <VoiceRecorder disabled={loading} startVoiceStream={startVoiceStream} sendVoiceChunk={sendVoiceChunk} stopVoiceStream={stopVoiceStream} />
                        <button type="submit" className="send-btn" disabled={loading || (!inputText.trim() && attachedFiles.length === 0)}>{loading ? <Loader2 size={16} className="spin" /> : <ArrowUp size={16} />}</button>
                      </div>
                      {uploadError && <div className="upload-error-message" style={{ color: 'var(--red-text, #ef4444)', fontSize: '12px', marginTop: '4px', padding: '0 8px' }}>⚠️ {uploadError}</div>}

                      {liveTranscription && <div className="live-transcription">🎤 {liveTranscription}</div>}
                      {statusText && <div className="input-status"><Loader2 size={12} className="spin" /><span>{statusText}</span></div>}
                    </form>
                  </div>
                </div>
              </main>
            )}
          </div>

          {/* ── Right Sidebar: Files/Tasks ── */}
          <aside className={`files-sidebar ${!showRightSidebar ? 'collapsed' : ''}`}>
            {rightSidebarTab === 'files' ? (
              <>
                <div className="sidebar-header"><h3>Workspace</h3><button className="icon-btn" onClick={fetchFileTree} title="Refresh"><RefreshCw size={12} className={filesLoading ? 'spin' : ''} /></button></div>
                <div className="file-tree-container">
                  {fileTree.length === 0 && !filesLoading ? (
                    <div className="sidebar-empty-state" style={{ padding: '24px 16px', textAlign: 'center', opacity: 0.6, fontSize: '12px' }}>
                      No files found. Is the backend running?
                    </div>
                  ) : (
                    <FileTree nodes={fileTree} expandedFolders={expandedFolders} toggleFolder={toggleFolder} openFile={openFile} activeTabId={activeTabId} />
                  )}
                </div>
              </>
            ) : <TaskTracker tasks={tasks} />}
          </aside>
        </div>
      )}

      {showSettings && <SettingsPanel 
        profile={profile} 
        onProfileUpdate={setProfile}
        memoryMode={memoryMode}
        setMemoryMode={setMemoryMode}
        threadId={threadId}
        latestContextUsage={latestContextUsage}
        onClose={() => setShowSettings(false)}
        memories={memories}
        memoriesLoading={memoriesLoading}
        onAddMemory={handleAddMemory}
        onDeleteMemory={handleDeleteMemory}
        onRefreshMemories={() => fetchMemories()}
        onOpenPermissions={() => { setShowSettings(false); setActiveView('permissions'); }}
        onResetAll={handleResetAll}
      />}
      {confirmModal && <ConfirmModal title={confirmModal.title} message={confirmModal.message} isDanger={confirmModal.isDanger} onConfirm={confirmModal.onConfirm} onClose={() => setConfirmModal(null)} />}
    </div>
  );
}
