interface GlobalPermissionsProps {
  readMode: 'allow' | 'deny' | 'ask';
  setReadMode: (v: any) => void;
  bashMode: 'allow' | 'deny' | 'ask';
  setBashMode: (v: any) => void;
  writeMode: 'allow' | 'deny' | 'ask';
  setWriteMode: (v: any) => void;
  editMode: 'allow' | 'deny' | 'ask';
  setEditMode: (v: any) => void;
  delegationMode: 'allow' | 'deny' | 'ask';
  setDelegationMode: (v: any) => void;
}

export default function GlobalPermissions({
  readMode, setReadMode,
  bashMode, setBashMode,
  writeMode, setWriteMode,
  editMode, setEditMode,
  delegationMode, setDelegationMode
}: GlobalPermissionsProps) {
  return (
    <div className="dashboard-card card-half">
      <h3>Global Action Permissions</h3>
      <div className="agents-rows-list">
        <PermissionRow 
          label="File Reading" 
          description="Read and inspect workspace files and codebase structure" 
          value={readMode} 
          onChange={setReadMode} 
        />
        <PermissionRow 
          label="Bash Commands" 
          description="Execute local terminal commands and run shell scripts" 
          value={bashMode} 
          onChange={setBashMode} 
        />
        <PermissionRow 
          label="File Writing" 
          description="Create new files and directories in the workspace sandbox" 
          value={writeMode} 
          onChange={setWriteMode} 
        />
        <PermissionRow 
          label="File Editing" 
          description="Modify, overwrite, or edit existing files in the workspace" 
          value={editMode} 
          onChange={setEditMode} 
        />
        <PermissionRow 
          label="Agent Delegation" 
          description="Delegate tasks to sub-agents and child agent processes" 
          value={delegationMode} 
          onChange={setDelegationMode} 
        />
      </div>
    </div>
  );
}

interface PermissionRowProps {
  label: string;
  description: string;
  value: string;
  onChange: (v: any) => void;
}

function PermissionRow({ label, description, value, onChange }: PermissionRowProps) {
  return (
    <div className="permission-row-item">
      <div className="permission-info">
        <span className="permission-label">{label}</span>
        <span className="permission-desc">{description}</span>
      </div>
      <div className="permission-select-wrapper">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="select-field select-field-sm"
        >
          <option value="allow">Allow</option>
          <option value="ask">Ask</option>
          <option value="deny">Deny</option>
        </select>
      </div>
    </div>
  );
}
