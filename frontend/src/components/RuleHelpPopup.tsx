import { useRef, useEffect } from 'react';
import { X, HelpCircle, Code, Shield, Terminal } from 'lucide-react';

interface RuleHelpPopupProps {
  onClose: () => void;
}

export default function RuleHelpPopup({ onClose }: RuleHelpPopupProps) {
  const popupRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (popupRef.current && !popupRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  return (
    <div className="rule-help-overlay" style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000,
      padding: '20px'
    }}>
      <div className="rule-help-content" ref={popupRef} style={{
        background: 'var(--bg-secondary)',
        border: '1px solid var(--border-color)',
        borderRadius: '12px',
        width: '100%',
        maxWidth: '600px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column'
      }}>
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          background: 'rgba(255,255,255,0.02)'
        }}>
          <h2 style={{ fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', margin: 0 }}>
            <HelpCircle size={20} className="text-accent" />
            Rule Syntax Guide
          </h2>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <section>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Code size={16} /> Syntax Pattern
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-secondary)', lineHeight: '1.5' }}>
              Rules follow the <code>pattern: action</code> format. Each rule must be on a new line.
              Lines starting with <code>#</code> are ignored (comments).
            </p>
            <div style={{ background: 'var(--bg-primary)', padding: '12px', borderRadius: '6px', border: '1px solid var(--border-color)', marginTop: '8px' }}>
              <code style={{ fontSize: '12px', color: 'var(--accent)' }}>
                # This is a comment<br/>
                src/**/*.ts: allow<br/>
                *.env: deny<br/>
                npm install: ask
              </code>
            </div>
          </section>

          <section>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Shield size={16} /> Valid Actions
            </h3>
            <ul style={{ fontSize: '13px', color: 'var(--text-secondary)', display: 'flex', flexDirection: 'column', gap: '10px', paddingLeft: '20px' }}>
              <li><strong><code>allow</code></strong>: The agent can perform the action without asking.</li>
              <li><strong><code>ask</code></strong>: The agent must request your explicit permission via a UI prompt.</li>
              <li><strong><code>deny</code></strong>: The action is automatically blocked without notifying you.</li>
            </ul>
          </section>

          <section>
            <h3 style={{ fontSize: '14px', fontWeight: 600, marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Terminal size={16} /> Matching Rules
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ fontSize: '13px' }}>
                <code style={{ color: 'var(--amber)' }}>*</code> Matches anything except directory separators (<code>/</code>).
              </div>
              <div style={{ fontSize: '13px' }}>
                <code style={{ color: 'var(--amber)' }}>**</code> Matches any number of directories and files recursively.
              </div>
              <div style={{ fontSize: '13px' }}>
                <code style={{ color: 'var(--amber)' }}>?</code> Matches exactly one character.
              </div>
            </div>
          </section>

          <div style={{ 
            background: 'rgba(6, 182, 212, 0.05)', 
            border: '1px solid rgba(6, 182, 212, 0.2)', 
            padding: '12px', 
            borderRadius: '8px',
            fontSize: '12px',
            lineHeight: '1.4',
            color: 'var(--cyan)'
          }}>
            <strong>Pro Tip:</strong> Rules are evaluated from bottom to top. The first rule that matches the path or command determines the action. If no rules match, the <strong>Global Action Mode</strong> is used as a fallback.
          </div>
        </div>

        <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary" onClick={onClose}>Got it</button>
        </div>
      </div>
    </div>
  );
}
