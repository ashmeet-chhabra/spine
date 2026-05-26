import { HelpCircle } from 'lucide-react';

interface RuleEditorsProps {
  commandRules: string;
  setCommandRules: (v: string) => void;
  readRules: string;
  setReadRules: (v: string) => void;
  writeRules: string;
  setWriteRules: (v: string) => void;
  editRules: string;
  setEditRules: (v: string) => void;
  delegationRules: string;
  setDelegationRules: (v: string) => void;
  onOpenHelp: () => void;
}

export default function RuleEditors({
  commandRules, setCommandRules,
  readRules, setReadRules,
  writeRules, setWriteRules,
  editRules, setEditRules,
  delegationRules, setDelegationRules,
  onOpenHelp
}: RuleEditorsProps) {
  return (
    <div className="dashboard-card card-full">
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
        <h3 style={{ margin: 0 }}>Granular Path & Command Pattern Rules</h3>
        <button 
          type="button" 
          className="icon-btn" 
          onClick={onOpenHelp}
          title="View Rule Syntax Guide"
          style={{ padding: '4px', background: 'none', border: 'none', cursor: 'pointer', opacity: 0.6 }}
        >
          <HelpCircle size={14} style={{ color: 'var(--accent)' }} />
        </button>
      </div>
      <p className="info-text" style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '14px' }}>
        Configure rules as `pattern: action` (e.g. `*.env: deny`). Bottom-most rules override top rules.
      </p>

      <div className="rule-editor-grid">
        <EditorGroup label="Command Execution Rules" value={commandRules} onChange={setCommandRules} placeholder="*: ask&#10;git status: allow" />
        <EditorGroup label="File Reading Rules" value={readRules} onChange={setReadRules} placeholder="*: allow&#10;secret.json: deny" />
        <EditorGroup label="File Writing Rules (Create)" value={writeRules} onChange={setWriteRules} placeholder="*: ask&#10;.spine/plans/**: allow" />
        <EditorGroup label="File Editing Rules (Modify)" value={editRules} onChange={setEditRules} placeholder="*: ask&#10;src/**: allow" />
        <EditorGroup label="Delegation Rules" value={delegationRules} onChange={setDelegationRules} placeholder="*: ask&#10;explorer: allow" />
      </div>
    </div>
  );
}

function EditorGroup({ label, value, onChange, placeholder }: { label: string, value: string, onChange: (v: string) => void, placeholder: string }) {
  return (
    <div className="editor-group" style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
      <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="input-field"
        style={{ minHeight: '100px', resize: 'vertical', fontFamily: 'var(--mono)', fontSize: '11px', lineHeight: '1.4' }}
      />
    </div>
  );
}
