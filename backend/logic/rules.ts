export interface Rule {
  pattern: string;
  action: 'allow' | 'deny' | 'ask';
}

export function matchGlob(pattern: string | undefined, input: string | undefined): boolean {
  if (typeof pattern !== 'string' || typeof input !== 'string') return false;
  const p = pattern.replace(/\\/g, '/').toLowerCase();
  const i = input.replace(/\\/g, '/').toLowerCase();

  if (p === '*') return true;

  let regexStr = '';
  let idx = 0;
  while (idx < p.length) {
    const char = p[idx];
    if (char === '*') {
      if (p[idx + 1] === '*') {
        if (p[idx + 2] === '/') {
          regexStr += '(?:.*/)?';
          idx += 3;
        } else {
          regexStr += '.*';
          idx += 2;
        }
      } else {
        regexStr += '[^/]*';
        idx += 1;
      }
    } else if (char === '?') {
      regexStr += '[^/]';
      idx += 1;
    } else if ('[].+^${}()|\\'.includes(char)) {
      regexStr += '\\' + char;
      idx += 1;
    } else {
      regexStr += char;
      idx += 1;
    }
  }

  const regex = new RegExp('^' + regexStr + '$');
  return regex.test(i);
}

export function evaluateRules(
  rules: Rule[] | undefined,
  input: string | undefined,
  defaultAction: 'allow' | 'deny' | 'ask'
): { action: 'allow' | 'deny' | 'ask'; matched: boolean } {
  if (typeof input !== 'string') return { action: defaultAction, matched: false };
  if (!rules || !Array.isArray(rules) || rules.length === 0) {
    return { action: defaultAction, matched: false };
  }
  for (let idx = rules.length - 1; idx >= 0; idx--) {
    const rule = rules[idx];
    if (rule && typeof rule.pattern === 'string' && matchGlob(rule.pattern, input)) {
      return { action: rule.action, matched: true };
    }
  }
  return { action: defaultAction, matched: false };
}
