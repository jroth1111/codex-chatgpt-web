# Residual acceptance repair

Baseline fork main: `a660dd8c`. The current live runtime is older than that fork
integration; qualification of this source does not itself deploy it.

## Observed and repaired

- A live preparation-only GPT-6 Pro turn exposed a picker range of 0..3.
  No message was submitted and no model receipt was emitted. The user separately
  reported exhausted GPT-6 Pro availability and authorized explicit 5.6 Pro trials.
  Missing picker options now return `chatgpt_effort_unavailable`, HTTP 400,
  non-retryable, with explicit no-send/no-alternative-model wording. The same live
  no-send probe independently confirmed those fields through helper IPC.
- A live 5.6 Pro preparation reached the Send guard but deadlocked after the
  guard deliberately failed. The helper consulted a recovery callback after the
  parent had marked a local terminal failure and suppressed further callbacks.
  Cancellation now skips recovery consultation; cancellation during an existing
  consultation also settles it. This adds no provider query deadline. The fixed
  real-helper trial returned the original guard error, with preparation successful,
  submission false and receipts zero; the original failed process was preserved
  until diagnosed, then only its owned no-send helper was terminated.
- The optional lab accepts explicit invocation-only `ASTRA6_PRO_FAMILY=5.6`.
  Client model, settings allowlist, catalog, proxy validation, metrics and receipt oracle all pin to
  that family. Unknown families fail before launch. Default remains GPT-6 Pro;
  there is no availability fallback and no treating 5.6 evidence as GPT-6 proof.
  Live traffic established the exact provider identifier `gpt-5-6-pro`, distinct
  from client aliases containing `5.6`. The initial strict mismatch score is
  retained, not silently overwritten. A real Claude trial also exposed the fixed
  GPT-6 settings-template allowlist overriding `--model`; rendered settings now
  pin both model and allowlist to the explicitly selected family.

## Verification

Full local `bun run verify` exited 0. The real Chrome model-control fixtures and
diagnostic tests passed 9 tests/23 assertions. Cancellation/helper focused tests
passed 18 tests/57 assertions. Explicit-family subprocess tests passed 2/2;
the source catalog generator produced the actual one-row 5.6 Pro/max catalog.

Fresh counterbalanced 5.6 Pro basic trials passed 4/4. Codex took 129862/109395 ms;
Claude took 120565/119218 ms. Each had exact edits, unchanged tests, independent
runner exit 0, native exit 0, a delivered final answer, one owned physical Send,
the exact `gpt-5-6-pro` wire identity and zero recovery Sends. Billing and hardware
scheduling are unknown; two trials per client do not establish general speed
rankings or a parallel speedup. Earlier preflight and model-allowlist failures
are retained separately.

Codex's fresh long-command trial passed: actual command 330011 ms, exactly one
execution, immutable fixtures, independent test exit 0, native final delivery,
one owned 5.6 Pro Send and no recovery. Claude's first corresponding trial failed
final delivery after 2020304 ms: the command completed once after 330005 ms, but
the client repeatedly hit its API timer. Its failure is preserved. A subsequent
trial reported Native2 upstream 502 failures, performed no command and failed
the independent test despite native exit 0. Neither trial counts as acceptance.

The native Claude SDK now gets its documented maximum API timer, 2147483647 ms,
and zero non-streaming timeout re-sends, both in the lab and reversible managed
integration. This finite native limit is about 24.8 days, not a truly unlimited
client lifetime. The bridge itself remains deadline-free. Existing transport
watchdogs remain enabled. The actual native SDK passed a separate 615677 ms
recorded-wire delay control: one inference request, 20 ping frames, exact recorded
final and native exit 0. That is NOT provider, model identity or editing proof.
Settings restoration is independently tested against original user timer values.

Inherited Herdr pane markers were activating a PATH shim's interactive launcher;
lab children now scrub those markers, and repaired trials explicitly use the
real native Claude binary. No global Herdr/client settings were changed.

The tunnel advertised ready despite logged client-internal initialize/tools-call
502 failures with upstream_response_received=false. A direct owned, read-only
MCP probe initialized, listed seven tools and returned the actual broker inventory
without executing a command. Only the idle owned alias was reconnected; no browser
generation was stopped. Fresh Codex/Claude basic trials then passed in 102455 and
101295 ms respectively, each with exact edit, unchanged tests, independent exit 0,
final delivery, one owned 5.6 Pro Send and no recovery. Do not equate local tunnel
ready flags or static plugin catalogs with a working provider-to-tool round trip.

The hosted lab's macOS lane was cancelled at its existing five-minute job limit
while the proxy test file was unfinished. A real held peer stream independently
reproduced a fixture teardown hang. Teardown now closes only owned fixture sockets;
the regression passes without widening CI limits or production query deadlines.
Recorded SSE byte hashes are protected with LF attributes for Windows checkouts.

## Modern long-tool boundary

A later Claude long run was initially scored accepted by the old harness because
the command and the independent host test succeeded. Its actual native final
reported failure to retrieve output or run the client test due to 502s. That
score is explicitly invalidated; it is not an accepted client workflow.
The following Codex trial also failed before executing a command on that poisoned
tunnel. No failed or unknown-outcome command was replayed.

Captured Claude 2.1.286 tools include Bash.run_in_background and Read, but no
TaskOutput and no advertised Bash timeout default. The old normalizer therefore
left an unspecified native foreground wait intact (observed 120 seconds), after
which tunnel initialize/tool calls failed internally. The normalizer now hands
off unspecified or long waits when either TaskOutput or Read completion is
advertised. It preserves command bytes and explicit lifetime; it does not invent
a timeout default or fabricate completion. Catalogs with no completion reader
still do not get this transformation.

With the repair, the real Claude long trial passed in 443409 ms: command elapsed
330004 ms exactly once, immutable fixtures, an actual native test-completion
marker observed before independent verification, independent runner exit 0,
native final delivery, nine returned native results, one physical owned
gpt-5-6-pro Send and zero recovery. The strengthened oracle requires that marker;
the independent host's test alone can no longer accept missing client verification.

New lab Claude sessions have per-session settings/profile paths to prevent
another launch overwriting live hook URLs or model settings. Known legacy
transcripts remain resumable; unknown resume IDs fail instead of silently starting
empty replacement work. Legacy shared-profile resumes remain legacy behavior,
not a claim of concurrent legacy-profile isolation. Parallel lab invocations pin
the supported native Claude spawn depth to one; generic bridge-side Claude
nesting prevention is still not claimed without native metadata.

The next hosted lab run passed macOS but stalled on Windows in the proxy test file.
Fixtures now log each test start/settlement, have bounded diagnostic test deadlines
without widening existing deadlines, and clean only their owned sockets after
each test. This is instrumentation and fixture cleanup, not a Pro query timeout.

An actual disposable broker process was killed after independently observed
counter mutation and before result delivery. A fresh process rejected the old
operation handle and dispatch authority; counter stayed 1. This verifies the
process-local crash boundary and no replay through old authority, not automatic
crash-resumable handles or survival of active Pro across application death.

Expanded installed-parser lab: 62 tests passed with no skips. Actual socket,
operation, crash and admission stress batch: 16 tests/458 assertions, typecheck 0.
The long-command negative fixture rejects fabricated early markers, rather than
trusting the command's reported elapsed field alone. A nested Node test-context
inheritance false-green was caught and fixed in that negative test.

Remaining full native-client gates (Claude long command, child cancellation,
sequential efficiency, active-Pro crash/restart) require fresh real
client trials and independent artifacts. These are not marked passed by the
preparation-only checks or the local verification above. GPT-6-specific live
gates also require GPT-6 Pro availability; 5.6 trials have a separate identity.
