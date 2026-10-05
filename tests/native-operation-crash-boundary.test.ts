import { expect, test } from "bun:test";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defaultBrokerEndpoint } from "../src/config";
import { callTurnBroker } from "../src/adapters/chatgpt-web/turn-broker";

test("real broker process death loses handles but rejects old authority without replaying an ambiguous effect", async () => {
  const root = mkdtempSync(join(tmpdir(), "cgw-crash-boundary-"));
  const socket = defaultBrokerEndpoint(root), script = join(root, "owner.ts"), counter = join(root, "counter.txt");
  const module = join(import.meta.dir, "../src/adapters/chatgpt-web/turn-broker.ts");
  writeFileSync(script, `
    import {TurnBroker} from ${JSON.stringify(module)};
    import fs from 'node:fs';
    const root=${JSON.stringify(root)}, broker=TurnBroker.forSocket(${JSON.stringify(socket)});
    const token=await broker.register({cwd:root,roots:[root],writableRoots:[root],sandboxPolicy:{type:'dangerFullAccess'},
      tools:[{name:'exec_command',description:'fixture',parameters:{}}]},undefined,'crash-owner',undefined,true);
    console.log(JSON.stringify({type:'ready',token}));
    for(;;){
      const batch=await broker.nextToolBatch(token);
      for(const request of batch){
        const p=${JSON.stringify(counter)};
        const n=fs.existsSync(p)?Number(fs.readFileSync(p,'utf8')):0;
        fs.writeFileSync(p,String(n+1));
        console.log(JSON.stringify({type:'effect-dispatched'}));
        // Deliberately never publish completion: the owner will be killed.
      }
    }
  `);
  const children: ReturnType<typeof Bun.spawn>[] = [];
  const launch = () => {
    const child = Bun.spawn([process.execPath, script], { stdout: "pipe", stderr: "ignore" });
    children.push(child);
    const reader = (child.stdout as ReadableStream<Uint8Array>).getReader();
    let buffer = "";
    const next = async (type: string): Promise<any> => {
      for (;;) {
        const newline = buffer.indexOf("\n");
        if (newline >= 0) {
          const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
          try { const value = JSON.parse(line); if (value.type === type) return value; } catch {}
        } else {
          const part = await reader.read();
          if (part.done) throw new Error("Owned fixture exited before its marker");
          buffer += new TextDecoder().decode(part.value);
        }
      }
    };
    return { child, next };
  };
  try {
    const first = launch(), initial = await first.next("ready");
    const claim = await callTurnBroker<{ bindingId: string }>(socket, { method: "claim", token: initial.token });
    const input = { method: "start_operation" as const, bindingId: claim.bindingId, operationKey: "intended-once",
      wireName: "exec_command", freeform: false, arguments: { cmd: "fixture-counter-effect" } };
    const operation = await callTurnBroker<{ operation_id: string }>(socket, input);
    await first.next("effect-dispatched");
    expect(readFileSync(counter, "utf8")).toBe("1");
    first.child.kill("SIGKILL");
    await first.child.exited;
    const replacement = launch(), fresh = await replacement.next("ready");
    expect(fresh.token).not.toBe(initial.token);
    await expect(callTurnBroker(socket, { method: "read_operation", token: initial.token,
      operationId: operation.operation_id, waitMs: 0 })).rejects.toThrow();
    await expect(callTurnBroker(socket, input)).rejects.toThrow();
    expect(readFileSync(counter, "utf8")).toBe("1");
  } finally {
    for (const child of children) if (child.exitCode === null && child.signalCode === null) child.kill("SIGKILL");
    await Promise.all(children.map(child => child.exited));
    rmSync(root, { recursive: true, force: true });
  }
}, 15_000);
