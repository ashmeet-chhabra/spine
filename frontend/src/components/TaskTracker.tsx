import { ListTodo, CheckCircle2, Circle, Loader2, AlertCircle } from 'lucide-react';
import type { Task } from '../types/messages';

interface TaskTrackerProps {
  tasks: Task[];
}

export default function TaskTracker({ tasks }: TaskTrackerProps) {
  const completedCount = tasks.filter(t => t.status === 'completed').length;
  const progress = tasks.length > 0 ? Math.round((completedCount / tasks.length) * 100) : 0;

  return (
    <div className="task-tracker-container" style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <div className="sidebar-header" style={{ borderBottom: 'none' }}>
        <h3>Task Checklist</h3>
        {tasks.length > 0 && (
          <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--color-brand-blue)' }}>
            {completedCount}/{tasks.length}
          </span>
        )}
      </div>

      {tasks.length > 0 && (
        <div style={{ padding: '0 20px 16px' }}>
          <div style={{ height: '4px', background: 'var(--border-color)', borderRadius: '2px', overflow: 'hidden' }}>
            <div 
              style={{ 
                height: '100%', 
                width: `${progress}%`, 
                background: 'var(--color-brand-blue)',
                transition: 'width 0.3s ease'
              }} 
            />
          </div>
        </div>
      )}

      <div className="task-list" style={{ flex: 1, overflowY: 'auto', padding: '0 12px 20px' }}>
          {tasks.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: 'var(--text-muted)' }}>
              <ListTodo size={32} style={{ marginBottom: '12px', opacity: 0.2 }} />
              <p style={{ fontSize: '12px' }}>No active tasks. Ask @planner to draft a roadmap!</p>
            </div>
          ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            {tasks.map((task) => (
              <div 
                key={task.id} 
                className={`task-item ${task.status}`}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '10px',
                  padding: '10px 12px',
                  borderRadius: '8px',
                  background: task.status === 'in-progress' ? 'rgba(0, 123, 252, 0.05)' : 'transparent',
                  transition: 'all 0.2s ease'
                }}
              >
                <div style={{ marginTop: '2px' }}>
                  {task.status === 'completed' && <CheckCircle2 size={15} style={{ color: 'var(--emerald)' }} />}
                  {task.status === 'in-progress' && <Loader2 size={15} className="spin" style={{ color: 'var(--color-brand-blue)' }} />}
                  {task.status === 'todo' && <Circle size={15} style={{ color: 'var(--color-space)' }} />}
                  {task.status === 'failed' && <AlertCircle size={15} style={{ color: 'var(--rose)' }} />}
                </div>
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  <span style={{ 
                    fontSize: '13px', 
                    color: task.status === 'completed' ? 'var(--text-muted)' : 'var(--color-cloud)',
                    textDecoration: task.status === 'completed' ? 'line-through' : 'none',
                    lineHeight: '1.4'
                  }}>
                    {task.title}
                  </span>
                  {task.agentId && (
                    <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-brand-blue)', opacity: 0.8, textTransform: 'uppercase' }}>
                      @{task.agentId}
                    </span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
