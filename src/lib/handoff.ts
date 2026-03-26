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

function includesBrokenDeviceSignal(text: string): boolean {
  const t = text.toLowerCase();
  const keywords = [
    "broken",
    "shattered",
    "cracked",
    "damaged",
    "screen",
    "display",
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
  return keywords.some((k) => t.includes(k));
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

export function evaluateLeadQualification(
  messages: MessageLike[],
): LeadQualificationState {
  const userTexts = messages
    .filter((m) => m.role === "user")
    .map((m) => messageToText(m));

  const lastUserText = userTexts[userTexts.length - 1] ?? "";
  const t = lastUserText.toLowerCase();

  const recommendationSignals = [
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
  ];

  const isRecommendationRequest = recommendationSignals.some((k) =>
    t.includes(k),
  );

  const budgetFound = userTexts.some(extractBudget);
  const formFactorFound = userTexts.some(extractFormFactor);

  return {
    isRecommendationRequest,
    budgetFound,
    formFactorFound,
  };
}

