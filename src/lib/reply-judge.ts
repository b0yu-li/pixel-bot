import { generateObject } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";

export const replyRubricSchema = z.object({
  in_scope: z
    .boolean()
    .describe("True if the reply is about retro handhelds and/or the shop's store policies only."),
  grounded_or_hedges: z
    .boolean()
    .describe(
      "True if the assistant does not invent specific policy numbers, prices, or dates that are not supported by the conversation; hedging is OK.",
    ),
  concise: z.boolean().describe("True if the reply is reasonably concise (under ~200 words)."),
});

export type ReplyRubric = z.infer<typeof replyRubricSchema>;

export async function judgeAssistantReply(input: {
  userMessage: string;
  assistantReply: string;
  kbSnippetTitles?: string[];
}): Promise<ReplyRubric> {
  const modelName =
    process.env.OPENROUTER_JUDGE_MODEL ?? "qwen/qwen3-30b-a3b-instruct-2507";
  const model = openrouter(modelName);
  const kb =
    input.kbSnippetTitles && input.kbSnippetTitles.length > 0
      ? `Knowledge base snippets possibly shown to the assistant (titles only): ${input.kbSnippetTitles.join(", ")}.`
      : "No knowledge base titles provided.";

  const { object } = await generateObject({
    model,
    schema: replyRubricSchema,
    temperature: 0,
    system: `You are a strict evaluator for PixelBot, a retro handheld shop support assistant.
Score the assistant reply using the schema. Mark grounded_or_hedges false if the assistant states specific return windows, warranty lengths, or shipping times as facts unless they plausibly come from the listed KB titles or are clearly framed as uncertainty.`,
    prompt: `User message:\n${input.userMessage}\n\nAssistant reply:\n${input.assistantReply}\n\n${kb}`,
  });

  return object;
}
