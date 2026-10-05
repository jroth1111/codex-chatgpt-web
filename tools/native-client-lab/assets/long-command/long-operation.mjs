import fs from 'node:fs';
const started = Date.now();
fs.writeFileSync('started.json', JSON.stringify({ started, pid: process.pid, executions: 1 }), { flag: 'wx' });
console.log('LONG_OPERATION_STARTED');
const ticker = setInterval(() => console.log(`PROGRESS elapsed_ms=${Date.now() - started}`), 30_000);
setTimeout(() => {
  clearInterval(ticker);
  fs.writeFileSync('done.json', JSON.stringify({ elapsed_ms: Date.now() - started, executions: 1, status: 'complete' }), { flag: 'wx' });
  console.log('LONG_OPERATION_COMPLETE');
}, 330_000);
