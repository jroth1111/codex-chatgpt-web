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
one owned 5.6 Pro Send and no recovery. Claude's corresponding provider turn is
still in flight; active generation is preserved, not subjected to a query timer.

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
