import { streamText, convertToModelMessages } from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import { getRelevantSnippets } from "../../../src/lib/retrieval";
import { evaluateHandoff, evaluateLeadQualification } from "../../../src/lib/handoff";

export const maxDuration = 30;

export async function POST(req: Request) {
  const body = await req.json();
  const messages = (body?.messages ?? []) as any[];

  const messageToText = (message: any): string => {
    if (typeof message?.content === "string") return message.content;
    if (!Array.isArray(message?.parts)) return "";
    return message.parts
      .filter((p: any) => p?.type === "text" && typeof p?.text === "string")
      .map((p: any) => String(p.text))
      .join("");
  };

  const lastUserMessage = [...messages].reverse().find((m) => m?.role === "user");
  const lastUserText = messageToText(lastUserMessage);

  const relevant = getRelevantSnippets(lastUserText, 4);
  const handoff = evaluateHandoff(messages as any);
  const lead = evaluateLeadQualification(messages as any);

  const triggerPhrase =
    "I'll connect you with a human technician to finalize your repair quote.";

  const snippetsBlock =
    relevant
      .map((e) => `- ${e.title}: ${e.answer}`)
      .join("\n") || "(No relevant snippets found.)";

  const systemPrompt = [
    "You are PixelBot, a friendly retro-handheld support agent.",
    "You only help with retro handhelds (firmware/setup/compatibility) and store policies.",
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
          triggerPhrase,
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

  const model = openrouter("qwen/qwen3.5-plus-02-15");

  const result = streamText({
    model,
    temperature: 0,
    system: systemPrompt,
    messages: await convertToModelMessages(messages as any),
  });

  return result.toUIMessageStreamResponse();
}

