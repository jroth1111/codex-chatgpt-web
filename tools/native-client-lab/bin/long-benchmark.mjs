#!/usr/bin/env node
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { LAB_ROOT, SERVED_MODEL } from '../src/launch-args.mjs';
import { digest, nativeMetrics, ownedProviderMetrics } from '../src/benchmark-metrics.mjs';
import { evaluateAcceptance } from '../src/benchmark-oracle.mjs';
import { withOwnedChild } from '../src/owned-child.mjs';
const argv = process.argv.slice(2);
const option = name => argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined;
const client = option('--client');
if (!['codex', 'claude'].includes(client)) throw new Error('--client must be codex or claude');
const providerLog = option('--provider-log');
if (!providerLog || !fs.statSync(providerLog).isFile()) throw new Error('Existing private --provider-log required');
const requestedRoot = option('--output-root') || fs.mkdtempSync(path.join(os.tmpdir(), 'native-long-'));
fs.mkdirSync(requestedRoot, { recursive: true, mode: 0o700 });
const root = fs.realpathSync(requestedRoot);
if (fs.readdirSync(root).length) throw new Error('Never reuse an uncertain trial directory');
const cwd = path.join(root, 'project'), artifacts = path.join(root, 'artifacts');
fs.mkdirSync(cwd, { mode: 0o700 });
const fixtures = path.join(LAB_ROOT, 'assets', 'long-command');
const hashes = {};
for (const name of ['long-operation.mjs', 'long.test.mjs']) {
  fs.copyFileSync(path.join(fixtures, name), path.join(cwd, name));
  hashes[name] = digest(fs.readFileSync(path.join(cwd, name)));
}
const args = [path.join(LAB_ROOT, 'bin', `${client}-astrapro.mjs`), '--headless', '--diagnostic',
  '--cwd', cwd, '--prompt-file', path.join(fixtures, 'prompt.txt'), '--artifacts', artifacts];
for (const name of ['--source-root', '--bridge-config', '--cli-path']) if (option(name)) args.push(name, option(name));
if (argv.includes('--unsafe')) args.push('--unsafe');
const before = fs.statSync(providerLog).size, started = Date.now();
const fd = fs.openSync(path.join(root, 'launch.log'), 'wx', 0o600);
const child = spawn(process.execPath, args, { stdio: ['ignore', fd, fd] });
const handlers = new Map(['SIGINT', 'SIGTERM'].map(signal => [signal, () => {
  if (child.exitCode === null && child.signalCode === null) child.kill(signal);
}]));
for (const [signal, handler] of handlers) process.on(signal, handler);
console.log(JSON.stringify({ benchmark_root: root, client, expected_served_model: SERVED_MODEL, query_timeout: null, automatic_retry: false }));
let exit;
try {
  const completion = await withOwnedChild(child, async (_child, completed) => completed);
  if (completion.error) throw completion.error;
  exit = completion.code;
} finally {
  fs.closeSync(fd);
  for (const [signal, handler] of handlers) process.off(signal, handler);
}
const test = spawnSync(process.execPath, ['--test', 'long.test.mjs'], { cwd, encoding: 'utf8' });
fs.writeFileSync(path.join(root, 'independent-test.log'), test.stdout + test.stderr, { mode: 0o600 });
const dirs = fs.existsSync(artifacts) ? fs.readdirSync(artifacts) : [];
const native = dirs.length === 1 ? nativeMetrics(path.join(artifacts, dirs[0])) : { native_exit: null, client_final_observed: false };
const wire = ownedProviderMetrics(fs.readFileSync(providerLog).subarray(before).toString(), cwd);
const immutable = Object.entries(hashes).every(([name, hash]) => digest(fs.readFileSync(path.join(cwd, name))) === hash);
const acceptance = evaluateAcceptance({ launcherExit: exit, nativeExit: native.native_exit,
  clientFinal: native.client_final_observed, testExit: test.status, exactEdit: immutable,
  testsUnchanged: immutable, servedModel: wire.served_model });
let done;
try { done = JSON.parse(fs.readFileSync(path.join(cwd, 'done.json'))); } catch { done = null; }
const result = { client, elapsed_ms: Date.now() - started, launcher_exit: exit,
  independent_test_exit: test.status, fixtures_unchanged: immutable, command_completion: done,
  ...native, ...wire, ...acceptance, billing_cost: null };
fs.writeFileSync(path.join(root, 'results.json'), JSON.stringify(result, null, 2), { mode: 0o600 });
console.log(JSON.stringify(result));
process.exitCode = acceptance.accepted ? 0 : 1;
