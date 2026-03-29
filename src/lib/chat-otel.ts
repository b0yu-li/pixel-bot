import type { Span } from "@opentelemetry/api";
import { SpanStatusCode } from "@opentelemetry/api";

/** Token counts from AI SDK `LanguageModelUsage` / `totalUsage` (Phoenix OpenInference). */
export type LlmUsageForPhoenix = {
  inputTokens?: number | undefined;
  outputTokens?: number | undefined;
  totalTokens?: number | undefined;
};

/**
 * Sets OpenInference attributes Phoenix uses for cost tracking.
 * @see https://arize.com/docs/phoenix/tracing/how-to-tracing/cost-tracking
 */
export function setOpenInferenceLlmUsage(span: Span, usage: LlmUsageForPhoenix) {
  const prompt = usage.inputTokens;
  const completion = usage.outputTokens;
  let total = usage.totalTokens;
  if (total === undefined && prompt != null && completion != null) {
    total = prompt + completion;
  }
  if (prompt != null) span.setAttribute("llm.token_count.prompt", prompt);
  if (completion != null) span.setAttribute("llm.token_count.completion", completion);
  if (total != null) span.setAttribute("llm.token_count.total", total);
}

export function setPixelbotSpanKind(span: Span, kind: "CHAIN" | "LLM") {
  span.setAttribute("openinference.span.kind", kind);
  span.setAttribute("span_kind", kind);
  span.setAttribute("pixelbot.span.kind", kind);
}

export function setPixelbotSpanStatus(span: Span, status: "OK" | "ERROR") {
  span.setAttribute("otel.status_code", status);
  span.setAttribute("status", status);
  span.setAttribute("pixelbot.status", status);
}

export function createLlmStreamFinalizer(opts: {
  llmSpan: Span;
  requestSpan: Span;
}) {
  const { llmSpan, requestSpan } = opts;
  let finalized = false;

  return {
    finalizeOnce(status: "OK" | "ERROR", errorMessage?: string) {
      if (finalized) return;
      finalized = true;

      setPixelbotSpanStatus(llmSpan, status);
      llmSpan.setStatus(
        status === "OK"
          ? { code: SpanStatusCode.OK }
          : { code: SpanStatusCode.ERROR, message: errorMessage ?? "Stream error" },
      );
      llmSpan.end();

      requestSpan.setAttribute("pixelbot.response.path", "llm");
      setPixelbotSpanKind(requestSpan, "CHAIN");
      setPixelbotSpanStatus(requestSpan, status);
      requestSpan.setStatus(
        status === "OK"
          ? { code: SpanStatusCode.OK }
          : { code: SpanStatusCode.ERROR, message: errorMessage ?? "Stream error" },
      );
      requestSpan.end();
    },
  };
}
