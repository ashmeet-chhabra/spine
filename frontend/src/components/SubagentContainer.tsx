import { useState } from 'react';
import { ChevronDown, ChevronRight, Cpu, CheckCircle2, Loader2 } from 'lucide-react';
import { getAgentColor, type SubagentRun } from '../types/messages';
import { renderMarkdown } from '../utils/markdown';

interface SubagentContainerProps {
  run: SubagentRun;
}

export default function SubagentContainer({ run }: SubagentContainerProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const agentColor = getAgentColor(null, run.subAgentId);

  return (
    <div className="subagent-container" style={{
      border: `1px solid ${agentColor}25`,
      background: 'var(--color-phantom)',
      borderRadius: '10px',
      margin: '16px 0',
      overflow: 'hidden',
      boxShadow: 'var(--shadow-sm)'
    }}>
      <div 
        className="subagent-header"
        onClick={() => setIsExpanded(!isExpanded)}
        style={{
          padding: '10px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          cursor: 'pointer',
          borderBottom: isExpanded ? `1px solid ${agentColor}15` : 'none',
          userSelect: 'none',
          background: `${agentColor}08`
        }}
      >
        {isExpanded ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
        <Cpu size={14} style={{ color: agentColor }} />
        <span style={{ fontSize: '12px', fontWeight: 700, color: agentColor, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
          Deployed @{run.subAgentId}
        </span>
        <div style={{ flex: 1 }} />
        {run.status === 'running' ? (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: agentColor, opacity: 0.8, fontWeight: 600 }}>ACTIVE</span>
            <Loader2 size={12} className="spin" style={{ color: agentColor, opacity: 0.6 }} />
          </div>
        ) : (
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontSize: '10px', color: 'var(--emerald)', opacity: 0.8, fontWeight: 600 }}>COMPLETED</span>
            <CheckCircle2 size={12} style={{ color: 'var(--emerald)', opacity: 0.8 }} />
          </div>
        )}
      </div>

      {isExpanded && (
        <div className="subagent-body" style={{
          maxHeight: '400px',
          overflowY: 'auto',
          padding: '16px',
          fontSize: '13.5px',
          lineHeight: '1.6'
        }}>
          {run.reasoning && (
            <div className="subagent-reasoning" style={{
              color: 'var(--text-muted)',
              fontStyle: 'normal',
              marginBottom: '16px',
              borderLeft: `3px solid ${agentColor}40`,
              paddingLeft: '12px',
              fontSize: '12.5px',
              background: 'rgba(0,0,0,0.1)',
              padding: '10px 12px'
            }}>
              <div style={{ fontSize: '10px', fontWeight: 800, color: agentColor, marginBottom: '4px', textTransform: 'uppercase' }}>Sub-Agent Reasoning:</div>
              {run.reasoning}
            </div>
          )}
          <div className="subagent-content" style={{ color: 'var(--color-cloud)' }}>
            {renderMarkdown(run.content)}
          </div>
        </div>
      )}
    </div>
  );
}
