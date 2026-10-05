import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
test('the replay uses a hashed real client recording with no executable tool calls', () => {
  const recording = fs.readFileSync(new URL('./fixtures/claude-recorded-final.sse', import.meta.url));
  const provenance = JSON.parse(fs.readFileSync(new URL('./fixtures/claude-recorded-final.provenance.json', import.meta.url)));
  assert.equal(createHash('sha256').update(recording).digest('hex'), provenance.fixtureSha256);
  const frames = recording.toString().split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)));
  assert.equal(frames[0].type, 'message_start');
  assert.equal(frames.at(-1).type, 'message_stop');
  assert.equal(frames.some(row => row.content_block?.type === 'tool_use'), false);
  assert.equal(provenance.providerIdentityEvidence, false);
});
test('wrong-family replay fails before launching any native process', () => {
  const result = spawnSync(process.execPath, [fileURLToPath(new URL('../bin/slow-client-replay.mjs', import.meta.url))],
    { encoding: 'utf8', env: { ...process.env, ASTRA6_PRO_FAMILY: '6' } });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /recording requires explicit ASTRA6_PRO_FAMILY=5.6/);
  assert.equal(result.stdout, '');
});
