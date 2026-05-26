import { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Save, Loader2, Check, AlertCircle } from 'lucide-react';

// Configure Monaco to use custom theme
const defineSpineTheme = (monaco: any) => {
  monaco.editor.defineTheme('spine-dark', {
    base: 'vs-dark',
    inherit: true,
    rules: [
      { token: '', foreground: 'EDEFF7', background: '00051B' }, // Cloud on Navy Black
      { token: 'comment', foreground: '6E7180', fontStyle: 'italic' }, // Graphite
      { token: 'keyword', foreground: '007BFC', fontStyle: 'bold' }, // Brand Blue
      { token: 'string', foreground: '7dd9a8' },
      { token: 'number', foreground: 'f0c870' },
      { token: 'type', foreground: 'BCBFCC' }, // Steel
      { token: 'function', foreground: '007BFC' }, // Brand Blue
    ],
    colors: {
      'editor.background': '#00051B', // Navy Black
      'editor.foreground': '#EDEFF7', // Cloud
      'editor.lineHighlightBackground': '#FFFFFF05',
      'editorCursor.foreground': '#007BFC', // Brand Blue
      'editorWhitespace.foreground': '#9DA2B320', // Space
      'editorIndentGuide.background': '#40424D', // Arsenic
      'editorIndentGuide.activeBackground': '#007BFC', // Brand Blue
      'editor.selectionBackground': '#007BFC30',
      'editorLineNumber.foreground': '#40424D', // Arsenic
      'editorLineNumber.activeForeground': '#EDEFF7', // Cloud
      'editorWidget.background': '#1E1E24', // Phantom
      'editorWidget.border': '#40424D', // Arsenic
    }
  });
};

interface FileEditorProps {
  path: string;
  onSave?: () => void;
}

export default function FileEditor({ path, onSave }: FileEditorProps) {
  const [content, setContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastSavedContent, setLastSavedContent] = useState<string>('');
  const [showSavedToast, setShowSavedToast] = useState(false);

  const fetchContent = async () => {
    setLoading(true);
    setError(null);
    try {
      const host = window.location.hostname || 'localhost';
      const res = await fetch(`http://${host}:3001/api/file/read?path=${encodeURIComponent(path)}`);
      const data = await res.json();
      if (data.content !== undefined) {
        setContent(data.content);
        setLastSavedContent(data.content);
      } else {
        throw new Error(data.error || 'Failed to read file');
      }
    } catch (err: any) {
      console.error('Error reading file:', err);
      setError(err.message || 'Failed to read file');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContent();
  }, [path]);

  const handleSave = async () => {
    if (saving) return;
    setSaving(true);
    setError(null);
    try {
      const host = window.location.hostname || 'localhost';
      const res = await fetch(`http://${host}:3001/api/file/write`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path, content })
      });
      const data = await res.json();
      if (data.success) {
        setLastSavedContent(content);
        setShowSavedToast(true);
        setTimeout(() => setShowSavedToast(false), 2000);
        if (onSave) onSave();
      } else {
        throw new Error(data.error || 'Failed to save file');
      }
    } catch (err: any) {
      console.error('Error saving file:', err);
      setError(err.message || 'Failed to save file');
    } finally {
      setSaving(false);
    }
  };

  const isDirty = content !== lastSavedContent;

  const getLanguage = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx': return 'javascript';
      case 'ts':
      case 'tsx': return 'typescript';
      case 'html': return 'html';
      case 'css': return 'css';
      case 'json': return 'json';
      case 'md': return 'markdown';
      case 'py': return 'python';
      default: return 'plaintext';
    }
  };

  if (loading) {
    return (
      <div className="file-editor-container" style={{ alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)' }}>
        <Loader2 size={32} className="spin" style={{ marginBottom: '16px' }} />
        <p>Loading {path}...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="file-editor-container" style={{ alignItems: 'center', justifyContent: 'center', color: 'var(--rose)', padding: '20px', textAlign: 'center' }}>
        <AlertCircle size={32} style={{ marginBottom: '16px' }} />
        <h3>Error Loading File</h3>
        <p>{error}</p>
        <button className="btn btn-sm" onClick={fetchContent} style={{ marginTop: '16px' }}>
          Retry
        </button>
      </div>
    );
  }

  return (
    <div className="file-editor-container" style={{ position: 'relative' }}>
      <div style={{ flex: 1, overflow: 'hidden' }}>
        <Editor
          height="100%"
          language={getLanguage(path)}
          theme="spine-dark"
          value={content}
          beforeMount={defineSpineTheme}
          onChange={(value) => setContent(value || '')}
          options={{
            fontSize: 13,
            fontFamily: 'var(--mono)',
            minimap: { enabled: true },
            scrollBeyondLastLine: false,
            automaticLayout: true,
            padding: { top: 16, bottom: 16 },
            renderLineHighlight: 'all',
            scrollbar: {
              vertical: 'auto',
              horizontal: 'auto'
            }
          }}
          onMount={(editor, monaco) => {
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
              handleSave();
            });
          }}
        />
      </div>

      {/* Floating Save Button & Status */}
      <div style={{ 
        position: 'absolute', 
        bottom: '24px', 
        right: '24px', 
        display: 'flex', 
        alignItems: 'center', 
        gap: '12px',
        zIndex: 10
      }}>
        {showSavedToast && (
          <div style={{ 
            fontSize: '11px', 
            color: 'var(--emerald)', 
            background: 'rgba(16, 185, 129, 0.1)', 
            padding: '4px 10px', 
            borderRadius: '99px',
            border: '1px solid rgba(16, 185, 129, 0.2)',
            backdropFilter: 'blur(8px)',
            display: 'flex', 
            alignItems: 'center', 
            gap: '4px' 
          }}>
            <Check size={12} /> Saved
          </div>
        )}
        <button 
          className={`btn btn-sm ${isDirty ? 'btn-primary' : ''}`} 
          onClick={handleSave}
          disabled={!isDirty || saving}
          style={{ 
            height: '36px', 
            padding: '0 16px',
            fontSize: '12px', 
            gap: '8px',
            boxShadow: isDirty ? '0 4px 12px rgba(0, 123, 252, 0.3)' : 'none',
            opacity: isDirty ? 1 : 0.6
          }}
        >
          {saving ? <Loader2 size={14} className="spin" /> : <Save size={14} />}
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
