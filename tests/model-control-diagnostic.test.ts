import { expect, test } from "bun:test";
import { modelControlDiagnostic } from "../src/adapters/chatgpt-web/model-control-diagnostic";
const outer = (cause: string) => new Error("ChatGPT model controls are unavailable. Reload ChatGPT and retry the task.", { cause: new Error(cause) });
test("model-control failure exposes only controlled reason and bounded slider numbers", () => {
  expect(modelControlDiagnostic(outer("ChatGPT effort slider did not advance toward the target with ArrowRight (before=2; after=2; target=4)")))
    .toEqual({ reason: "key_did_not_advance", before: 2, after: 2, target: 4 });
  expect(modelControlDiagnostic(outer("ChatGPT effort slider does not expose item index 4 (min=0; max=3)")))
    .toEqual({ reason: "option_not_exposed", min: 0, max: 3 });
  expect(modelControlDiagnostic(outer("ChatGPT did not close its effort menu after selecting the requested effort")))
    .toEqual({ reason: "menu_not_closed" });
});
test("unknown causes, large values and private strings cannot escape the diagnostic", () => {
  expect(modelControlDiagnostic(new Error("foreign error"))).toBeUndefined();
  expect(modelControlDiagnostic(outer("secret https://example.invalid/?token=private"))).toEqual({ reason: "unclassified" });
  expect(modelControlDiagnostic(outer("x".repeat(1025)))).toEqual({ reason: "unclassified" });
  expect(modelControlDiagnostic(outer("ChatGPT effort slider did not advance toward the target (before=123456; after=2; target=4) private")))
    .toEqual({ reason: "key_did_not_advance", after: 2, target: 4 });
});
