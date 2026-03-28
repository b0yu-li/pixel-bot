import { describe, expect, it } from "vitest";
import { buildSystemPrompt, HANDOFF_TRIGGER_PHRASE } from "./chat-prompt";
import { KNOWLEDGE_BASE } from "./knowledge-base";

const baseHandoff = {
  readyForHandoff: false,
  zipFound: null,
  issueFound: false,
} as const;

const baseLead = {
  isRecommendationRequest: false,
  budgetFound: false,
  formFactorFound: false,
} as const;

describe("buildSystemPrompt", () => {
  it("includes KB snippet lines for provided entries", () => {
    const prompt = buildSystemPrompt({
      runtimeConfig: {},
      snippets: KNOWLEDGE_BASE.slice(0, 2),
      handoff: baseHandoff,
      lead: baseLead,
    });
    expect(prompt).toContain("- GarlicOS vs Standard Firmware:");
    expect(prompt).toContain("GarlicOS is a custom firmware");
  });

  it("embeds exact handoff trigger instructions when readyForHandoff", () => {
    const prompt = buildSystemPrompt({
      runtimeConfig: {},
      snippets: [],
      handoff: {
        readyForHandoff: true,
        zipFound: "90210",
        issueFound: true,
      },
      lead: baseLead,
    });
    expect(prompt).toContain("Output EXACTLY this trigger phrase and nothing else:");
    expect(prompt).toContain(HANDOFF_TRIGGER_PHRASE);
  });

  it("asks for budget and form factor when recommendation is incomplete", () => {
    const prompt = buildSystemPrompt({
      runtimeConfig: {},
      snippets: [],
      handoff: baseHandoff,
      lead: {
        isRecommendationRequest: true,
        budgetFound: true,
        formFactorFound: false,
      },
    });
    expect(prompt).toMatch(/budget range/i);
    expect(prompt).toMatch(/form factor/i);
  });
});
