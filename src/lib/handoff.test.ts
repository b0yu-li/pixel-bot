import { describe, expect, it } from "vitest";
import {
  evaluateHandoff,
  evaluateLeadQualification,
  evaluateScope,
} from "./handoff";

function userMessage(text: string) {
  return { role: "user" as const, parts: [{ type: "text" as const, text }] };
}

describe("evaluateLeadQualification", () => {
  it("keeps recommendation intent across turns when follow-up omits the word recommend", () => {
    const messages = [
      userMessage("Can you recommend a retro handheld?"),
      userMessage("$120 and pocket-sized"),
    ];
    const lead = evaluateLeadQualification(messages);
    expect(lead.isRecommendationRequest).toBe(true);
    expect(lead.budgetFound).toBe(true);
    expect(lead.formFactorFound).toBe(true);
  });

  it("still asks for missing fields when only budget appears in a follow-up", () => {
    const messages = [
      userMessage("Please recommend a device for GBA"),
      userMessage("under $100"),
    ];
    const lead = evaluateLeadQualification(messages);
    expect(lead.isRecommendationRequest).toBe(true);
    expect(lead.budgetFound).toBe(true);
    expect(lead.formFactorFound).toBe(false);
  });

  it("exits recommendation mode when the user pivots to a policy-only follow-up", () => {
    const messages = [
      userMessage("Recommend something for SNES"),
      userMessage("What is your return window?"),
    ];
    const lead = evaluateLeadQualification(messages);
    expect(lead.isRecommendationRequest).toBe(false);
  });
});

describe("evaluateHandoff", () => {
  it("is ready when ZIP and a strong damage signal appear across messages", () => {
    const messages = [
      userMessage("My handheld screen is cracked"),
      userMessage("90210"),
    ];
    const h = evaluateHandoff(messages);
    expect(h.issueFound).toBe(true);
    expect(h.zipFound).toBe("90210");
    expect(h.readyForHandoff).toBe(true);
  });

  it("does not treat screen brightness alone as a repair issue", () => {
    const messages = [
      userMessage(
        "Shipping to 90210 — how do I increase screen brightness in the menu?",
      ),
    ];
    const h = evaluateHandoff(messages);
    expect(h.issueFound).toBe(false);
    expect(h.readyForHandoff).toBe(false);
  });
});

describe("evaluateScope", () => {
  it("flags obvious out-of-domain topics", () => {
    const s = evaluateScope("What's the weather in Seattle tomorrow?");
    expect(s.isOutOfScope).toBe(true);
    expect(s.mixedDomain).toBe(false);
  });

  it("flags mixed-domain messages that combine unrelated and in-scope keywords", () => {
    const s = evaluateScope(
      "Can I run a retro emulator on my iPhone like a handheld?",
    );
    expect(s.isOutOfScope).toBe(true);
    expect(s.mixedDomain).toBe(true);
  });
});
