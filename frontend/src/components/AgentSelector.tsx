import { useRef, useEffect } from 'react';
import { type PersonaProfile, getAgentColor } from '../types/messages';

interface AgentSelectorMenuProps {
  agents: PersonaProfile[];
  selectedPersonaId: string;
  onSelectAgent: (id: string) => void;
  onClose: () => void;
}

export function AgentSelectorMenu({
  agents,
  selectedPersonaId,
  onSelectAgent,
  onClose
}: AgentSelectorMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const nativeAgents = agents.filter(a => a.isNative);
  const customAgents = agents.filter(a => !a.isNative);

  return (
    <div className="agent-selector-menu" ref={menuRef}>
      <div className="menu-section-header">Native Agents</div>
      <div className="menu-list">
        {nativeAgents.map((agent) => {
          const agentColor = getAgentColor(agent);
          const isActive = selectedPersonaId === agent.id;
          return (
            <button
              key={agent.id}
              type="button"
              className={`menu-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                onSelectAgent(agent.id);
              }}
              style={isActive ? {
                color: agentColor,
                background: `color-mix(in srgb, ${agentColor} 10%, transparent)`
              } : undefined}
            >
              <div className="menu-item-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span
                  style={{
                    width: '8px',
                    height: '8px',
                    borderRadius: '50%',
                    backgroundColor: agentColor,
                    boxShadow: `0 0 6px ${agentColor}`,
                    display: 'inline-block',
                    flexShrink: 0
                  }}
                />
                <div className="menu-item-text">
                  <span className="menu-item-handle" style={{ color: agentColor }}>@{agent.id}</span>
                  <span className="menu-item-name">{agent.name}</span>
                </div>
              </div>
            </button>
          );
        })}
      </div>

      <div className="menu-divider" />

      <div className="menu-section-header">Custom Agents</div>
      <div className="menu-list">
        {customAgents.length === 0 ? (
          <div className="menu-empty-state">No custom agents yet — create one in the Agents panel.</div>
        ) : (
          customAgents.map((agent) => {
            const agentColor = getAgentColor(agent);
            const isActive = selectedPersonaId === agent.id;
            return (
              <button
                key={agent.id}
                type="button"
                className={`menu-item ${isActive ? 'active' : ''}`}
                onClick={() => {
                  onSelectAgent(agent.id);
                }}
                style={isActive ? {
                  color: agentColor,
                  background: `color-mix(in srgb, ${agentColor} 10%, transparent)`
                } : undefined}
              >
                <div className="menu-item-left" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span
                    style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: agentColor,
                      boxShadow: `0 0 6px ${agentColor}`,
                      display: 'inline-block',
                      flexShrink: 0
                    }}
                  />
                  <div className="menu-item-text">
                    <span className="menu-item-handle" style={{ color: agentColor }}>@{agent.id}</span>
                    <span className="menu-item-name">{agent.name}</span>
                  </div>
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}

