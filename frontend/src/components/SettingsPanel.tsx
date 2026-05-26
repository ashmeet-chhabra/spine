import { useState, useEffect } from 'react';
import { X, Search, Trash2, Plus, RefreshCw, Check, Shield, Settings, Database, User } from 'lucide-react';
import type { Memory, Rule } from '../types/messages';

export function serializeRules(rules: Rule[]): string {
  if (!rules) return '';
  return rules.map(r => `${r.pattern}: ${r.action}`).join('\n');
}

export function deserializeRules(text: string): Rule[] {
  if (!text) return [];
  return text
    .split('\n')
    .map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) return null;
      const lastColonIndex = trimmed.lastIndexOf(':');
      if (lastColonIndex === -1) return null;
      const pattern = trimmed.slice(0, lastColonIndex).trim();
      const actionStr = trimmed.slice(lastColonIndex + 1).trim().toLowerCase();
      if (actionStr === 'allow' || actionStr === 'deny' || actionStr === 'ask') {
        return { pattern, action: actionStr as 'allow' | 'deny' | 'ask' };
      }
      return null;
    })
    .filter((r): r is Rule => r !== null);
}

interface SettingsPanelProps {
  profile: { name: string; backboardKey: string; providerKeys: Record<string, string> };
  onProfileUpdate: (p: any) => void;
  memoryMode: string;
  setMemoryMode: (mode: string) => void;
  threadId: string;
  latestContextUsage: { tokens?: number; limit?: number; percentage?: number } | null;
  onClose: () => void;
  memories: Memory[];
  memoriesLoading: boolean;
  onAddMemory: (content: string) => void;
  onDeleteMemory: (memoryId: string) => void;
  onRefreshMemories: () => void;
  onOpenPermissions?: () => void;
  onResetAll?: () => void;
}

export default function SettingsPanel({
  profile,
  onProfileUpdate,
  memoryMode,
  setMemoryMode,
  threadId,
  latestContextUsage,
  onClose,
  memories,
  memoriesLoading,
  onAddMemory,
  onDeleteMemory,
  onRefreshMemories,
  onOpenPermissions,
  onResetAll
}: SettingsPanelProps) {
  const [activeSection, setActiveSection] = useState<'profile' | 'memory'>('profile');
  const [newMemory, setNewMemory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [addingMemory, setAddingMemory] = useState(false);

  // Profile local state for editing
  const [editName, setEditName] = useState(profile.name);
  const [editBackboardKey, setEditBackboardKey] = useState(profile.backboardKey);
  const [editProviderKeys, setEditProviderKeys] = useState<Record<string, string>>(profile.providerKeys || {});

  // Dynamic BYOK states
  const [availableProviders, setAvailableProviders] = useState<string[]>(['anthropic', 'openai', 'google', 'openrouter', 'cohere', 'xai', 'aws-bedrock', 'cerebras']);
  const [selectedAddProvider, setSelectedAddProvider] = useState('anthropic');
  const [addProviderKeyInput, setAddProviderKeyInput] = useState('');

  // Fetch available providers from Backboard via backend
  useEffect(() => {
    if (!editBackboardKey) return;
    const host = window.location.hostname || 'localhost';
    fetch(`http://${host}:3001/api/providers?apiKey=${editBackboardKey}`)
      .then(res => res.json())
      .then(data => {
        if (data.providers && Array.isArray(data.providers)) {
          const list = data.providers.map((p: any) => typeof p === 'object' ? p.id || p.name : p);
          if (list.length > 0) {
            setAvailableProviders(list);
          }
        }
      })
      .catch(err => console.error('Failed to fetch providers:', err));
  }, [editBackboardKey]);

  // Auto-select the first unconfigured provider
  useEffect(() => {
    if (availableProviders.length > 0) {
      const unconfigured = availableProviders.find(p => !editProviderKeys[p]);
      setSelectedAddProvider(unconfigured || availableProviders[0]);
    }
  }, [availableProviders, editProviderKeys]);

  const handleSaveProfile = () => {
    onProfileUpdate({
      name: editName,
      backboardKey: editBackboardKey,
      providerKeys: editProviderKeys
    });
  };

  const handleClose = () => {
    handleSaveProfile();
    onClose();
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handleClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editName, editBackboardKey, editProviderKeys, onClose]);

  // Filter memories based on search query
  const filteredMemories = memories.filter((m) =>
    m.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddMemorySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemory.trim()) return;
    onAddMemory(newMemory.trim());
    setNewMemory('');
    setAddingMemory(false);
  };

  // Context usage styling helper
  const renderContextProgressBar = () => {
    const hasData = latestContextUsage && typeof latestContextUsage.tokens === 'number';
    const tokens = hasData ? latestContextUsage.tokens! : 0;
    const limit = hasData && latestContextUsage.limit ? latestContextUsage.limit! : 200000;
    const percentage = hasData && typeof latestContextUsage.percentage === 'number'
      ? Math.min(100, latestContextUsage.percentage!)
      : Math.min(100, (tokens / limit) * 100);

    const isHighUsage = percentage > 80;
    const barGradient = isHighUsage
      ? 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)'
      : 'linear-gradient(90deg, #06b6d4 0%, #8b5cf6 100%)';
    const textColor = isHighUsage ? 'var(--rose)' : 'var(--accent)';

    return (
      <div className="context-bar" style={{ marginTop: '8px' }}>
        <div className="context-bar-label">
          <span>Context Token Usage</span>
          <span style={{ fontWeight: 'bold', color: textColor }}>
            {percentage.toFixed(1)}%
          </span>
        </div>
        <div className="context-bar-track">
          <div
            className="context-bar-fill"
            style={{
              width: `${percentage}%`,
              background: barGradient
            }}
          />
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '10px', color: 'var(--text-muted)', marginTop: '4px' }}>
          <span>{tokens.toLocaleString()} tokens</span>
          <span>limit: {limit.toLocaleString()}</span>
        </div>
      </div>
    );
  };

  return (
    <div className="settings-modal-backdrop" onClick={handleClose}>
      <div className="settings-modal-container" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="settings-modal-header">
          <h2>
            <Settings size={22} className="text-accent" />
            SPINE Settings
          </h2>
          <button className="icon-btn" onClick={handleClose} title="Close Settings">
            <X size={18} />
          </button>
        </div>

        <div className="settings-modal-layout">
          {/* Sidebar */}
          <aside className="settings-modal-sidebar">
            <button
              className={`settings-sidebar-item ${activeSection === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveSection('profile')}
            >
              <User size={16} />
              Profile & Keys
            </button>
            <button
              className={`settings-sidebar-item ${activeSection === 'memory' ? 'active' : ''}`}
              onClick={() => setActiveSection('memory')}
            >
              <Database size={16} />
              Memory
            </button>
          </aside>

          {/* Body */}
          <main className="settings-modal-body">
            {activeSection === 'profile' && (
              <>
                <div className="drawer-section">
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="drawer-section-label">Active Profile</span>
                    <div className="profile-tooltip-trigger" style={{ cursor: 'help', opacity: 0.6 }}>
                      <Shield size={12} />
                      <div className="profile-tooltip">
                        A profile is a collection of settings and permissions. You can use different profiles for different contexts—like an "Autonomous" setup for personal projects or a "Human-in-loop" setup for serious work.
                      </div>
                    </div>
                  </div>
                  <div className="form-group" style={{ marginTop: '8px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Profile Name</label>
                    <input
                      type="text"
                      placeholder="e.g. Autonomous Setup"
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={handleSaveProfile}
                      className="input-field"
                    />
                  </div>
                </div>

                <div className="drawer-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className="drawer-section-label">Safety & Memory Mode</span>
                    <div className="profile-tooltip-trigger" style={{ cursor: 'help', opacity: 0.6 }}>
                      <Database size={12} />
                      <div className="profile-tooltip" style={{ width: '240px' }}>
                        <strong>Backboard Persistent Memory</strong><br />
                        <strong>Auto:</strong> Backboard automatically extracts memories, preferences, and context from every conversation and stores them persistently — recalled on future runs across any model.<br />
                        <strong>Readonly:</strong> Existing memories are injected into context, but no new memories are written.<br />
                        <strong>Off:</strong> Memory is fully disabled for this session.
                      </div>
                    </div>
                  </div>
                  <select
                    value={memoryMode}
                    onChange={(e) => setMemoryMode(e.target.value)}
                    className="select-field"
                    style={{ marginTop: '8px' }}
                  >
                    <option value="Auto">Auto (Read & Write Memories)</option>
                    <option value="Readonly">Readonly (No Auto Additions)</option>
                    <option value="Off">Off (Wipe memory reference)</option>
                  </select>
                  <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px', lineHeight: '1.5' }}>
                    Powered by Backboard's hybrid semantic + keyword memory retrieval, persisted across models and threads.
                  </p>
                </div>

                <div className="drawer-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-primary"
                    style={{ width: '100%' }}
                    onClick={onOpenPermissions}
                  >
                    <Shield size={14} />
                    <span>Manage Agents</span>
                  </button>
                </div>

                {threadId && (
                  <div className="drawer-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                    <span className="drawer-section-label">Active Session</span>
                    <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', border: '1px solid var(--border-color)', marginTop: '8px' }}>
                      <span style={{ fontSize: '11.5px', color: 'var(--text-secondary)', wordBreak: 'break-all', display: 'block', marginBottom: '8px' }}>
                        <strong>Active Thread:</strong> {threadId}
                      </span>
                      {renderContextProgressBar()}
                    </div>
                  </div>
                )}

                <div className="drawer-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <span className="drawer-section-label">Provider Keys (BYOK)</span>
                  
                  {/* Current configured provider keys list */}
                  {Object.keys(editProviderKeys).length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '10px', marginBottom: '14px' }}>
                      {Object.entries(editProviderKeys).map(([provider, keyVal]) => (
                        <div key={provider} style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          background: 'rgba(255, 255, 255, 0.02)',
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          padding: '8px 12px'
                        }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                            <span style={{ fontSize: '11px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-primary)' }}>
                              {provider}
                            </span>
                            <span style={{ fontSize: '11px', color: 'var(--text-muted)', fontFamily: 'var(--mono)' }}>
                              {keyVal.substring(0, 8)}••••••••
                            </span>
                          </div>
                          <button
                            type="button"
                            className="icon-btn"
                            title={`Delete key for ${provider}`}
                            style={{ padding: '6px', border: 'none', background: 'transparent' }}
                            onClick={() => {
                              const next = { ...editProviderKeys };
                              delete next[provider];
                              setEditProviderKeys(next);
                              onProfileUpdate({
                                name: editName,
                                backboardKey: editBackboardKey,
                                providerKeys: next
                              });
                            }}
                          >
                            <Trash2 size={13} style={{ color: 'var(--rose)' }} />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add provider key form */}
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px',
                    padding: '12px',
                    background: 'rgba(0, 0, 0, 0.2)',
                    borderRadius: '8px',
                    border: '1px solid var(--border-color)',
                    marginTop: '8px'
                  }}>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <select
                        className="select-field"
                        style={{ flex: 1, height: '36px', padding: '0 8px', fontSize: '12.5px' }}
                        value={selectedAddProvider}
                        onChange={(e) => setSelectedAddProvider(e.target.value)}
                      >
                        {availableProviders.map(p => (
                          <option key={p} value={p}>{p}</option>
                        ))}
                      </select>
                      
                      <input
                        type="password"
                        placeholder="Enter API Key"
                        className="input-field"
                        style={{ flex: 1.5, height: '36px', fontSize: '12.5px', padding: '0 10px' }}
                        value={addProviderKeyInput}
                        onChange={(e) => setAddProviderKeyInput(e.target.value)}
                      />
                    </div>
                    
                    <button
                      type="button"
                      className="btn btn-primary"
                      style={{ height: '32px', justifyContent: 'center', fontSize: '12px', padding: '0 16px' }}
                      onClick={() => {
                        if (!addProviderKeyInput.trim()) return;
                        const next = { ...editProviderKeys, [selectedAddProvider]: addProviderKeyInput.trim() };
                        setEditProviderKeys(next);
                        setAddProviderKeyInput('');
                        onProfileUpdate({
                          name: editName,
                          backboardKey: editBackboardKey,
                          providerKeys: next
                        });
                      }}
                    >
                      <Plus size={13} /> Add Provider Key
                    </button>
                  </div>
                </div>

                <div className="drawer-section" style={{ borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <span className="drawer-section-label">Engine Connection</span>
                  <div className="form-group" style={{ marginTop: '8px' }}>
                    <label style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Backboard API Key</label>
                    <input
                      type="password"
                      placeholder="bk-..."
                      value={editBackboardKey}
                      onChange={(e) => setEditBackboardKey(e.target.value)}
                      onBlur={handleSaveProfile}
                      className="input-field"
                    />
                  </div>
                </div>

                {onResetAll && (
                  <div className="drawer-section" style={{ 
                    borderTop: '1px solid rgba(244, 63, 94, 0.2)', 
                    paddingTop: '16px',
                    background: 'rgba(244, 63, 94, 0.02)',
                    margin: '0 -24px',
                    padding: '16px 24px'
                  }}>
                    <span className="drawer-section-label" style={{ color: 'var(--rose)' }}>Danger Zone</span>
                    <button
                      type="button"
                      className="btn btn-danger"
                      style={{ width: '100%', marginTop: '12px' }}
                      onClick={onResetAll}
                    >
                      <Trash2 size={14} />
                      <span>Factory Reset Harness</span>
                    </button>
                    <p style={{ fontSize: '10px', color: 'var(--rose)', opacity: 0.7, marginTop: '8px', textAlign: 'center' }}>
                      This will permanently clear all threads, memories, and profile data.
                    </p>
                  </div>
                )}
              </>
            )}

            {activeSection === 'memory' && (
              <>
                <div className="drawer-section">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="drawer-section-label">Persistent Memories</span>
                    <button
                      className="icon-btn"
                      onClick={onRefreshMemories}
                      disabled={memoriesLoading}
                      title="Refresh memories"
                      style={{ width: '28px', height: '28px' }}
                    >
                      <RefreshCw className={memoriesLoading ? 'spin' : ''} size={13} />
                    </button>
                  </div>
                  <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>
                    Backboard remembers these memories across sessions to provide personalized context.
                  </p>
                </div>

                <div style={{ display: 'flex', gap: '8px' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={14} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      placeholder="Search memories..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="input-field"
                      style={{ paddingLeft: '32px' }}
                    />
                  </div>
                  <button
                    className="btn btn-primary"
                    onClick={() => setAddingMemory(true)}
                  >
                    <Plus size={14} /> Add Memory
                  </button>
                </div>

                {addingMemory && (
                  <form onSubmit={handleAddMemorySubmit} className="memory-add-form" style={{ 
                    flexDirection: 'column', 
                    gap: '12px', 
                    display: 'flex',
                    background: 'var(--bg-primary)',
                    padding: '16px',
                    borderRadius: '8px',
                    border: '1px solid var(--accent-dim)'
                  }}>
                    <textarea
                      placeholder="E.g., The user prefers React for all frontend components."
                      value={newMemory}
                      onChange={(e) => setNewMemory(e.target.value)}
                      className="input-field"
                      style={{ minHeight: '80px', resize: 'vertical' }}
                      autoFocus
                    />
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                      <button
                        type="button"
                        className="btn btn-sm"
                        onClick={() => setAddingMemory(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-sm btn-primary">
                        Save Memory
                      </button>
                    </div>
                  </form>
                )}

                <div className="memory-list" style={{ marginTop: '4px' }}>
                  {memoriesLoading && memories.length === 0 ? (
                    <div style={{ textAlign: 'center', fontSize: '12px', color: 'var(--text-muted)', padding: '40px 0' }}>
                      <RefreshCw className="spin" size={24} style={{ marginBottom: '12px', opacity: 0.5 }} />
                      <p>Loading memories from Backboard...</p>
                    </div>
                  ) : filteredMemories.length === 0 ? (
                    <div style={{ textAlign: 'center', fontSize: '13px', color: 'var(--text-muted)', padding: '40px 0', background: 'var(--bg-primary)', borderRadius: '8px' }}>
                      {searchQuery ? 'No matching memories found.' : 'No memories stored yet.'}
                    </div>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '12px' }}>
                      {filteredMemories.map((memory) => (
                        <div key={memory.id} className="memory-item" style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '8px', height: '100%', display: 'flex', flexDirection: 'column' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', gap: '8px', marginBottom: '8px' }}>
                            <Check size={14} style={{ color: 'var(--accent)', flexShrink: 0, marginTop: '2px' }} />
                            <button
                              onClick={() => onDeleteMemory(memory.id)}
                              title="Delete memory"
                              className="icon-btn"
                              style={{ width: '24px', height: '24px', border: 'none' }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                          <span style={{ fontSize: '12.5px', color: 'var(--text-primary)', flex: 1, lineHeight: '1.5' }}>{memory.content}</span>
                          {memory.createdAt && (
                            <span style={{ fontSize: '10px', color: 'var(--text-muted)', marginTop: '8px' }}>
                              Added on {new Date(memory.createdAt).toLocaleDateString()}
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </>
            )}
          </main>
        </div>
      </div>
    </div>
  );
}
