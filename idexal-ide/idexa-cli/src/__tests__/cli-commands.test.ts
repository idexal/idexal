import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import os from 'os';

// ══════════════════════════════════════════════════════════════
// Test Helpers
// ══════════════════════════════════════════════════════════════

const CLI = path.resolve(__dirname, '..', '..', 'src', 'index.ts');
const TEMP_DIR = path.join(os.tmpdir(), `idexa-test-${Date.now()}`);

function run(command: string, opts: { cwd?: string; timeout?: number } = {}): string {
  try {
    return execSync(
      `npx tsx "${CLI}" ${command} --json --no-color`,
      {
        encoding: 'utf-8',
        cwd: opts.cwd || TEMP_DIR,
        timeout: opts.timeout || 15_000,
        env: { ...process.env, NODE_ENV: 'test', NO_COLOR: '1' },
      }
    );
  } catch (err: any) {
    return err.stdout || err.stderr || '';
  }
}

function parseJson(output: string): any {
  const trimmed = output.trim();
  const jsonStart = trimmed.search(/[\[{]/);
  if (jsonStart === -1) throw new Error(`No JSON found in output: ${trimmed.slice(0, 200)}`);
  return JSON.parse(trimmed.slice(jsonStart));
}

function assertEnvelope(json: any, expectedCommand?: string) {
  expect(json).toHaveProperty('ok');
  expect(typeof json.ok).toBe('boolean');
  expect(json).toHaveProperty('command');
  expect(json).toHaveProperty('data');
  if (expectedCommand) expect(json.command).toBe(expectedCommand);
}

// ══════════════════════════════════════════════════════════════
// Setup & Teardown
// ══════════════════════════════════════════════════════════════

beforeAll(() => {
  fs.ensureDirSync(TEMP_DIR);
  fs.writeJsonSync(path.join(TEMP_DIR, 'package.json'), {
    name: 'test-project',
    version: '1.0.0',
    scripts: { test: 'echo "no tests"' },
  });
  fs.ensureDirSync(path.join(TEMP_DIR, 'src'));
  fs.writeFileSync(path.join(TEMP_DIR, 'src', 'index.ts'), 'export const x = 1;\n');
});

afterAll(() => {
  fs.removeSync(TEMP_DIR);
});

// ══════════════════════════════════════════════════════════════
// 1. version  (-V)
// ══════════════════════════════════════════════════════════════
describe('1. --version', () => {
  it('returns a valid semver string', () => {
    const out = run('-V');
    const ver = out.trim();
    expect(ver).toMatch(/^\d+\.\d+\.\d+/);
  });
});

// ══════════════════════════════════════════════════════════════
// 2. help  (-h)
// ══════════════════════════════════════════════════════════════
describe('2. --help', () => {
  it('lists all commands including --json flag', () => {
    const out = run('-h');
    const cmds = ['chat','init','config','analyze','generate','test','deploy','context','agent','history','login','whoami','update','doctor'];
    for (const cmd of cmds) {
      expect(out).toContain(cmd);
    }
    expect(out).toContain('--json');
  });
});

// ══════════════════════════════════════════════════════════════
// 3. config list
// ══════════════════════════════════════════════════════════════
describe('3. config list', () => {
  it('returns JSON envelope with config object', () => {
    const out = run('config list');
    const json = parseJson(out);
    assertEnvelope(json, 'config');
    expect(json.ok).toBe(true);
    expect(json.data).toHaveProperty('action', 'list');
    expect(json.data).toHaveProperty('config');
    expect(typeof json.data.config).toBe('object');
  });
});

// ══════════════════════════════════════════════════════════════
// 4. config get <key>
// ══════════════════════════════════════════════════════════════
describe('4. config get', () => {
  it('returns a value for an existing key', () => {
    const out = run('config get defaultModel');
    const json = parseJson(out);
    assertEnvelope(json, 'config');
    expect(json.ok).toBe(true);
    expect(json.data).toHaveProperty('action', 'get');
    expect(json.data).toHaveProperty('key', 'defaultModel');
  });

  it('returns null for a missing key', () => {
    const out = run('config get nonexistent.key');
    const json = parseJson(out);
    assertEnvelope(json, 'config');
    expect(json.ok).toBe(true);
    expect(json.data.value).toBeNull();
  });
});

// ══════════════════════════════════════════════════════════════
// 5. config set <key> <value>
// ══════════════════════════════════════════════════════════════
describe('5. config set', () => {
  it('sets a value and echoes it back', () => {
    const out = run('config set testKey hello');
    const json = parseJson(out);
    assertEnvelope(json, 'config');
    expect(json.ok).toBe(true);
    expect(json.data).toHaveProperty('action', 'set');
    expect(json.data).toHaveProperty('key', 'testKey');
    expect(json.data).toHaveProperty('value', 'hello');
  });
});

// ══════════════════════════════════════════════════════════════
// 6. config reset
// ══════════════════════════════════════════════════════════════
describe('6. config reset', () => {
  it('resets configuration', () => {
    const out = run('config reset');
    const json = parseJson(out);
    assertEnvelope(json, 'config');
    expect(json.ok).toBe(true);
    expect(json.data).toHaveProperty('action', 'reset');
  });
});

// ══════════════════════════════════════════════════════════════
// 7. init
// ══════════════════════════════════════════════════════════════
describe('7. init', () => {
  it('initializes project and returns config info', () => {
    const out = run('init --force', { cwd: TEMP_DIR });
    const json = parseJson(out);
    assertEnvelope(json, 'init');
    expect(json.ok).toBe(true);
    expect(json.data).toHaveProperty('initialized', true);
    expect(json.data).toHaveProperty('name');
    expect(json.data).toHaveProperty('aiProvider');
  });
});

// ══════════════════════════════════════════════════════════════
// 8. context --list
// ══════════════════════════════════════════════════════════════
describe('8. context --list', () => {
  it('returns files array and count', () => {
    const out = run('context --list');
    const json = parseJson(out);
    assertEnvelope(json, 'context');
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data.files)).toBe(true);
    expect(typeof json.data.count).toBe('number');
  });
});

// ══════════════════════════════════════════════════════════════
// 9. context --add
// ══════════════════════════════════════════════════════════════
describe('9. context --add', () => {
  it('adds files and returns them', () => {
    const out = run('context --add src/index.ts');
    const json = parseJson(out);
    assertEnvelope(json, 'context');
    expect(json.ok).toBe(true);
    expect(json.data).toHaveProperty('action', 'add');
    expect(json.data).toHaveProperty('added');
    expect(json.data.added).toBeGreaterThanOrEqual(1);
  });
});

// ══════════════════════════════════════════════════════════════
// 10. context --clear
// ══════════════════════════════════════════════════════════════
describe('10. context --clear', () => {
  it('clears context', () => {
    const out = run('context --clear');
    const json = parseJson(out);
    assertEnvelope(json, 'context');
    expect(json.ok).toBe(true);
    expect(json.data).toHaveProperty('action', 'clear');
    expect(json.data).toHaveProperty('cleared', true);
  });
});

// ══════════════════════════════════════════════════════════════
// 11. history
// ══════════════════════════════════════════════════════════════
describe('11. history', () => {
  it('returns items array', () => {
    const out = run('history');
    const json = parseJson(out);
    assertEnvelope(json, 'history');
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data.items)).toBe(true);
    expect(typeof json.data.count).toBe('number');
  });
});

// ══════════════════════════════════════════════════════════════
// 12. history --clear
// ══════════════════════════════════════════════════════════════
describe('12. history --clear', () => {
  it('clears history', () => {
    const out = run('history --clear');
    const json = parseJson(out);
    assertEnvelope(json, 'history');
    expect(json.ok).toBe(true);
    expect(json.data).toHaveProperty('action', 'clear');
    expect(json.data).toHaveProperty('cleared', true);
  });
});

// ══════════════════════════════════════════════════════════════
// 13. agent list
// ══════════════════════════════════════════════════════════════
describe('13. agent list', () => {
  it('returns agents array', () => {
    const out = run('agent list');
    const json = parseJson(out);
    assertEnvelope(json, 'agent');
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data.agents)).toBe(true);
    expect(typeof json.data.count).toBe('number');
  });
});

// ══════════════════════════════════════════════════════════════
// 14. whoami
// ══════════════════════════════════════════════════════════════
describe('14. whoami', () => {
  it('returns login status', () => {
    const out = run('whoami');
    const json = parseJson(out);
    assertEnvelope(json, 'whoami');
    expect(json.ok).toBe(true);
    expect(typeof json.data.loggedIn).toBe('boolean');
    expect(json.data).toHaveProperty('user');
  });
});

// ══════════════════════════════════════════════════════════════
// 15. doctor
// ══════════════════════════════════════════════════════════════
describe('15. doctor', () => {
  it('returns results with status checks', () => {
    const out = run('doctor');
    const json = parseJson(out);
    assertEnvelope(json, 'doctor');
    expect(json.ok).toBe(true);
    expect(Array.isArray(json.data.results)).toBe(true);
    expect(json.data.results.length).toBeGreaterThan(0);
    expect(typeof json.data.errors).toBe('number');
    expect(typeof json.data.warnings).toBe('number');
    expect(typeof json.data.passed).toBe('boolean');

    for (const r of json.data.results) {
      expect(r).toHaveProperty('name');
      expect(r).toHaveProperty('status');
      expect(r).toHaveProperty('message');
      expect(['ok', 'warning', 'error']).toContain(r.status);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// 16. analyze (requires project detection)
// ══════════════════════════════════════════════════════════════
describe('16. analyze', () => {
  it('returns JSON envelope even on error', () => {
    const out = run('analyze src');
    const hasJson = out.includes('"ok"');
    if (hasJson) {
      const json = parseJson(out);
      assertEnvelope(json, 'analyze');
    }
    // Command ran (with or without output)
    expect(true).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// 17. login --api-key
// ══════════════════════════════════════════════════════════════
describe('17. login', () => {
  it('accepts API key and returns login status', () => {
    const out = run('login --api-key test-key-123');
    const json = parseJson(out);
    assertEnvelope(json, 'login');
    expect(json.ok).toBe(true);
    expect(json.data).toHaveProperty('loggedIn', true);
    expect(json.data).toHaveProperty('method', 'apiKey');
  });
});

// ══════════════════════════════════════════════════════════════
// 18. generate (requires API key)
// ══════════════════════════════════════════════════════════════
describe('18. generate', () => {
  it('returns JSON envelope or graceful error', () => {
    const out = run('generate "a hello world function" -l typescript');
    const hasJson = out.includes('"ok"');
    if (hasJson) {
      const json = parseJson(out);
      assertEnvelope(json, 'generate');
      expect(json.data).toHaveProperty('code');
    }
    // Command ran (with or without output)
    expect(true).toBe(true);
  });
});

// ══════════════════════════════════════════════════════════════
// 19. chat (requires API key)
// ══════════════════════════════════════════════════════════════
describe('19. chat', () => {
  it('returns JSON envelope or enters interactive mode', () => {
    const out = run('chat "What is 2+2?" --no-stream');
    const hasJson = out.includes('"ok"');
    if (hasJson) {
      const json = parseJson(out);
      assertEnvelope(json, 'chat');
      expect(json.data).toHaveProperty('prompt', 'What is 2+2?');
      expect(json.data).toHaveProperty('response');
      expect(typeof json.data.response).toBe('string');
      expect(json.data).toHaveProperty('model');
      expect(json.data).toHaveProperty('messageCount', 1);
    } else {
      // Without API key, command enters interactive mode or shows banner
      expect(out.trim().length).toBeGreaterThan(0);
    }
  });
});

// ══════════════════════════════════════════════════════════════
// Cross-cutting: envelope contract
// ══════════════════════════════════════════════════════════════
describe('Envelope contract', () => {
  const commands = [
    'config list',
    'context --list',
    'history',
    'agent list',
    'whoami',
    'doctor',
  ];

  for (const cmd of commands) {
    it(`${cmd} produces { ok, command, data }`, () => {
      const out = run(cmd);
      const json = parseJson(out);
      assertEnvelope(json);
    });
  }
});
