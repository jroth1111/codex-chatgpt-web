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
  Client model, catalog, proxy validation, metrics and receipt oracle all pin to
  that family. Unknown families fail before launch. Default remains GPT-6 Pro;
  there is no availability fallback and no treating 5.6 evidence as GPT-6 proof.

## Verification

Full local `bun run verify` exited 0. The real Chrome model-control fixtures and
diagnostic tests passed 9 tests/23 assertions. Cancellation/helper focused tests
passed 18 tests/57 assertions. Explicit-family subprocess tests passed 2/2;
the source catalog generator produced the actual one-row 5.6 Pro/max catalog.

Remaining full native-client gates (final delivery, paired basic, long command,
child cancellation, sequential efficiency, crash/restart) require fresh real
client trials and independent artifacts. These are not marked passed by the
preparation-only checks or the local verification above. GPT-6-specific live
gates also require GPT-6 Pro availability; 5.6 trials have a separate identity.
