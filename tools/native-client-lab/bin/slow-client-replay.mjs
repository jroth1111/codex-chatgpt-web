#!/usr/bin/env node
// Native-client timeout control, NOT a live provider/model acceptance test.
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { spawn } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { LAB_ROOT, PRO_FAMILY, CLAUDE_MODEL, buildClaudeArgs, nativeInvocation } from '../src/launch-args.mjs';
import { cleanEnvironment, writeClaudeSettings } from '../src/launch.mjs';
import { withOwnedChild } from '../src/owned-child.mjs';
import { digest } from '../src/benchmark-metrics.mjs';
import { captureChildOutput } from '../src/output-capture.mjs';
import { StreamRedactor } from '../src/proxy.mjs';
if (PRO_FAMILY !== '5.6') throw new Error('This recording requires explicit ASTRA6_PRO_FAMILY=5.6');
const argv = process.argv.slice(2);
const option = name => argv.includes(name) ? argv[argv.indexOf(name) + 1] : undefined;
const cli = option('--cli-path');
if (!cli || !fs.statSync(cli).isFile()) throw new Error('Explicit real native --cli-path required');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'native-slow-replay-'));
const fixture = fs.readFileSync(path.join(LAB_ROOT, 'tests/fixtures/claude-recorded-final.sse'), 'utf8');
const split = fixture.indexOf('\n\n') + 2;
const expected = fixture.split('\n').filter(line => line.startsWith('data: ')).map(line => JSON.parse(line.slice(6)))
  .filter(row => row.type === 'content_block_delta').map(row => row.delta.text || '').join('');
const delayMs = 615_000;
let inferenceRequests = 0, pings = 0;
const sockets = new Set(), timers = new Set();
const server = http.createServer(async (req, res) => {
  for await (const _chunk of req) {};
  const pathname = new URL(req.url, 'http://localhost').pathname;
  if (pathname === '/v1/models') {
    res.writeHead(200, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ data: [{ id: CLAUDE_MODEL, display_name: 'Recorded 5.6 replay', max_input_tokens: 272000 }] }));
  } else if (pathname.endsWith('/steering')) { res.writeHead(204); res.end(); }
  else if (pathname.endsWith('/count_tokens')) { res.writeHead(200, { 'content-type': 'application/json' }); res.end('{"input_tokens":100}'); }
  else if (pathname === '/v1/messages') {
    inferenceRequests++;
    if (inferenceRequests !== 1) { res.writeHead(409); res.end('Replay refuses duplicate inference'); return; }
    res.writeHead(200, { 'content-type': 'text/event-stream', 'cache-control': 'no-cache' });
    res.write(fixture.slice(0, split));
    const ticker = setInterval(() => { pings++; res.write('event: ping\ndata: {"type":"ping"}\n\n'); }, 30_000);
    const timer = setTimeout(() => { clearInterval(ticker); timers.delete(ticker); timers.delete(timer); res.end(fixture.slice(split)); }, delayMs);
    timers.add(ticker); timers.add(timer);
    res.once('close', () => { clearInterval(ticker); clearTimeout(timer); timers.delete(ticker); timers.delete(timer); });
  } else { res.writeHead(404); res.end(); }
});
server.on('connection', socket => { sockets.add(socket); socket.once('close', () => sockets.delete(socket)); });
await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
const url = `http://127.0.0.1:${server.address().port}`, configDir = path.join(root, 'config');
const settingsPath = writeClaudeSettings(configDir, { controlToken: 'synthetic-replay-marker' }, url, '2.1.286');
const env = cleanEnvironment(process.env, 'claude', 'synthetic-replay-marker', 'synthetic-replay-control', url, configDir, { headless: true });
const args = buildClaudeArgs({ cwd: root, sessionId: randomUUID(), settingsPath, headless: true }).args;
const invocation = nativeInvocation(cli, args, 'claude'), started = Date.now();
const child = spawn(invocation.command, invocation.args, { cwd: root, env, stdio: ['pipe', 'pipe', 'pipe'] });
const handlers = new Map(['SIGINT', 'SIGTERM'].map(signal => [signal, () => child.kill(signal)]));
for (const [signal, handler] of handlers) process.on(signal, handler);
console.log(JSON.stringify({ kind: 'recorded_wire_native_client_control', output_root: root, delay_ms: delayMs, provider_verified: false }));
const stdout = path.join(root, 'stdout.jsonl');
const captures = [captureChildOutput(child.stdout, stdout, 'stdout', new StreamRedactor([])),
  captureChildOutput(child.stderr, path.join(root, 'stderr.jsonl'), 'stderr', new StreamRedactor([]))];
child.stdin.end('Return the recorded fixture response; this is a transport control, not an actual coding task.');
let completion;
try { completion = await withOwnedChild(child, async (_child, completed) => completed); await Promise.all(captures); }
finally {
  for (const [signal, handler] of handlers) process.off(signal, handler);
  for (const timer of timers) { clearTimeout(timer); clearInterval(timer); }
  for (const socket of sockets) socket.destroy();
  await new Promise(resolve => server.close(resolve));
}
const output = fs.readFileSync(stdout, 'utf8').trim().split('\n').map(line => JSON.parse(line).data).join('');
const records = output.trim().split('\n').map(line => JSON.parse(line));
const final = records.findLast(row => row.type === 'result');
const elapsed = Date.now() - started;
const passed = completion.code === 0 && final?.is_error === false && final.result === expected
  && elapsed >= delayMs && inferenceRequests === 1;
const result = { kind: 'recorded_wire_native_client_control', passed, native_exit: completion.code,
  elapsed_ms: elapsed, inference_requests: inferenceRequests, ping_frames: pings,
  fixture_sha256: digest(fixture), provider_verified: false, actual_backend_inference: false };
fs.writeFileSync(path.join(root, 'results.json'), JSON.stringify(result, null, 2), { mode: 0o600 });
console.log(JSON.stringify(result));
process.exitCode = passed ? 0 : 1;
