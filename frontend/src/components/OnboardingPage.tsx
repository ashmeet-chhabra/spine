import React, { useState } from 'react';
import { Shield, Cpu, Zap, Key, User, ArrowRight, Database } from 'lucide-react';

interface OnboardingPageProps {
  onComplete: (profile: { name: string; backboardKey: string; providerKeys: Record<string, string> }) => void;
}

export default function OnboardingPage({ onComplete }: OnboardingPageProps) {
  const [step, setStep] = useState(1);
  const [name, setName] = useState('');
  const [backboardKey, setBackboardKey] = useState('');
  const [providerKeys, setProviderKeys] = useState<Record<string, string>>({});

  const handleNext = () => {
    if (step < 3) setStep(step + 1);
    else onComplete({ name, backboardKey, providerKeys });
  };

  return (
    <div className="onboarding-page">
      <div className="onboarding-card">
        {/* Left: Branding & USP */}
        <div className="onboarding-left">
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '8px' }}>
              <img src="/spine_logo.png" style={{ height: '32px', filter: 'invert(1)' }} alt="SPINE" />
              <span style={{ fontSize: '18px', fontWeight: 300, opacity: 0.5 }}>+</span>
              <img src="/backboard_logo.png" style={{ height: '28px' }} alt="Backboard" />
            </div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, letterSpacing: '-0.5px' }}>A harness that remembers.</h1>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <USPItem 
              icon={<Shield size={18} />} 
              title="Transparent Safety" 
              desc="Build confidently with granular permissions. Take your agents for a walk (or speed-run), not the reverse - powered by Backboard.io." 
            />
            <USPItem 
              icon={<Cpu size={18} />} 
              title="Specialized Multi-Agent" 
              desc="Orchestrate experts like @explorer and @reviewer for surgical precision." 
            />
            <USPItem 
              icon={<Database size={18} />} 
              title="Living Memory" 
              desc="A dynamic alternative to maintaining static AGENTS.md rules files. SPINE learns guidelines, code decisions, and setup preferences as you work - powered by Backboard.io." 
            />
            <USPItem 
              icon={<Zap size={18} />} 
              title="Realtime Voice" 
              desc="Zero-latency streaming voice interaction that feels like natural collaboration." 
            />
          </div>
        </div>

        {/* Right: Steps */}
        <div className="onboarding-right">
          <div style={{ display: 'flex', gap: '8px', marginBottom: '32px' }}>
            <div className={`step-indicator-bar ${step >= 1 ? 'active' : ''}`} />
            <div className={`step-indicator-bar ${step >= 2 ? 'active' : ''}`} />
            <div className={`step-indicator-bar ${step >= 3 ? 'active' : ''}`} />
          </div>

          {step === 1 && (
            <div className="onboarding-step">
              <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Name your Profile</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Profiles are collections of settings and permissions. You can create different ones for different projects.
              </p>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <User size={14} /> Profile Name
                </label>
                <input 
                  autoFocus
                  className="input-field" 
                  style={{ padding: '12px', fontSize: '16px' }}
                  placeholder="e.g. My Autonomous Setup"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && name.trim() && handleNext()}
                />
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="onboarding-step">
              <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Backboard Engine</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                SPINE uses Backboard to orchestrate models and manage long-term agent memory.
              </p>
              <div className="form-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Key size={14} /> Backboard API Key
                </label>
                <input 
                  autoFocus
                  type="password"
                  className="input-field" 
                  style={{ padding: '12px', fontSize: '16px' }}
                  placeholder="bk-..."
                  value={backboardKey}
                  onChange={e => setBackboardKey(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && backboardKey.trim() && handleNext()}
                />
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="onboarding-step">
              <h2 style={{ fontSize: '20px', marginBottom: '8px' }}>Provider Keys (Optional)</h2>
              <p style={{ fontSize: '14px', color: 'var(--text-secondary)', marginBottom: '24px' }}>
                Add your own provider keys for BYOK (Bring Your Own Key) mode.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                <ProviderKeyInput 
                  label="Anthropic Key" 
                  value={providerKeys.anthropic || ''} 
                  onChange={val => setProviderKeys({...providerKeys, anthropic: val})} 
                />
                <ProviderKeyInput 
                  label="OpenAI Key" 
                  value={providerKeys.openai || ''} 
                  onChange={val => setProviderKeys({...providerKeys, openai: val})} 
                />
                <ProviderKeyInput 
                  label="Google Gemini Key" 
                  value={providerKeys.google || ''} 
                  onChange={val => setProviderKeys({...providerKeys, google: val})} 
                />
              </div>
            </div>
          )}

          <div style={{ marginTop: 'auto', display: 'flex', justifyContent: 'flex-end' }}>
            <button 
              className="btn btn-primary" 
              onClick={handleNext}
              disabled={ (step === 1 && !name.trim()) || (step === 2 && !backboardKey.trim()) }
              style={{ padding: '12px 24px', borderRadius: '12px', fontSize: '15px' }}
            >
              {step === 3 ? 'Get Started' : 'Next'} <ArrowRight size={16} style={{ marginLeft: '8px' }} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function USPItem({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="usp-item">
      <div className="usp-icon">
        {icon}
      </div>
      <div>
        <h4 style={{ fontSize: '14px', fontWeight: 700, marginBottom: '2px' }}>{title}</h4>
        <p style={{ fontSize: '12px', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{desc}</p>
      </div>
    </div>
  );
}

function ProviderKeyInput({ label, value, onChange }: { label: string, value: string, onChange: (v: string) => void }) {
  return (
    <div className="form-group">
      <label style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', opacity: 0.6 }}>{label}</label>
      <input 
        type="password"
        className="input-field" 
        style={{ padding: '8px 12px' }}
        placeholder="Optional"
        value={value}
        onChange={e => onChange(e.target.value)}
      />
    </div>
  );
}
