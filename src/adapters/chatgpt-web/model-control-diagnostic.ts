const publicMessage = "ChatGPT model controls are unavailable. Reload ChatGPT and retry the task.";

/** Classify our controlled preparation causes without exporting UI text or URLs. */
export function modelControlDiagnostic(error: unknown): Record<string, string | number> | undefined {
  if (!(error instanceof Error) || !error.message.startsWith(publicMessage)) return;
  const cause = error.cause instanceof Error ? error.cause.message : "";
  if (cause.length > 1024) return { reason: "unclassified" };
  const patterns: Array<[string, RegExp]> = [
    ["key_did_not_advance", /^ChatGPT effort slider did not advance toward the target/],
    ["option_not_exposed", /^ChatGPT effort slider does not expose item index/],
    ["range_origin_changed", /^ChatGPT changed its effort range origin/],
    ["selection_changed", /^ChatGPT changed its effort range or selection/],
    ["selection_not_persisted", /^ChatGPT did not persist the requested effort/],
    ["menu_not_closed", /^ChatGPT did not close its effort menu/],
    ["slider_not_ready", /^ChatGPT effort slider did not become ready/],
    ["surface_changed", /^ChatGPT changed the selected model's browser surface/],
    ["family_changed", /^ChatGPT changed the model while checking its family/],
  ];
  const reason = patterns.find(([, pattern]) => pattern.test(cause))?.[0] ?? "unclassified";
  const result: Record<string, string | number> = { reason };
  if (reason === "key_did_not_advance" || reason === "option_not_exposed") {
    for (const key of ["before", "after", "target", "min", "max"]) {
      const match = new RegExp(`(?:[ (;])${key}=(-?\\d+)(?:[ ;)])`).exec(cause);
      const value = match ? Number(match[1]) : NaN;
      if (Number.isSafeInteger(value) && Math.abs(value) <= 1000) result[key] = value;
    }
  }
  return result;
}
