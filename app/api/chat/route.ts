import {
  streamText,
  convertToModelMessages,
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
import { createAssistantTextStream } from "@/lib/assistant-text-stream";
import {
  createLlmStreamFinalizer,
  setOpenInferenceLlmUsage,
  setPixelbotSpanKind,
  setPixelbotSpanStatus,
} from "@/lib/chat-otel";
import { resolveChatPath } from "@/lib/chat-path";

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
    requestSpan.setAttribute("openinference.span.kind", "CHAIN");
    requestSpan.setAttribute("span_kind", "CHAIN");
    requestSpan.setAttribute("pixelbot.component", "api.chat");
    requestSpan.setAttribute("http.route", "/api/chat");
    requestSpan.setAttribute("http.method", "POST");

    try {
      if (!process.env.OPENROUTER_API_KEY?.trim()) {
        const missingKeyText =
          "PixelBot can’t reach the AI service yet. Add OPENROUTER_API_KEY to `.env.local` (see README), then restart `npm run dev`.";
        const stream = createAssistantTextStream(missingKeyText);

        requestSpan.setAttribute("pixelbot.response.path", "config_error");
        requestSpan.setAttribute("pixelbot.response.reason", "missing_openrouter_api_key");
        setPixelbotSpanKind(requestSpan, "CHAIN");
        setPixelbotSpanStatus(requestSpan, "OK");
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
        const stream = createAssistantTextStream(text);

        requestSpan.setAttribute("pixelbot.response.path", "guardrail");
        requestSpan.setAttribute("pixelbot.response.reason", reason);
        setPixelbotSpanKind(requestSpan, "CHAIN");
        setPixelbotSpanStatus(requestSpan, "OK");
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
        const { finalizeOnce } = createLlmStreamFinalizer({
          llmSpan,
          requestSpan,
        });

        setPixelbotSpanKind(llmSpan, "LLM");
        llmSpan.setAttribute("pixelbot.component", "api.chat");
        llmSpan.setAttribute("llm.model_name", modelName);
        llmSpan.setAttribute("llm.provider", "openrouter");
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
          onFinish: (event) => {
            setOpenInferenceLlmUsage(llmSpan, event.totalUsage);
            finalizeOnce("OK");
          },
          onError: ({ error }) => {
            const errorMessage =
              error instanceof Error ? error.message : "Unknown streaming error";
            finalizeOnce("ERROR", errorMessage);
          },
        });

        return streamResult;
        },
      );

      return result.toUIMessageStreamResponse();
    } catch (error) {
      requestSpan.recordException(error as Error);
      setPixelbotSpanKind(requestSpan, "CHAIN");
      setPixelbotSpanStatus(requestSpan, "ERROR");
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
