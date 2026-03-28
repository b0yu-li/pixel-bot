import { createUIMessageStream } from "ai";

export function createAssistantTextStream(text: string) {
  const assistantMessageId = `assistant-${Date.now()}`;
  return createUIMessageStream({
    execute: ({ writer }) => {
      writer.write({ type: "start", messageId: assistantMessageId });
      writer.write({ type: "text-start", id: assistantMessageId });
      writer.write({
        type: "text-delta",
        id: assistantMessageId,
        delta: text,
      });
      writer.write({ type: "text-end", id: assistantMessageId });
      writer.write({ type: "finish", finishReason: "stop" });
    },
  });
}
