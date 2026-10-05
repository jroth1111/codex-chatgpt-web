import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
const cwd = fileURLToPath(new URL('../', import.meta.url));
const code = `
import {CODEX_MODEL,CLAUDE_MODEL,SERVED_MODEL,assertExactCodexCatalog} from './src/launch-args.mjs';
import {evaluateAcceptance} from './src/benchmark-oracle.mjs';
import {CODEX_MODEL as proxyModel} from './src/proxy.mjs';
import {writeClaudeSettings} from './src/launch.mjs';
import fs from 'node:fs'; import os from 'node:os'; import path from 'node:path';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'explicit-pro-settings-'));
let settings;
try{settings=JSON.parse(fs.readFileSync(writeClaudeSettings(tmp,{controlToken:'test-only-marker'},'http://127.0.0.1:1234','2.1.286'),'utf8'));}
finally{fs.rmSync(tmp,{recursive:true,force:true});}
const workflow={launcherExit:0,nativeExit:0,clientFinal:true,testExit:0,exactEdit:true,testsUnchanged:true};
const catalog={models:[{slug:CODEX_MODEL,default_reasoning_level:'max',supported_reasoning_levels:[{effort:'max'}]}]};
assertExactCodexCatalog(catalog);
let rejected=false;
try{assertExactCodexCatalog({models:[{...catalog.models[0],slug:'chatgpt-web/gpt-6-pro'}]});}catch{rejected=true;}
console.log(JSON.stringify({CODEX_MODEL,CLAUDE_MODEL,SERVED_MODEL,proxyModel,rejected,settingsModel:settings.model,availableModels:settings.availableModels,
accepted:evaluateAcceptance({...workflow,servedModel:SERVED_MODEL}).accepted,
wrong:evaluateAcceptance({...workflow,servedModel:'gpt-6-pro'}).accepted}));`;
test('explicit 5.6 selection pins client, catalog, proxy and exact served identity without fallback',()=>{
  const result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd,encoding:'utf8',env:{...process.env,ASTRA6_PRO_FAMILY:'5.6'}});
  assert.equal(result.status,0,result.stderr);
  assert.deepEqual(JSON.parse(result.stdout),{CODEX_MODEL:'chatgpt-web/gpt-5.6-pro',CLAUDE_MODEL:'claude-chatgpt-web-gpt-5.6-pro',SERVED_MODEL:'gpt-5-6-pro',proxyModel:'chatgpt-web/gpt-5.6-pro',rejected:true,settingsModel:'claude-chatgpt-web-gpt-5.6-pro',availableModels:['claude-chatgpt-web-gpt-5.6-pro'],accepted:true,wrong:false});
});
test('unknown model families fail before any client can launch',()=>{
  const result=spawnSync(process.execPath,['--input-type=module','-e',code],{cwd,encoding:'utf8',env:{...process.env,ASTRA6_PRO_FAMILY:'7'}});
  assert.notEqual(result.status,0);
  assert.match(result.stderr,/ASTRA6_PRO_FAMILY must be 6 or 5.6/);
  assert.equal(result.stdout,'');
});
