import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
test('long trial refuses launch without private provider evidence', () => {
  const result = spawnSync(process.execPath, [path.join(root, 'bin/long-benchmark.mjs'), '--client', 'codex'], { encoding: 'utf8' });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /private --provider-log required/);
  assert.equal(result.stdout, '');
});
test('the independent long-command oracle rejects fabricated early completion markers', () => {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), 'long-oracle-negative-'));
  try {
    fs.copyFileSync(path.join(root, 'assets/long-command/long.test.mjs'), path.join(cwd, 'long.test.mjs'));
    fs.writeFileSync(path.join(cwd, 'started.json'), JSON.stringify({ executions: 1, started: Date.now(), pid: process.pid }));
    fs.writeFileSync(path.join(cwd, 'done.json'), JSON.stringify({ executions: 1, elapsed_ms: 330000, status: 'complete' }));
    const env = { ...process.env };
    delete env.NODE_TEST_CONTEXT;
    const result = spawnSync(process.execPath, ['--test', 'long.test.mjs'], { cwd, encoding: 'utf8', env });
    assert.notEqual(result.status, 0);
    assert.match(result.stdout, /not ok/);
  } finally { fs.rmSync(cwd, { recursive: true, force: true }); }
});
