import { ShieldAlert, Trash2, Plus, RotateCcw, ArrowLeft, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { type PersonaProfile, getAgentColor } from '../types/messages';
import { serializeRules, deserializeRules } from './SettingsPanel';
import RuleHelpPopup from './RuleHelpPopup';
import GlobalPermissions from './GlobalPermissions';
import RuleEditors from './RuleEditors';
import AgentGenerator from './AgentGenerator';

interface AgentsPanelProps {
  agents: PersonaProfile[];
  selectedPersonaId: string;
  setSelectedPersonaId: (id: string) => void;
  onUpdateAgent: (id: string, updatedFields: Partial<PersonaProfile>) => void;
  onDeleteAgent: (id: string) => void;
  onCreateAgent: (agent: PersonaProfile) => void;
  onResetAgent: (id: string) => void;
  onBack: () => void;
  apiKey: string;
}

export default function AgentsPanel({
  agents,
  selectedPersonaId,
  setSelectedPersonaId,
  onUpdateAgent,
  onDeleteAgent,
  onCreateAgent,
  onResetAgent,
  onBack,
  apiKey
}: AgentsPanelProps) {
  const [isCreating, setIsCreating] = useState(false);
  const [showGenerator, setShowGenerator] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [handle, setHandle] = useState('');
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [prompt, setPrompt] = useState('');
  const [readMode, setReadMode] = useState<'allow' | 'deny' | 'ask'>('ask');
  const [bashMode, setBashMode] = useState<'allow' | 'deny' | 'ask'>('ask');
  const [writeMode, setWriteMode] = useState<'allow' | 'deny' | 'ask'>('ask');
  const [editMode, setEditMode] = useState<'allow' | 'deny' | 'ask'>('ask');
  const [delegationMode, setDelegationMode] = useState<'allow' | 'deny' | 'ask'>('ask');
  const [webSearchEnabled, setWebSearchEnabled] = useState(false);
  const [codebaseIndexingEnabled, setCodebaseIndexingEnabled] = useState(false);
  const [isSubagent, setIsSubagent] = useState(false);
  const [commandRules, setCommandRules] = useState('*: ask');
  const [readRules, setReadRules] = useState('*: allow');
  const [writeRules, setWriteRules] = useState('*: ask');
  const [editRules, setEditRules] = useState('*: ask');
  const [delegationRules, setDelegationRules] = useState('*: ask');
  const [editPrompt, setEditPrompt] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [color, setColor] = useState('#10b981');

  const activeAgent = agents.find(a => a.id === selectedPersonaId) || agents[0];

  const nativeAgents = agents.filter(a => a.isNative);
  const customAgents = agents.filter(a => !a.isNative);

  const selectAgent = (id: string) => {
    setSelectedPersonaId(id);
    setIsCreating(false);
    const agent = agents.find(a => a.id === id);
    if (agent) {
      setReadMode(agent.readMode || 'ask');
      setBashMode(agent.bashMode || 'ask');
      setWriteMode(agent.writeMode || 'ask');
      setEditMode(agent.editMode || 'ask');
      setDelegationMode(agent.delegationMode || 'ask');
      setWebSearchEnabled(agent.webSearchEnabled || false);
      setCodebaseIndexingEnabled(agent.codebaseIndexingEnabled || false);
      setIsSubagent(agent.isSubagent || false);
      setCommandRules(serializeRules(agent.commandRules));
      setReadRules(serializeRules(agent.readFileRules || []));
      setWriteRules(serializeRules(agent.writeFileRules));
      setEditRules(serializeRules(agent.editFileRules || []));
      setDelegationRules(serializeRules(agent.delegationRules || []));
      setEditPrompt(agent.systemPrompt || '');
    }
  };

  const handleStartCreate = () => {
    setIsCreating(true);
    setHandle('');
    setName('');
    setDescription('');
    setPrompt('');
    setReadMode('allow');
    setBashMode('ask');
    setWriteMode('ask');
    setEditMode('ask');
    setDelegationMode('ask');
    setWebSearchEnabled(false);
    setEditPrompt('');
    setCodebaseIndexingEnabled(false);
    setIsSubagent(false);
    setCommandRules('*: ask');
    setReadRules('*: allow');
    setWriteRules('*: ask');
    setEditRules('*: ask');
    setDelegationRules('*: ask');
    setErrorMsg('');
    setColor('#10b981');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const cleanHandle = handle.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
    if (!cleanHandle) {
      setErrorMsg('Please specify a valid alphanumeric handle (e.g. coder).');
      return;
    }
    if (['build', 'plan', 'developer', 'architect', 'orchestrator'].includes(cleanHandle)) {
      setErrorMsg(`Handle @${cleanHandle} is reserved.`);
      return;
    }
    if (agents.some(a => a.id === cleanHandle)) {
      setErrorMsg(`An agent with handle @${cleanHandle} already exists.`);
      return;
    }
    if (!name.trim()) {
      setErrorMsg('Please provide an agent name.');
      return;
    }
    if (!prompt.trim()) {
      setErrorMsg('Please provide a system persona prompt.');
      return;
    }

    onCreateAgent({
      id: cleanHandle,
      name: name.trim(),
      description: description.trim() || `Custom @${cleanHandle} agent.`,
      systemPrompt: prompt.trim(),
      color,
      safetyMode: 'ask',
      readMode,
      bashMode,
      writeMode,
      editMode,
      delegationMode,
      webSearchEnabled,
      codebaseIndexingEnabled,
      isSubagent,
      commandRules: deserializeRules(commandRules),
      readFileRules: deserializeRules(readRules),
      writeFileRules: deserializeRules(writeRules),
      editFileRules: deserializeRules(editRules),
      delegationRules: deserializeRules(delegationRules),
      isNative: false
    });

    setIsCreating(false);
  };

  return (
    <div className="agents-dashboard-container">
      {/* Left Sidebar */}
      <aside className="agents-sidebar">
        <div style={{ padding: '0 0 16px 0', borderBottom: '1px solid var(--border-color)', marginBottom: '16px' }}>
          <button 
            className="btn btn-sm" 
            onClick={onBack}
            style={{ width: '100%', justifyContent: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)' }}
          >
            <ArrowLeft size={14} />
            Back to Workspace
          </button>
        </div>
        <div className="sidebar-section">
          <h3>Native Agents</h3>
          <div className="agent-list">
            {nativeAgents.map(agent => {
              const agentColor = getAgentColor(agent);
              const isActive = !isCreating && selectedPersonaId === agent.id;
              return (
                <button
                  key={agent.id}
                  className={`agent-item ${isActive ? 'active' : ''}`}
                  onClick={() => selectAgent(agent.id)}
                  style={isActive ? {
                    background: `color-mix(in srgb, ${agentColor} 10%, transparent)`,
                    borderColor: `color-mix(in srgb, ${agentColor} 25%, transparent)`
                  } : undefined}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        width: '6px',
                        height: '6px',
                        borderRadius: '50%',
                        backgroundColor: agentColor,
                        boxShadow: `0 0 4px ${agentColor}`,
                        display: 'inline-block',
                        flexShrink: 0
                      }}
                    />
                    <span className="agent-handle" style={{ color: agentColor }}>@{agent.id}</span>
                  </div>
                  <span className="agent-name">{agent.name}</span>
                </button>
              );
            })}
          </div>
        </div>

          <div className="sidebar-section">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
              <h3>Custom Agents</h3>
              <button
                className={`icon-btn ${isCreating ? 'active' : ''}`}
                onClick={handleStartCreate}
                title="Create Custom Agent"
                style={{ width: '24px', height: '24px' }}
              >
                <Plus size={13} />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowGenerator(true)}
              style={{
                width: '100%',
                padding: '6px 10px',
                marginBottom: '8px',
                fontSize: '11px',
                textAlign: 'left',
                background: 'rgba(0, 123, 252, 0.06)',
                border: '1px solid rgba(0, 123, 252, 0.15)',
                borderRadius: 'var(--radius-sm)',
                color: 'var(--accent)',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                transition: 'background 0.15s',
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0, 123, 252, 0.12)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0, 123, 252, 0.06)'}
            >
              <Sparkles size={12} />
              Generate from Description
            </button>
          <div className="agent-list">
            {customAgents.length === 0 ? (
              <div className="empty-state">No custom agents.</div>
            ) : (
              customAgents.map(agent => {
                const agentColor = getAgentColor(agent);
                const isActive = !isCreating && selectedPersonaId === agent.id;
                return (
                  <button
                    key={agent.id}
                    className={`agent-item ${isActive ? 'active' : ''}`}
                    onClick={() => selectAgent(agent.id)}
                    style={isActive ? {
                      background: `color-mix(in srgb, ${agentColor} 10%, transparent)`,
                      borderColor: `color-mix(in srgb, ${agentColor} 25%, transparent)`
                    } : undefined}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <span
                        style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: agentColor,
                          boxShadow: `0 0 4px ${agentColor}`,
                          display: 'inline-block',
                          flexShrink: 0
                        }}
                      />
                      <span className="agent-handle" style={{ color: agentColor }}>@{agent.id}</span>
                    </div>
                    <span className="agent-name">{agent.name}</span>
                  </button>
                );
              })
            )}
          </div>
        </div>
      </aside>

      {/* Right Content Pane */}
      <main className="agents-main-content">
        {isCreating ? (
          <form onSubmit={handleSubmit} className="agent-details-container">
            <header className="details-header">
              <div style={{ flex: 1 }}>
                <h2>Create Custom Agent</h2>
                <p className="description">Configure prompt, global action modes, and pattern-matching permission rules carefully.</p>
              </div>
              <span className="badge custom" style={{
                color: color,
                background: `color-mix(in srgb, ${color} 12%, transparent)`,
                border: `1px solid color-mix(in srgb, ${color} 30%, transparent)`
              }}>New Agent</span>
            </header>

            {errorMsg && (
              <div className="read-only-banner" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', borderColor: 'var(--rose)', color: 'var(--rose)' }}>
                <ShieldAlert size={14} style={{ color: 'var(--rose)' }} />
                <span>{errorMsg}</span>
              </div>
            )}

            <div className="dashboard-grid">
              {/* Core Metadata */}
              <div className="dashboard-card card-full">
                <h3>Agent Information</h3>
                <div className="settings-controls-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <div className="control-group">
                    <label>Handle (e.g. workspace)</label>
                    <div style={{ display: 'flex', alignItems: 'center', position: 'relative' }}>
                      <span style={{ position: 'absolute', left: '10px', color: 'var(--text-muted)', fontSize: '13px' }}>@</span>
                      <input
                        type="text"
                        required
                        placeholder="handle"
                        value={handle}
                        onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, ''))}
                        className="input-field"
                        style={{ paddingLeft: '24px' }}
                      />
                    </div>
                  </div>
                  <div className="control-group">
                    <label>Agent Name</label>
                    <input
                      type="text"
                      required
                      placeholder="E.g. Code Reviewer"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="input-field"
                    />
                  </div>
                  
                  <div className="control-group" style={{ gridColumn: 'span 2' }}>
                    <label>Agent Color</label>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.02)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', width: 'fit-content' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        {['#06b6d4', '#a855f7', '#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#ec4899', '#64748b'].map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setColor(c)}
                            style={{
                              width: '20px',
                              height: '20px',
                              borderRadius: '50%',
                              backgroundColor: c,
                              border: color === c ? '2px solid var(--text-primary)' : '1px solid rgba(255,255,255,0.1)',
                              cursor: 'pointer',
                              padding: 0,
                              boxShadow: color === c ? `0 0 8px ${c}` : 'none',
                              transition: 'all 0.15s'
                            }}
                          />
                        ))}
                        <input
                          type="color"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          style={{
                            border: 'none',
                            width: '22px',
                            height: '22px',
                            padding: 0,
                            background: 'none',
                            cursor: 'pointer',
                            borderRadius: '50%',
                            marginLeft: '4px'
                          }}
                          title="Custom Color"
                        />
                        <input
                          type="text"
                          value={color}
                          onChange={(e) => setColor(e.target.value)}
                          className="input-field"
                          placeholder="#10b981"
                          style={{
                            width: '80px',
                            height: '24px',
                            fontSize: '11px',
                            padding: '2px 6px',
                            marginLeft: '8px'
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="control-group" style={{ gridColumn: 'span 2' }}>
                    <label>Description</label>
                    <input
                      type="text"
                      placeholder="Brief summary of what this agent does..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="input-field"
                    />
                  </div>
                </div>
              </div>

              {/* System Prompt */}
              <div className="dashboard-card card-full">
                <h3>System Persona Prompt</h3>
                <textarea
                  required
                  placeholder="Instructions instructing the model on its role, stack preference, and boundaries..."
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="input-field"
                  style={{ minHeight: '120px', resize: 'vertical' }}
                />
              </div>

              {/* Global Permissions */}
              <GlobalPermissions
                readMode={readMode} setReadMode={setReadMode}
                bashMode={bashMode} setBashMode={setBashMode}
                writeMode={writeMode} setWriteMode={setWriteMode}
                editMode={editMode} setEditMode={setEditMode}
                delegationMode={delegationMode} setDelegationMode={setDelegationMode}
              />

              {/* Integrations */}
              <div className="dashboard-card card-half">
                <h3>Integrations</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                  <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={webSearchEnabled}
                      onChange={(e) => setWebSearchEnabled(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: color }}
                    />
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px' }}>Web Search Access</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Allow agent to call Google Search for latest web content</span>
                    </div>
                  </label>
                  <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={codebaseIndexingEnabled}
                      onChange={(e) => setCodebaseIndexingEnabled(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: color }}
                    />
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px' }}>Automatic Codebase Indexing</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Generate and append a folder tree map to context</span>
                    </div>
                  </label>
                  <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                    <input
                      type="checkbox"
                      checked={isSubagent}
                      onChange={(e) => setIsSubagent(e.target.checked)}
                      style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: color }}
                    />
                    <div>
                      <strong style={{ display: 'block', fontSize: '13px' }}>Mark as Sub-agent Helper</strong>
                      <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Allows this persona to be invoked as a helper by other agents</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Rule Textareas */}
              <RuleEditors
                commandRules={commandRules} setCommandRules={setCommandRules}
                readRules={readRules} setReadRules={setReadRules}
                writeRules={writeRules} setWriteRules={setWriteRules}
                editRules={editRules} setEditRules={setEditRules}
                delegationRules={delegationRules} setDelegationRules={setDelegationRules}
                onOpenHelp={() => setShowHelp(true)}
              />
            </div>

            <footer style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', gap: '12px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => setIsCreating(false)}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                Create Agent
              </button>
            </footer>
          </form>
        ) : (
          activeAgent ? (
            <div className="agent-details-container">
              <header className="details-header" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', width: '100%' }}>
                  <div style={{ flex: 1 }}>
                    <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', margin: 0 }}>
                      <span
                        style={{
                          width: '12px',
                          height: '12px',
                          borderRadius: '50%',
                          backgroundColor: getAgentColor(activeAgent),
                          boxShadow: `0 0 10px ${getAgentColor(activeAgent)}`,
                          display: 'inline-block'
                        }}
                      />
                      <span style={{ color: getAgentColor(activeAgent) }}>@{activeAgent.id}</span>
                    </h2>
                    <p className="description" style={{ marginTop: '4px' }}>{activeAgent.description}</p>
                  </div>
                  <span
                    className={`badge ${activeAgent.isNative ? 'native' : 'custom'}`}
                    style={{
                      color: getAgentColor(activeAgent),
                      background: `color-mix(in srgb, ${getAgentColor(activeAgent)} 12%, transparent)`,
                      border: `1px solid color-mix(in srgb, ${getAgentColor(activeAgent)} 30%, transparent)`
                    }}
                  >
                    {activeAgent.isNative ? 'Native' : 'Custom'}
                  </span>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'rgba(255, 255, 255, 0.02)', padding: '6px 12px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)', width: 'fit-content' }}>
                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Agent Color:</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {['#06b6d4', '#a855f7', '#10b981', '#3b82f6', '#ef4444', '#f59e0b', '#ec4899', '#64748b'].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => onUpdateAgent(activeAgent.id, { color: c })}
                        style={{
                          width: '20px',
                          height: '20px',
                          borderRadius: '50%',
                          backgroundColor: c,
                          border: getAgentColor(activeAgent) === c ? '2px solid var(--text-primary)' : '1px solid rgba(255,255,255,0.1)',
                          cursor: 'pointer',
                          padding: 0,
                          boxShadow: getAgentColor(activeAgent) === c ? `0 0 8px ${c}` : 'none',
                          transition: 'all 0.15s'
                        }}
                      />
                    ))}
                    <input
                      type="color"
                      value={getAgentColor(activeAgent)}
                      onChange={(e) => onUpdateAgent(activeAgent.id, { color: e.target.value })}
                      style={{
                        border: 'none',
                        width: '22px',
                        height: '22px',
                        padding: 0,
                        background: 'none',
                        cursor: 'pointer',
                        borderRadius: '50%',
                        marginLeft: '4px'
                      }}
                      title="Custom Color"
                    />
                  </div>
                </div>
              </header>

              <div className="dashboard-grid">
                {/* System Prompt */}
                <div className="dashboard-card card-full">
                  <h3>System Persona Prompt</h3>
                  <textarea
                    placeholder="Instructions instructing the model on its role, stack preference, and boundaries..."
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    className="input-field"
                    style={{ minHeight: '120px', resize: 'vertical' }}
                  />
                </div>

                {/* Global Permissions */}
                <GlobalPermissions
                  readMode={activeAgent.readMode || 'allow'} 
                  setReadMode={(v) => onUpdateAgent(activeAgent.id, { readMode: v })}
                  bashMode={activeAgent.bashMode || 'allow'} 
                  setBashMode={(v) => onUpdateAgent(activeAgent.id, { bashMode: v })}
                  writeMode={activeAgent.writeMode || 'allow'} 
                  setWriteMode={(v) => onUpdateAgent(activeAgent.id, { writeMode: v })}
                  editMode={activeAgent.editMode || 'allow'} 
                  setEditMode={(v) => onUpdateAgent(activeAgent.id, { editMode: v })}
                  delegationMode={activeAgent.delegationMode || 'ask'} 
                  setDelegationMode={(v) => onUpdateAgent(activeAgent.id, { delegationMode: v })}
                />

                {/* Integrations */}
                <div className="dashboard-card card-half">
                  <h3>Integrations</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', marginTop: '10px' }}>
                    <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={activeAgent.webSearchEnabled ?? false}
                        onChange={(e) => onUpdateAgent(activeAgent.id, { webSearchEnabled: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: getAgentColor(activeAgent) }}
                      />
                      <div>
                        <strong style={{ display: 'block', fontSize: '13px' }}>Web Search Access</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Allow agent to call Google Search for latest web content</span>
                      </div>
                    </label>
                    <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={activeAgent.codebaseIndexingEnabled ?? false}
                        onChange={(e) => onUpdateAgent(activeAgent.id, { codebaseIndexingEnabled: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: getAgentColor(activeAgent) }}
                      />
                      <div>
                        <strong style={{ display: 'block', fontSize: '13px' }}>Automatic Codebase Indexing</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Generate and append a folder tree map to context</span>
                      </div>
                    </label>
                    <label className="toggle-label" style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}>
                      <input
                        type="checkbox"
                        checked={activeAgent.isSubagent ?? false}
                        onChange={(e) => onUpdateAgent(activeAgent.id, { isSubagent: e.target.checked })}
                        style={{ width: '18px', height: '18px', cursor: 'pointer', accentColor: getAgentColor(activeAgent) }}
                      />
                      <div>
                        <strong style={{ display: 'block', fontSize: '13px' }}>Mark as Sub-agent Helper</strong>
                        <span style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>Allows this persona to be invoked as a helper by other agents</span>
                      </div>
                    </label>
                  </div>
                </div>

                {/* Rule Textareas */}
                <RuleEditors
                  commandRules={serializeRules(activeAgent.commandRules)}
                  setCommandRules={(v) => onUpdateAgent(activeAgent.id, { commandRules: deserializeRules(v) })}
                  readRules={serializeRules(activeAgent.readFileRules || [])}
                  setReadRules={(v) => onUpdateAgent(activeAgent.id, { readFileRules: deserializeRules(v) })}
                  writeRules={serializeRules(activeAgent.writeFileRules)}
                  setWriteRules={(v) => onUpdateAgent(activeAgent.id, { writeFileRules: deserializeRules(v) })}
                  editRules={serializeRules(activeAgent.editFileRules || [])}
                  setEditRules={(v) => onUpdateAgent(activeAgent.id, { editFileRules: deserializeRules(v) })}
                  delegationRules={serializeRules(activeAgent.delegationRules || [])}
                  setDelegationRules={(v) => onUpdateAgent(activeAgent.id, { delegationRules: deserializeRules(v) })}
                  onOpenHelp={() => setShowHelp(true)}
                />
              </div>

              {activeAgent.isNative ? (
                <footer style={{ marginTop: '24px', display: 'flex', justifyContent: 'flex-end', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => onResetAgent(activeAgent.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <RotateCcw size={15} />
                    <span>Reset to Default</span>
                  </button>
                </footer>
              ) : (
                <footer style={{ marginTop: '24px', display: 'flex', justifyContent: 'space-between', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={() => onDeleteAgent(activeAgent.id)}
                    style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
                  >
                    <Trash2 size={15} />
                    <span>Delete Custom Agent</span>
                  </button>
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={() => {
                      onUpdateAgent(activeAgent.id, {
                        systemPrompt: editPrompt,
                        readMode,
                        bashMode,
                        writeMode,
                        editMode,
                        delegationMode,
                        webSearchEnabled,
                        codebaseIndexingEnabled,
                        isSubagent,
                        commandRules: deserializeRules(commandRules),
                        readFileRules: deserializeRules(readRules),
                        writeFileRules: deserializeRules(writeRules),
                        editFileRules: deserializeRules(editRules),
                        delegationRules: deserializeRules(delegationRules)
                      });
                    }}
                  >
                    Save Persona Changes
                  </button>
                </footer>
              )}
            </div>
          ) : (
            <div className="no-agent-selected">Select an agent from the sidebar to inspect permissions.</div>
          )
        )}
      </main>

      {showHelp && <RuleHelpPopup onClose={() => setShowHelp(false)} />}

      {showGenerator && (
        <AgentGenerator
          apiKey={apiKey}
          onGenerated={(agent) => {
            onCreateAgent(agent);
            setShowGenerator(false);
          }}
          onClose={() => setShowGenerator(false)}
        />
      )}
    </div>
  );
}
