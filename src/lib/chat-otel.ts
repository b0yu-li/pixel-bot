import type { Span } from "@opentelemetry/api";
import { SpanStatusCode } from "@opentelemetry/api";

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
