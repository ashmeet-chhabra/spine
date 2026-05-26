import { useState } from 'react';
import { Sparkles, Loader2, X } from 'lucide-react';
import type { PersonaProfile } from '../types/messages';

interface GeneratedAgentData {
  name: string;
  handle: string;
  description: string;
  systemPrompt: string;
  readMode: 'allow' | 'ask' | 'deny';
  writeMode: 'allow' | 'ask' | 'deny';
  editMode: 'allow' | 'ask' | 'deny';
  bashMode: 'allow' | 'ask' | 'deny';
  delegationMode: 'allow' | 'ask' | 'deny';
  webSearchEnabled: boolean;
  codebaseIndexingEnabled: boolean;
}

interface AgentGeneratorProps {
  apiKey: string;
  onGenerated: (agent: PersonaProfile) => void;
  onClose: () => void;
}

export default function AgentGenerator({ apiKey, onGenerated, onClose }: AgentGeneratorProps) {
  const [description, setDescription] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState('');

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description.trim()) return;

    setIsGenerating(true);
    setError('');

    try {
      const host = window.location.hostname || 'localhost';
      const res = await fetch(`http://${host}:3001/api/generate-agent`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: description.trim(), apiKey })
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to generate agent');
      }

      const gen: GeneratedAgentData = data.agent;
      const newAgent: PersonaProfile = {
        id: gen.handle,
        name: gen.name,
        description: gen.description || `Custom @${gen.handle} agent.`,
        systemPrompt: gen.systemPrompt,
        color: '#10b981',
        safetyMode: 'ask',
        readMode: gen.readMode || 'allow',
        writeMode: gen.writeMode || 'ask',
        editMode: gen.editMode || 'ask',
        bashMode: gen.bashMode || 'ask',
        delegationMode: gen.delegationMode || 'ask',
        webSearchEnabled: gen.webSearchEnabled ?? false,
        codebaseIndexingEnabled: gen.codebaseIndexingEnabled ?? false,
        isSubagent: false,
        commandRules: [{ pattern: '*', action: gen.bashMode || 'ask' }],
        readFileRules: [{ pattern: '*', action: gen.readMode || 'allow' }],
        writeFileRules: [{ pattern: '*', action: gen.writeMode || 'ask' }],
        editFileRules: [{ pattern: '*', action: gen.editMode || 'ask' }],
        delegationRules: [{ pattern: '*', action: gen.delegationMode || 'ask' }],
        isNative: false,
      };

      onGenerated(newAgent);
    } catch (err: any) {
      setError(err.message || 'Generation failed. Check your API key and try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div
      className="settings-modal-backdrop"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
    >
      <div
        className="dashboard-card card-full"
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '520px',
          maxWidth: '90vw',
          padding: '24px',
          backgroundColor: 'var(--bg-tertiary)',
          border: '1px solid var(--border-color)',
          borderRadius: 'var(--radius-lg)',
          boxShadow: 'var(--shadow-lg)',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: 0, fontSize: '16px' }}>
              <Sparkles size={18} style={{ color: 'var(--accent)' }} />
              Generate Agent from Description
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '6px', lineHeight: '1.5' }}>
              Describe the agent you want — SPINE will use Backboard to generate a name, handle, system prompt, and permission settings.
            </p>
          </div>
          <button
            type="button"
            className="icon-btn"
            onClick={onClose}
            style={{ width: '28px', height: '28px', flexShrink: 0 }}
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleGenerate} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          <textarea
            placeholder="e.g. An agent that audits TypeScript files for unused exports and suggests deletions..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input-field"
            style={{
              minHeight: '100px',
              resize: 'vertical',
              fontSize: '13px',
              lineHeight: '1.5',
            }}
            autoFocus
            disabled={isGenerating}
          />

          {error && (
            <div
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--radius-sm)',
                fontSize: '12px',
                backgroundColor: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid rgba(239, 68, 68, 0.2)',
                color: 'var(--rose)',
              }}
            >
              {error}
            </div>
          )}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '4px' }}>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={onClose}
              disabled={isGenerating}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isGenerating || !description.trim()}
              style={{ display: 'flex', alignItems: 'center', gap: '6px' }}
            >
              {isGenerating ? (
                <>
                  <Loader2 size={14} className="spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  Generate Agent
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
