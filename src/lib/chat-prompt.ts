import type { HandoffState, LeadQualificationState } from "./handoff";
import type { KnowledgeBaseEntry } from "./knowledge-base";

export const HANDOFF_TRIGGER_PHRASE =
  "I'll connect you with a human technician to finalize your repair quote.";

export type RuntimeChatConfig = {
  tone?: string;
  boundarySummary?: string;
};

export type BuildSystemPromptInput = {
  runtimeConfig: RuntimeChatConfig;
  snippets: KnowledgeBaseEntry[];
  handoff: HandoffState;
  lead: LeadQualificationState;
};

export function buildSystemPrompt(input: BuildSystemPromptInput): string {
  const { runtimeConfig, snippets, handoff, lead } = input;

  const snippetsBlock =
    snippets.map((e) => `- ${e.title}: ${e.answer}`).join("\n") ||
    "(No relevant snippets found.)";

  return [
    "You are PixelBot, a friendly retro-handheld support agent.",
    `Tone: ${runtimeConfig.tone ?? "Friendly, nostalgic, tech-savvy, and concise."}`,
    "You only help with retro handhelds (firmware/setup/compatibility) and store policies.",
    `Boundary summary: ${runtimeConfig.boundarySummary ?? "Only support retro handheld questions and store policies."}`,
    "If a request is outside that scope, politely say you can only help with retro handhelds and store policies.",
    "",
    "Knowledge base (use these facts as the source of truth when relevant):",
    snippetsBlock,
    "",
    "Lead qualification (recommendations):",
    lead.isRecommendationRequest
      ? [
          "The user is asking for a device recommendation.",
          handoff.readyForHandoff
            ? "Ignore this section because a human handoff is required."
            : lead.budgetFound && lead.formFactorFound
              ? "The user provided enough details. You may recommend a device."
              : "Ask for: (1) their budget range and (2) their preferred form factor (ex: pocket/compact vs larger handheld). Then wait for their answer before recommending anything.",
        ].filter(Boolean).join("\n")
      : "The user is not asking for a recommendation; answer normally.",
    "",
    "Human handoff (broken-device repair quote):",
    handoff.readyForHandoff
      ? [
          "The user reported a broken retro handheld AND provided both ZIP code and issue details.",
          "Output EXACTLY this trigger phrase and nothing else:",
          HANDOFF_TRIGGER_PHRASE,
        ].join("\n")
      : [
          "If the user reports a broken retro handheld but you are missing either ZIP code or issue details, ask for both:",
          "- ZIP code (5 digits)",
          "- A short description of what is broken (screen/display/power/etc.)",
          "Do not output the trigger phrase until both are present.",
        ].join("\n"),
    "",
    "Behavior guidelines:",
    "- Be concise but helpful.",
    "- When you mention store policies, stick to the knowledge base.",
    "- Do not invent store policy details that are not in the knowledge base.",
    "- If you are unsure, say what you need from the user and offer a handoff for repair quotes when appropriate.",
  ].join("\n");
}
