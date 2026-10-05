import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';
test('the real command started exactly once and completed after more than five minutes', () => {
  const started = JSON.parse(fs.readFileSync('started.json'));
  const done = JSON.parse(fs.readFileSync('done.json'));
  assert.equal(started.executions, 1);
  assert.equal(done.executions, 1);
  assert.equal(done.status, 'complete');
  assert.ok(Number.isInteger(started.pid) && started.pid > 0);
  assert.ok(done.elapsed_ms >= 330_000);
  assert.ok(Date.now() - started.started >= 330_000);
  assert.ok(fs.statSync('done.json').mtimeMs - fs.statSync('started.json').mtimeMs >= 329_500);
  if (process.env.NATIVE_LAB_INDEPENDENT_TEST !== '1') {
    fs.writeFileSync('native-test-complete.json', JSON.stringify({ pid: process.pid, passed: true }), { flag: 'wx' });
  }
});
