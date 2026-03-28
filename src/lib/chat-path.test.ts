import { describe, expect, it } from "vitest";
import { resolveChatPath } from "./chat-path";
import { HANDOFF_TRIGGER_PHRASE } from "./chat-prompt";

function user(text: string) {
  return { role: "user" as const, parts: [{ type: "text" as const, text }] };
}

describe("resolveChatPath", () => {
  it("returns guardrail for obvious out-of-scope questions", () => {
    const r = resolveChatPath({
      normalizedMessages: [user("What's the weather in Seattle tomorrow?")],
      runtimeConfig: {},
    });
    expect(r.path).toBe("guardrail");
    if (r.path === "guardrail") expect(r.reason).toBe("out_of_scope");
  });

  it("returns handoff trigger when ZIP and damage signal are present", () => {
    const r = resolveChatPath({
      normalizedMessages: [
        user("My handheld screen is cracked"),
        user("90210"),
      ],
      runtimeConfig: {},
    });
    expect(r.path).toBe("guardrail");
    if (r.path === "guardrail") {
      expect(r.reason).toBe("handoff_ready");
      expect(r.text).toBe(HANDOFF_TRIGGER_PHRASE);
    }
  });

  it("returns llm path for in-scope policy questions", () => {
    const r = resolveChatPath({
      normalizedMessages: [user("What is your return policy?")],
      runtimeConfig: {},
    });
    expect(r.path).toBe("llm");
    if (r.path === "llm") {
      expect(r.systemPrompt).toContain("Knowledge base");
      expect(r.systemPrompt).toContain("Returns Window");
    }
  });
});
