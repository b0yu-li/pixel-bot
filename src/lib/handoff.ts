type MessageLike = {
  role: string;
  content?: string;
  parts?: Array<{
    type?: string;
    text?: string;
  }>;
};

const ZIP_REGEX = /\b(\d{5})(-\d{4})?\b/;

function extractZip(text: string): string | null {
  const m = text.match(ZIP_REGEX);
  return m ? m[1] : null;
}

function messageToText(message: MessageLike): string {
  if (typeof message.content === "string") return message.content;
  if (!Array.isArray(message.parts)) return "";
  return message.parts
    .filter((p) => p?.type === "text" && typeof p?.text === "string")
    .map((p) => String(p.text))
    .join("");
}

/** Strong damage / failure signals — safe to treat as repair intent without screen/display alone. */
const STRONG_DAMAGE_KEYWORDS = [
  "broken",
  "shattered",
  "cracked",
  "damaged",
  "won't turn on",
  "wont turn on",
  "not turning on",
  "dead",
  "won't boot",
  "wont boot",
  "no power",
  "power issue",
  "water damage",
  "liquid",
];

/**
 * "screen" / "display" alone match many benign messages (brightness, resolution).
 * Only count them when paired with damage/repair context.
 */
function includesBrokenDeviceSignal(text: string): boolean {
  const t = text.toLowerCase();
  if (STRONG_DAMAGE_KEYWORDS.some((k) => t.includes(k))) return true;

  if (/\b(screen|display)\b/.test(t)) {
    const damageOrRepairContext =
      /crack|break|shatter|damage|repair|broken|fix|replace|shattered|issue|problem|quote|wont|won't|dead|flicker|lines|black/i;
    return damageOrRepairContext.test(t);
  }
  return false;
}

export type HandoffState = {
  // When true, the assistant must output the exact trigger phrase only.
  readyForHandoff: boolean;
  zipFound: string | null;
  issueFound: boolean;
};

export function evaluateHandoff(
  messages: MessageLike[],
): HandoffState {
  const userTexts = messages
    .filter((m) => m.role === "user")
    .map((m) => messageToText(m));

  const zipFound = userTexts.map(extractZip).find(Boolean) ?? null;

  const issueFound = userTexts.some((t) => includesBrokenDeviceSignal(t));

  return {
    readyForHandoff: Boolean(zipFound && issueFound),
    zipFound,
    issueFound,
  };
}

export type LeadQualificationState = {
  isRecommendationRequest: boolean;
  budgetFound: boolean;
  formFactorFound: boolean;
};

export type ScopeState = {
  isOutOfScope: boolean;
  reason: string;
  /** True when both in-scope and out-of-scope signals appear (e.g. retro + unrelated product). */
  mixedDomain: boolean;
};

function extractBudget(text: string): boolean {
  // Rough budget detection: look for 2-6 digit numbers, optionally with currency symbol.
  const t = text.toLowerCase();
  const budgetRegex = /(\$|usd\s*)?\b(\d{2,6})\b/;
  return budgetRegex.test(t);
}

function extractFormFactor(text: string): boolean {
  const t = text.toLowerCase();
  const keywords = [
    "pocket",
    "compact",
    "handheld",
    "clamshell",
    "flip",
    "slim",
    "small",
    "large",
    "horizontal",
    "vertical",
  ];
  return keywords.some((k) => t.includes(k));
}

const RECOMMENDATION_SIGNALS = [
  "recommend",
  "suggest",
  "what should i get",
  "what device",
  "which handheld",
  "best for",
  "i want a",
  "looking for",
  "should i buy",
  "recommend me",
] as const;

/**
 * If any user message asked for a recommendation, stay in that flow across turns
 * (follow-ups often only add "$120" / "pocket" without repeating "recommend").
 * If the latest message clearly pivots to policy-only support, exit recommendation mode.
 */
export function evaluateLeadQualification(
  messages: MessageLike[],
): LeadQualificationState {
  const userTexts = messages
    .filter((m) => m.role === "user")
    .map((m) => messageToText(m));

  const lastUserText = userTexts[userTexts.length - 1] ?? "";
  const lastLower = lastUserText.toLowerCase();

  const messageAsksRecommendation = (text: string) => {
    const lower = text.toLowerCase();
    return RECOMMENDATION_SIGNALS.some((k) => lower.includes(k));
  };

  const anyUserAskedRecommendation = userTexts.some((text) =>
    messageAsksRecommendation(text),
  );

  const lastMessagePolicyPivot =
    userTexts.length > 1 &&
    [
      "return policy",
      "return window",
      "refund",
      "how long does shipping",
      "track my order",
      "warranty policy",
    ].some((k) => lastLower.includes(k)) &&
    !messageAsksRecommendation(lastUserText);

  let isRecommendationRequest = anyUserAskedRecommendation;
  if (lastMessagePolicyPivot) {
    isRecommendationRequest = false;
  }

  const budgetFound = userTexts.some(extractBudget);
  const formFactorFound = userTexts.some(extractFormFactor);

  return {
    isRecommendationRequest,
    budgetFound,
    formFactorFound,
  };
}

export function evaluateScope(text: string): ScopeState {
  const t = text.toLowerCase();

  const inScopeSignals = [
    "retro",
    "handheld",
    "anbernic",
    "firmware",
    "garlicos",
    "emulator",
    "rom",
    "ps1",
    "snes",
    "gba",
    "shipping",
    "return",
    "refund",
    "warranty",
    "order",
    "store policy",
  ];

  const outOfScopeSignals = [
    "iphone",
    "macbook",
    "resume",
    "homework",
    "stock price",
    "bitcoin",
    "weather",
    "flight",
    "restaurant",
    "medical",
    "legal advice",
  ];

  const hasInScope = inScopeSignals.some((k) => t.includes(k));
  const hasOutScope = outOfScopeSignals.some((k) => t.includes(k));

  // Pure out-of-domain: block.
  if (hasOutScope && !hasInScope) {
    return {
      isOutOfScope: true,
      reason: "Outside retro-handheld and store-policy support scope.",
      mixedDomain: false,
    };
  }

  // Mixed domain (e.g. retro + unrelated product): stay in app but refuse unrelated parts deterministically.
  if (hasOutScope && hasInScope) {
    return {
      isOutOfScope: true,
      reason: "Mixed or out-of-scope topic combined with in-scope keywords.",
      mixedDomain: true,
    };
  }

  return {
    isOutOfScope: false,
    reason: "Looks in scope or neutral.",
    mixedDomain: false,
  };
}
