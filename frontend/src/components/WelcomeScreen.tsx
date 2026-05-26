import { Cpu, Search, ShieldCheck, Zap } from 'lucide-react';

interface WelcomeScreenProps {
  onPromptClick: (prompt: string) => void;
}

export default function WelcomeScreen({ onPromptClick }: WelcomeScreenProps) {
  const suggestions = [
    { text: 'Use @explorer to map this codebase structure', icon: <Search size={14} /> },
    { text: 'Ask @reviewer to audit my recent changes', icon: <ShieldCheck size={14} /> },
    { text: 'Explain how the WebSocket orchestration works', icon: <Cpu size={14} /> },
    { text: 'Run a diagnostic build in the frontend', icon: <Zap size={14} /> }
  ];

  return (
    <div className="welcome-container">
      <div className="logo-wrapper">
        <img src="/spine_logo.png" className="welcome-logo-img spine-brand" alt="SPINE" />
        <span className="logo-divider">+</span>
        <img src="/backboard_logo.png" className="welcome-logo-img backboard-brand" alt="Backboard" />
      </div>
      
      <h1 className="welcome-title">A harness that remembers.</h1>
      <p className="welcome-subtitle">
        Orchestrate specialized agents and modify your codebase with transparent safety boundaries — powered by Backboard's living memory.
      </p>

      <div className="welcome-prompts" style={{ marginTop: '24px' }}>
        {suggestions.map((suggestion) => (
          <button
            key={suggestion.text}
            className="prompt-chip"
            onClick={() => onPromptClick(suggestion.text)}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 20px' }}
          >
            {suggestion.icon}
            {suggestion.text}
          </button>
        ))}
      </div>
    </div>
  );
}
