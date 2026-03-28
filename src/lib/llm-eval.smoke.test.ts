import { generateText, convertToModelMessages } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { describe, expect, it } from "vitest";
import { resolveChatPath } from "./chat-path";
import { getRelevantSnippets } from "./retrieval";
import { judgeAssistantReply } from "./reply-judge";

const hasKey = Boolean(process.env.OPENROUTER_API_KEY?.trim());
const runEval = process.env.RUN_LLM_EVAL === "1" && hasKey;
const runJudge = process.env.ENABLE_LLM_JUDGE === "1" && hasKey;

async function llmReply(userText: string): Promise<
  | { path: "guardrail"; text: string }
  | { path: "llm"; text: string }
> {
  const messages = [
    { role: "user" as const, parts: [{ type: "text" as const, text: userText }] },
  ];
  const resolved = resolveChatPath({
    normalizedMessages: messages,
    runtimeConfig: {},
  });
  if (resolved.path === "guardrail") {
    return { path: "guardrail", text: resolved.text };
  }

  const modelName = process.env.OPENROUTER_MODEL ?? "qwen/qwen3.5-plus-02-15";
  const model = openrouter(modelName);
  const modelMessages = await convertToModelMessages(resolved.normalizedMessages as any);
  const { text } = await generateText({
    model,
    temperature: 0,
    system: resolved.systemPrompt,
    messages: modelMessages,
  });

  return { path: "llm", text: text ?? "" };
}

describe.skipIf(!runEval)("LLM smoke evals (RUN_LLM_EVAL=1)", () => {
  it("mentions return window facts for a policy question", async () => {
    const userText = "What is your return policy?";
    const result = await llmReply(userText);
    expect(result.path).toBe("llm");
    const lower = result.text.toLowerCase();
    expect(lower).toMatch(/14|fourteen|return|day|policy|deliver/);
  });

  it("discusses firmware or updating for a firmware question", async () => {
    const userText = "How do I update firmware on my retro handheld?";
    const result = await llmReply(userText);
    expect(result.path).toBe("llm");
    const lower = result.text.toLowerCase();
    expect(lower).toMatch(/firmware|sd|backup|update|download/);
  });
});

describe.skipIf(!runEval || !runJudge)("Minimal LLM judge (ENABLE_LLM_JUDGE=1)", () => {
  it("scores a return-policy turn with the rubric JSON", async () => {
    const userText = "What is your return policy?";
    const result = await llmReply(userText);
    expect(result.path).toBe("llm");
    const snippets = getRelevantSnippets(userText, 4);
    const rubric = await judgeAssistantReply({
      userMessage: userText,
      assistantReply: result.text,
      kbSnippetTitles: snippets.map((s) => s.title),
    });
    expect(rubric.in_scope).toBe(true);
    expect(rubric.grounded_or_hedges).toBe(true);
  });
});
