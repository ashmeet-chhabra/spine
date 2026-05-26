import { DiffEditor } from '@monaco-editor/react';

interface DiffViewerProps {
  path: string;
  original: string;
  proposed: string;
  onApprove: (modifiedContent: string) => void;
  onDeny: () => void;
}

export default function DiffViewer({ path, original, proposed, onApprove, onDeny }: DiffViewerProps) {
  // Simple extension-to-language mapping for Monaco Editor syntax highlighting
  const getLanguage = (filePath: string) => {
    const ext = filePath.split('.').pop()?.toLowerCase();
    switch (ext) {
      case 'js':
      case 'jsx':
        return 'javascript';
      case 'ts':
      case 'tsx':
        return 'typescript';
      case 'json':
        return 'json';
      case 'py':
        return 'python';
      case 'html':
        return 'html';
      case 'css':
        return 'css';
      case 'md':
      case 'markdown':
        return 'markdown';
      case 'sh':
      case 'bash':
        return 'shell';
      case 'yaml':
      case 'yml':
        return 'yaml';
      default:
        return 'plaintext';
    }
  };

  return (
    <div className="inline-diff">
      <div className="inline-diff-header">
        <div className="inline-diff-filename">
          <span className="tool-status-badge pending">Proposing Edit</span>
          <span>{path}</span>
        </div>
        <div className="inline-diff-actions">
          <button className="btn btn-sm btn-danger" onClick={onDeny}>
            Reject
          </button>
          <button className="btn btn-sm btn-approve" onClick={() => onApprove(proposed)}>
            Accept & Write
          </button>
        </div>
      </div>
      <div className="inline-diff-editor">
        <DiffEditor
          height="100%"
          language={getLanguage(path)}
          original={original}
          modified={proposed}
          theme="vs-dark"
          options={{
            renderSideBySide: true,
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            fontSize: 12,
            lineHeight: 18,
            fontFamily: "'JetBrains Mono', Consolas, monospace",
            readOnly: false // Allow editing the proposed code directly
          }}
        />
      </div>
    </div>
  );
}
