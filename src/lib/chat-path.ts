import { buildSystemPrompt, HANDOFF_TRIGGER_PHRASE } from "./chat-prompt";
import type { RuntimeChatConfig } from "./chat-prompt";
import {
  evaluateHandoff,
  evaluateLeadQualification,
  evaluateScope,
} from "./handoff";
import { getRelevantSnippets } from "./retrieval";

export type NormalizedChatMessage = {
  role: string;
  content?: string;
  parts?: Array<{ type?: string; text?: string }>;
};

export type ChatPathResult =
  | { path: "guardrail"; text: string; reason: string }
  | {
      path: "llm";
      systemPrompt: string;
      normalizedMessages: NormalizedChatMessage[];
    };

const OUT_OF_SCOPE_MIXED =
  "I can only help with retro handheld topics (firmware, setup, compatibility) and our store policies. If your message mixes unrelated topics, ask about handhelds or policies only and I’ll help right away.";

const OUT_OF_SCOPE_PURE =
  "I can help with retro handheld questions (firmware/setup/compatibility) and store policies only. If you share a retro handheld issue or policy question, I can help right away.";

const REPAIR_MISSING_ZIP =
  "I can help with that repair flow. Please share your 5-digit ZIP code so I can continue.";

const RECOMMENDATION_MISSING_FIELDS =
  "To recommend the right retro handheld, please share: (1) your budget range and (2) your preferred form factor (pocket/compact vs larger handheld).";

function messageToText(message: NormalizedChatMessage | undefined): string {
  if (!message) return "";
  if (typeof message.content === "string") return message.content;
  if (!Array.isArray(message.parts)) return "";
  return message.parts
    .filter((p) => p?.type === "text" && typeof p?.text === "string")
    .map((p) => String(p.text))
    .join("");
}

export function resolveChatPath(input: {
  normalizedMessages: NormalizedChatMessage[];
  runtimeConfig: RuntimeChatConfig;
}): ChatPathResult {
  const { normalizedMessages, runtimeConfig } = input;

  const lastUserMessage = [...normalizedMessages]
    .reverse()
    .find((m) => m?.role === "user");
  const lastUserText = messageToText(lastUserMessage);

  const relevant = getRelevantSnippets(lastUserText, 4);
  const handoff = evaluateHandoff(normalizedMessages);
  const lead = evaluateLeadQualification(normalizedMessages);
  const scope = evaluateScope(lastUserText);

  if (scope.isOutOfScope) {
    return {
      path: "guardrail",
      text: scope.mixedDomain ? OUT_OF_SCOPE_MIXED : OUT_OF_SCOPE_PURE,
      reason: "out_of_scope",
    };
  }

  if (handoff.readyForHandoff) {
    return {
      path: "guardrail",
      text: HANDOFF_TRIGGER_PHRASE,
      reason: "handoff_ready",
    };
  }

  if (handoff.issueFound && !handoff.zipFound) {
    return {
      path: "guardrail",
      text: REPAIR_MISSING_ZIP,
      reason: "repair_missing_zip",
    };
  }

  if (lead.isRecommendationRequest && !(lead.budgetFound && lead.formFactorFound)) {
    return {
      path: "guardrail",
      text: RECOMMENDATION_MISSING_FIELDS,
      reason: "recommendation_missing_fields",
    };
  }

  return {
    path: "llm",
    systemPrompt: buildSystemPrompt({
      runtimeConfig,
      snippets: relevant,
      handoff,
      lead,
    }),
    normalizedMessages,
  };
}
