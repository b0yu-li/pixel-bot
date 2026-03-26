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
  const titleSet = new Set(tokenize(entry.title));
  const tagSet = new Set(tokenize(entry.tags.join(" ")));
  const questionSet = new Set(tokenize(entry.question));
  const answerSet = new Set(tokenize(entry.answer));
  let score = 0;
  for (const qt of queryTokens) {
    if (titleSet.has(qt)) score += 3;
    if (tagSet.has(qt)) score += 3;
    if (questionSet.has(qt)) score += 2;
    if (answerSet.has(qt)) score += 1;
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

  // Require minimum confidence before returning top-k snippets.
  const minScore = 2;
  const filtered = scored.filter((s) => s.score >= minScore);
  if (filtered.length > 0) return filtered.map((s) => s.entry);

  // If confidence is low, return empty snippets and let caller respond gracefully.
  const anyGood = scored.some((s) => s.score > 0);
  if (anyGood) return scored.slice(0, 1).map((s) => s.entry);
  return KNOWLEDGE_BASE.slice(0, limit);
}

