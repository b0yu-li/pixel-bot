import { KNOWLEDGE_BASE, type KnowledgeBaseEntry } from "./knowledge-base";

const STOP_WORDS = new Set([
  "the",
  "a",
  "an",
  "and",
  "or",
  "to",
  "of",
  "in",
  "for",
  "with",
  "on",
  "is",
  "are",
  "it",
  "i",
  "you",
  "my",
  "your",
  "me",
  "we",
  "they",
  "this",
  "that",
  "what",
  "how",
  "can",
  "do",
  "does",
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/g)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2 && !STOP_WORDS.has(t));
}

function scoreEntry(entry: KnowledgeBaseEntry, queryTokens: string[]): number {
  const haystackTokens = tokenize(
    `${entry.title} ${entry.tags.join(" ")} ${entry.question} ${entry.answer}`,
  );
  const haystackSet = new Set(haystackTokens);

  let score = 0;
  for (const qt of queryTokens) {
    if (haystackSet.has(qt)) score += 1;
  }

  // Boost exact tag/phrase-ish matches.
  const qLower = queryTokens.join(" ");
  const titleLower = entry.title.toLowerCase();
  if (qLower.includes(titleLower)) score += 2;

  return score;
}

export function getRelevantSnippets(query: string, limit = 4): KnowledgeBaseEntry[] {
  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) return KNOWLEDGE_BASE.slice(0, limit);

  const scored = KNOWLEDGE_BASE.map((entry) => ({
    entry,
    score: scoreEntry(entry, queryTokens),
  }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  // If everything scores to ~0, still provide some fallback context.
  const anyGood = scored.some((s) => s.score > 0);
  if (anyGood) return scored.map((s) => s.entry);
  return KNOWLEDGE_BASE.slice(0, limit);
}

