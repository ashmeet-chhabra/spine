import { resolve, relative, isAbsolute, dirname, join } from 'path';
import { promises as fs } from 'fs';
import { spawn } from 'child_process';
import { platform } from 'os';

const PROJECT_ROOT = process.env.PROJECT_ROOT || process.cwd();

export function getSafePath(relativePath: string): string {
  const resolved = isAbsolute(relativePath) ? relativePath : resolve(PROJECT_ROOT, relativePath);
  const rel = relative(PROJECT_ROOT, resolved);
  if (rel.startsWith('..') || isAbsolute(rel)) {
    throw new Error("Access denied: Directory traversal attempted.");
  }
  return resolved;
}

export async function readFile(path: string): Promise<string> {
  const safePath = getSafePath(path);
  return await fs.readFile(safePath, 'utf-8');
}

export async function writeFile(path: string, content: string): Promise<string> {
  const safePath = getSafePath(path);
  const dir = dirname(safePath);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(safePath, content, 'utf-8');
  return `Successfully wrote to ${path}`;
}

export interface RunCommandOptions {
  cmd: string;
  onStdout?: (data: string) => void;
  onStderr?: (data: string) => void;
}

export async function runCommand({ cmd, onStdout, onStderr }: RunCommandOptions): Promise<{ code: number; stdout: string; stderr: string }> {
  const isWindows = platform() === 'win32';
  const shell = isWindows ? 'powershell.exe' : 'bash';
  const shellFlag = isWindows ? '-Command' : '-c';

  return new Promise((resolvePromise) => {
    // spawn shell command
    const child = spawn(shell, [shellFlag, cmd], {
      cwd: PROJECT_ROOT,
      shell: true,
    });

    let stdoutText = '';
    let stderrText = '';
    let timedOut = false;

    // 60-second timeout
    const timeout = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGTERM');
      } catch { /* ignore */ }
      resolvePromise({
        code: -1,
        stdout: stdoutText,
        stderr: stderrText + '\nCommand timed out after 60 seconds.',
      });
    }, 60000);

    child.stdout.on('data', (chunk) => {
      const data = chunk.toString();
      stdoutText += data;
      if (onStdout) onStdout(data);
    });

    child.stderr.on('data', (chunk) => {
      const data = chunk.toString();
      stderrText += data;
      if (onStderr) onStderr(data);
    });

    child.on('close', (code) => {
      if (timedOut) return; // Already resolved by timeout
      clearTimeout(timeout);
      resolvePromise({
        code: code ?? 0,
        stdout: stdoutText,
        stderr: stderrText,
      });
    });

    child.on('error', (err) => {
      if (timedOut) return; // Already resolved by timeout
      clearTimeout(timeout);
      const errMsg = `Error spawning process: ${err.message}\n`;
      stderrText += errMsg;
      if (onStderr) onStderr(errMsg);
      resolvePromise({
        code: -1,
        stdout: stdoutText,
        stderr: stderrText,
      });
    });
  });
}

/**
 * Checks if a shell command is read-only/inspection command.
 * These commands can be safely auto-approved.
 */
export function isReadOnlyCommand(cmd: string): boolean {
  const normalized = cmd.trim();
  const lower = normalized.toLowerCase();
  
  // Multi-command chains can hide unsafe operations, require approval
  if (lower.includes('&&') || lower.includes('||') || lower.includes(';') || lower.includes('\n')) {
    return false;
  }
  
  const parts = lower.split(/\s+/);
  const primary = parts[0];
  
  // 1. Version checks (e.g. node -v, npm --version)
  const isVersionFlag = parts.includes('--version') || parts.includes('-v') || parts.includes('-version') || parts.includes('version');
  if (parts.length <= 3 && isVersionFlag) {
    return true;
  }
  
  // 2. Safe inspection commands
  const safeBaseCommands = [
    'ls', 'dir', 'pwd', 'echo', 'whoami', 'hostname', 'date', 'time',
    'cat', 'type', 'head', 'tail', 'grep', 'findstr', 'which', 'where',
    'tree', 'wc', 'file', 'stat'
  ];
  
  if (safeBaseCommands.includes(primary)) {
    // Block write/append redirects
    if (lower.includes('>') || (lower.includes('|') && !lower.includes('grep') && !lower.includes('findstr'))) {
      return false;
    }
    return true;
  }
  
  // 3. Safe read-only git operations
  if (primary === 'git') {
    const gitSub = parts[1];
    const safeGitSubs = [
      'status', 'diff', 'log', 'show', 'branch', 'remote', 'rev-parse', 'config', 'describe', 'tag'
    ];
    if (safeGitSubs.includes(gitSub)) {
      if (lower.includes('>')) {
        return false;
      }
      return true;
    }
  }

  // 4. Safe read-only npm operations
  if (primary === 'npm') {
    const npmSub = parts[1];
    const safeNpmSubs = ['list', 'ls', 'outdated', 'view', 'info', 'explain', 'why'];
    if (safeNpmSubs.includes(npmSub)) return true;
  }
  
  return false;
}

export async function scanDirectoryTree(dirPath: string = PROJECT_ROOT, maxDepth: number = 3, currentDepth: number = 0): Promise<string> {
  let output = '';
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    // sort directories first, then files
    files.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    const indent = '  '.repeat(currentDepth);
    for (const file of files) {
      if (
        ['node_modules', 'dist', '.git', '.antigravitycli', 'temp_uploads', '.next', 'build', '.spine', '.gemini', 'package-lock.json'].includes(file.name)
      ) {
        continue;
      }
      
      if (file.isDirectory()) {
        output += `${indent}📁 ${file.name}/\n`;
        if (currentDepth < maxDepth) {
          output += await scanDirectoryTree(join(dirPath, file.name), maxDepth, currentDepth + 1);
        }
      } else {
        output += `${indent}📄 ${file.name}\n`;
      }
    }
  } catch (err: any) {
    output += `Error scanning ${dirPath}: ${err.message}\n`;
  }
  return output;
}

export async function listFiles(dirPath: string = PROJECT_ROOT): Promise<string[]> {
  const results: string[] = [];
  async function recurse(currentDir: string) {
    const files = await fs.readdir(currentDir, { withFileTypes: true });
    for (const file of files) {
      const fullPath = join(currentDir, file.name);
      const relPath = relative(PROJECT_ROOT, fullPath);

      if (['node_modules', 'dist', '.git', '.antigravitycli', 'temp_uploads', '.next', 'build', '.spine', '.gemini', 'package-lock.json'].includes(file.name)) {
        continue;
      }

      if (file.isDirectory()) {
        await recurse(fullPath);
      } else {
        results.push(relPath);
      }
    }
  }
  await recurse(dirPath);
  return results;
}

export async function grepSearch(pattern: string, includePattern?: string): Promise<string> {
  const results: string[] = [];
  const regex = new RegExp(pattern, 'i');
  const allFiles = await listFiles(PROJECT_ROOT);

  for (const file of allFiles) {
    if (includePattern && !new RegExp(includePattern.replace(/\*/g, '.*')).test(file)) {
      continue;
    }

    try {
      const content = await fs.readFile(resolve(PROJECT_ROOT, file), 'utf-8');
      const lines = content.split('\n');
      lines.forEach((line, idx) => {
        if (regex.test(line)) {
          results.push(`${file}:${idx + 1}: ${line.trim()}`);
        }
      });
    } catch (err) {
      // Skip binary files or unreadable files
    }

    if (results.length > 100) {
      results.push('... (too many results, please narrow your search)');
      break;
    }
  }

  return results.length > 0 ? results.join('\n') : 'No matches found.';
}

export interface FileNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: FileNode[];
}

export async function getFileTree(dirPath: string = PROJECT_ROOT): Promise<FileNode[]> {
  const result: FileNode[] = [];
  try {
    const files = await fs.readdir(dirPath, { withFileTypes: true });
    // sort directories first, then files
    files.sort((a, b) => {
      if (a.isDirectory() && !b.isDirectory()) return -1;
      if (!a.isDirectory() && b.isDirectory()) return 1;
      return a.name.localeCompare(b.name);
    });

    for (const file of files) {
      const name = file.name;
      const fullPath = join(dirPath, name);
      const relativePath = relative(PROJECT_ROOT, fullPath);

      if (
        ['node_modules', 'dist', '.git', '.antigravitycli', 'temp_uploads', '.next', 'build', '.spine', '.gemini'].includes(name)
      ) {
        continue;
      }

      if (file.isDirectory()) {
        result.push({
          name,
          path: relativePath,
          type: 'directory',
          children: await getFileTree(fullPath)
        });
      } else {
        result.push({
          name,
          path: relativePath,
          type: 'file'
        });
      }
    }
  } catch (err) {
    console.error(`Error building file tree for ${dirPath}:`, err);
  }
  return result;
}

