import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { claudeConfigDirectory, writeClaudeSettings } from '../src/launch.mjs';
test('new Claude sessions do not overwrite another live session route or settings', () => {
  const labRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'isolated-claude-profile-'));
  try {
    const a = randomUUID(), b = randomUUID();
    const first = claudeConfigDirectory(a, { labRoot }), second = claudeConfigDirectory(b, { labRoot });
    assert.notEqual(first, second);
    const file = writeClaudeSettings(first, { controlToken: 'test-only-marker' }, 'http://127.0.0.1:1111', '2.1.286');
    const before = fs.readFileSync(file);
    writeClaudeSettings(second, { controlToken: 'test-only-marker' }, 'http://127.0.0.1:2222', '2.1.286', { parallelAgents: true });
    assert.deepEqual(fs.readFileSync(file), before);
    assert.equal(claudeConfigDirectory(a, { labRoot, resume: true }), first);
    const childSettings = JSON.parse(fs.readFileSync(path.join(second, 'settings.json')));
    assert.equal(childSettings.env.CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH, '1');
    assert.equal(JSON.parse(before).env.CLAUDE_CODE_MAX_SUBAGENT_SPAWN_DEPTH, undefined);
    assert.throws(() => claudeConfigDirectory(randomUUID(), { labRoot, resume: true }), /profile is unknown/);
  } finally { fs.rmSync(labRoot, { recursive: true, force: true }); }
});
test('known legacy resume is preserved without silently creating a new session', () => {
  const labRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-claude-profile-'));
  try {
    const id = randomUUID(), legacy = path.join(labRoot, 'runtime', 'claude'), project = path.join(legacy, 'projects', 'fixture');
    fs.mkdirSync(project, { recursive: true });
    fs.writeFileSync(path.join(project, `${id}.jsonl`), 'retained-fixture-transcript\n');
    assert.equal(claudeConfigDirectory(id, { labRoot, resume: true }), legacy);
    assert.equal(fs.readFileSync(path.join(project, `${id}.jsonl`), 'utf8'), 'retained-fixture-transcript\n');
  } finally { fs.rmSync(labRoot, { recursive: true, force: true }); }
});
