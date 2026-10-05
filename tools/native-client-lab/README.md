# Recorded native-client acceptance lab

Optional, loopback-only Codex and Claude Code launchers used for real GPT-6 Pro acceptance. No dependencies are installed and no global client routing is changed. Codex is pinned to 0.159.2; Claude must be at least 2.1.285. These are diagnostic harnesses, not a replacement client or a production service.

From this directory, run `node --test tests/*.test.mjs` for offline tests. Bun is required for generating the one-row Codex catalog from the repository's actual catalog augmentation; installed CLIs are required only for live trials. Source root defaults to this repository. Binary paths are discovered from PATH; `ASTRA6_CODEX_PATH`, `ASTRA6_CLAUDE_PATH`, and `ASTRA6_BUN_PATH` override them. `ASTRA6_SOURCE_ROOT` may point at the matching source checkout. Bridge config defaults to `~/.codex-chatgpt-web/config.json`; override with `--bridge-config`.

With a ready, signed-in bridge whose health/config/source versions agree:

The default is GPT-6 Pro. To test 5.6 Pro explicitly, prefix the entire launcher
or benchmark invocation with `ASTRA6_PRO_FAMILY=5.6`. Only `6` and `5.6` are
accepted. This pins the native client, one-row catalog, recording proxy and
served-model oracle to the chosen family; it never falls back automatically.
5.6 results must not be reported as GPT-6 acceptance. Default GPT-6 runs still
require `gpt-6-pro` on every owned physical Send.
The client alias `gpt-5.6-pro` is distinct from its empirically observed provider
wire identifier `gpt-5-6-pro`; 5.6 receipt validation requires the latter exactly.

```sh
node bin/codex-astrapro.mjs --headless --diagnostic --cwd /absolute/disposable/project --prompt-file /absolute/task.txt
node bin/claude-astrapro.mjs --headless --diagnostic --cwd /absolute/disposable/project --prompt-file /absolute/task.txt
```

Omit `--headless` to inherit terminal I/O for an interactive client. `--resume UUID` preserves a native session. Permission bypass is opt-in via `--unsafe`, only for explicitly authorized disposable work; it is never the default. The harness does not change ChatGPT plugin permissions. Read `--help` for all arguments.

Each invocation uses an ephemeral ownership marker, isolated loopback recording proxy and private artifacts directory. Authentication headers are not forwarded as provider credentials; sensitive inherited inference variables are removed. Codex retains its canonical home and built-in OpenAI harness context with an invocation-only base URL. Claude uses lab-local settings and an empty external MCP catalog. Diagnostic mode stops on the first upstream failure without fallback. There is no overall Pro query timeout; preserve observable work and the same session rather than restarting at supervision intervals.

Artifacts and runtime state are private and ignored by Git. They may contain task/tool content despite credential redaction: do not publish raw captures. The included READY fixture is sanitized client-facing SSE, not provider-wire identity evidence. The optional `bin/mcp-observe.mjs` is a non-rewriting stdio observer; explicitly supply `ASTRA6_MCP_EXECUTABLE` and JSON-array `ASTRA6_MCP_ARGS_JSON` for an existing command. It does not install or reconnect a tunnel.

Acceptance is external: inspect disk diffs/hashes, unchanged tests and independently executed runner exits, then verify actual UI behavior. Served identity comes from the bridge's owned provider-wire receipt, never the banner or requested alias. Offline tests are not proof of live compatibility, maximum efficiency or provider availability.
# Acceptance boundaries

`workflow_accepted` is separate from Pro `accepted`: the latter always requires an owned wire receipt reporting `gpt-6-pro`. Missing provider logs or identity never waive that oracle. Read/repeated-read counts currently cover explicit Claude Read and simple quoted cat commands only; they are lower bounds, not comparable exhaustive read totals. Neither partial counts nor heartbeats establish efficiency or task completion.

Client tool-item counts also declare limited coverage. Prefer `returned_native_tool_results` for observed outer-native round trips: these come from the shared broker boundary, correlate by owner trace, and deduplicate hashed call IDs. They count returned results, not in-flight calls or every provider plugin/discovery operation.

Model attestation requires a consistent owned receipt for every observed physical
Send. One resolved Pro receipt cannot cover an unidentified recovery or child Send;
conflicting duplicate receipts also make aggregate identity unavailable.

`bin/long-benchmark.mjs --client codex|claude --provider-log /private/log`
uses a disposable, immutable 330-second command and an independent test runner.
Pass the normal `--source-root`, `--cli-path`, `--output-root` and explicitly
authorized `--unsafe` flags as needed. It preserves the same native child without
a query deadline or automatic retry. Its oracle requires actual completion,
once-only markers, filesystem timing, unchanged fixtures, native final delivery
and the selected family's owned wire identity. A terminal failure stops the
trial; it does not start a replacement command.
