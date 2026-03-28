import {
  streamText,
  convertToModelMessages,
  createUIMessageStream,
  createUIMessageStreamResponse,
} from "ai";
import { openrouter } from "@openrouter/ai-sdk-provider";
import {
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  context as otelContext,
  trace,
} from "@opentelemetry/api";
import { resolveChatPath } from "../../../src/lib/chat-path";

export const maxDuration = 30;

export async function POST(req: Request) {
  const tracer = trace.getTracer("pixel-bot.chat");

  // Start a dedicated server span rooted at ROOT_CONTEXT so Phoenix can
  // classify PixelBot spans independently from framework-owned route spans.
  return tracer.startActiveSpan(
    "pixelbot.chat.request",
    { kind: SpanKind.SERVER },
    ROOT_CONTEXT,
    async (requestSpan) => {
    const setKindAttributes = (span: any, kind: "CHAIN" | "LLM") => {
      span.setAttribute("openinference.span.kind", kind);
      span.setAttribute("span_kind", kind);
      span.setAttribute("pixelbot.span.kind", kind);
    };

    const setStatusAttributes = (span: any, status: "OK" | "ERROR") => {
      span.setAttribute("otel.status_code", status);
      span.setAttribute("status", status);
      span.setAttribute("pixelbot.status", status);
    };

    requestSpan.setAttribute("openinference.span.kind", "CHAIN");
    requestSpan.setAttribute("span_kind", "CHAIN");
    requestSpan.setAttribute("pixelbot.component", "api.chat");
    requestSpan.setAttribute("http.route", "/api/chat");
    requestSpan.setAttribute("http.method", "POST");

    try {
      if (!process.env.OPENROUTER_API_KEY?.trim()) {
        const assistantMessageId = `assistant-${Date.now()}`;
        const missingKeyText =
          "PixelBot can’t reach the AI service yet. Add OPENROUTER_API_KEY to `.env.local` (see README), then restart `npm run dev`.";
        const stream = createUIMessageStream({
          execute: ({ writer }) => {
            writer.write({ type: "start", messageId: assistantMessageId });
            writer.write({ type: "text-start", id: assistantMessageId });
            writer.write({
              type: "text-delta",
              id: assistantMessageId,
              delta: missingKeyText,
            });
            writer.write({ type: "text-end", id: assistantMessageId });
            writer.write({ type: "finish", finishReason: "stop" });
          },
        });

        requestSpan.setAttribute("pixelbot.response.path", "config_error");
        requestSpan.setAttribute("pixelbot.response.reason", "missing_openrouter_api_key");
        setKindAttributes(requestSpan, "CHAIN");
        setStatusAttributes(requestSpan, "OK");
        requestSpan.setStatus({ code: SpanStatusCode.OK });
        requestSpan.end();

        return createUIMessageStreamResponse({ stream });
      }

      const body = await req.json();
      const messages = (body?.messages ?? []) as any[];
      const normalizedMessages = messages.map((message: any) =>
        Array.isArray(message?.parts)
          ? message
          : {
              ...message,
              parts:
                typeof message?.content === "string"
                  ? [{ type: "text", text: message.content }]
                  : [],
            },
      );
      const runtimeConfig = (body?.runtimeConfig ?? {}) as {
        tone?: string;
        boundarySummary?: string;
      };

      requestSpan.setAttribute("pixelbot.messages.count", normalizedMessages.length);

      const quickResponse = (text: string, reason: string) => {
        const assistantMessageId = `assistant-${Date.now()}`;
        const stream = createUIMessageStream({
          execute: ({ writer }) => {
            writer.write({ type: "start", messageId: assistantMessageId });
            writer.write({ type: "text-start", id: assistantMessageId });
            writer.write({ type: "text-delta", id: assistantMessageId, delta: text });
            writer.write({ type: "text-end", id: assistantMessageId });
            writer.write({ type: "finish", finishReason: "stop" });
          },
        });

        requestSpan.setAttribute("pixelbot.response.path", "guardrail");
        requestSpan.setAttribute("pixelbot.response.reason", reason);
        setKindAttributes(requestSpan, "CHAIN");
        setStatusAttributes(requestSpan, "OK");
        requestSpan.setStatus({ code: SpanStatusCode.OK });
        requestSpan.end();

        return createUIMessageStreamResponse({ stream });
      };

      const resolved = resolveChatPath({
        normalizedMessages,
        runtimeConfig,
      });

      if (resolved.path === "guardrail") {
        return quickResponse(resolved.text, resolved.reason);
      }

      const { systemPrompt, normalizedMessages: messagesForModel } = resolved;

      const modelName = process.env.OPENROUTER_MODEL ?? "qwen/qwen3.5-plus-02-15";
      const model = openrouter(modelName);

      const llmParentContext = trace.setSpan(otelContext.active(), requestSpan);
      const result = await tracer.startActiveSpan(
        "pixelbot.chat.llm",
        { kind: SpanKind.CLIENT },
        llmParentContext,
        async (llmSpan) => {
        let finalized = false;
        const finalizeSpans = (status: "OK" | "ERROR", errorMessage?: string) => {
          if (finalized) return;
          finalized = true;

          setStatusAttributes(llmSpan, status);
          llmSpan.setStatus(
            status === "OK"
              ? { code: SpanStatusCode.OK }
              : { code: SpanStatusCode.ERROR, message: errorMessage ?? "Stream error" },
          );
          llmSpan.end();

          requestSpan.setAttribute("pixelbot.response.path", "llm");
          setKindAttributes(requestSpan, "CHAIN");
          setStatusAttributes(requestSpan, status);
          requestSpan.setStatus(
            status === "OK"
              ? { code: SpanStatusCode.OK }
              : { code: SpanStatusCode.ERROR, message: errorMessage ?? "Stream error" },
          );
          requestSpan.end();
        };

        setKindAttributes(llmSpan, "LLM");
        llmSpan.setAttribute("pixelbot.component", "api.chat");
        llmSpan.setAttribute("llm.model_name", modelName);
        llmSpan.setAttribute("pixelbot.response.path", "llm");
        const modelMessages = await convertToModelMessages(messagesForModel as any);

        const streamResult = streamText({
          model,
          temperature: 0,
          system: systemPrompt,
          messages: modelMessages,
          experimental_telemetry: {
            isEnabled: true,
            functionId: "pixelbot-api-chat",
            metadata: {
              route: "/api/chat",
              model: modelName,
            },
          },
          onFinish: () => {
            finalizeSpans("OK");
          },
          onError: ({ error }) => {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown streaming error";
            finalizeSpans("ERROR", errorMessage);
          },
        });

        return streamResult;
        },
      );

      return result.toUIMessageStreamResponse();
    } catch (error) {
      requestSpan.recordException(error as Error);
      setKindAttributes(requestSpan, "CHAIN");
      setStatusAttributes(requestSpan, "ERROR");
      requestSpan.setStatus({
        code: SpanStatusCode.ERROR,
        message: error instanceof Error ? error.message : "Unknown error",
      });
      requestSpan.end();
      throw error;
    }
    },
  );
}
