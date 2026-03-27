import { registerOTel } from "@vercel/otel";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OpenInferenceSimpleSpanProcessor } from "@arizeai/openinference-vercel";
import { SEMRESATTRS_PROJECT_NAME } from "@arizeai/openinference-semantic-conventions";
import type { Context } from "@opentelemetry/api";
import type { ReadableSpan, Span, SpanProcessor } from "@opentelemetry/sdk-trace-base";

class FilteredSpanProcessor implements SpanProcessor {
  constructor(
    private readonly inner: SpanProcessor,
    private readonly shouldExport: (span: ReadableSpan) => boolean,
  ) {}

  onStart(span: Span, parentContext: Context): void {
    this.inner.onStart(span, parentContext);
  }

  onEnd(span: ReadableSpan): void {
    if (this.shouldExport(span)) {
      this.inner.onEnd(span);
    }
  }

  shutdown(): Promise<void> {
    return this.inner.shutdown();
  }

  forceFlush(): Promise<void> {
    return this.inner.forceFlush();
  }
}

export function register() {
  const collectorEndpoint =
    process.env.PHOENIX_COLLECTOR_ENDPOINT ?? "http://127.0.0.1:6006/v1/traces";
  const projectName = process.env.PHOENIX_PROJECT_NAME ?? "pixel-bot-local";
  const apiKey = process.env.PHOENIX_API_KEY ?? "";
  const exporterHeaders = apiKey
    ? {
        Authorization: `Bearer ${apiKey}`,
        api_key: apiKey,
      }
    : undefined;

  registerOTel({
    serviceName: "pixel-bot",
    attributes: {
      [SEMRESATTRS_PROJECT_NAME]: projectName,
    },
    spanProcessors: [
      new FilteredSpanProcessor(
        new OpenInferenceSimpleSpanProcessor({
          exporter: new OTLPTraceExporter({
            url: collectorEndpoint,
            headers: exporterHeaders,
          }),
        }),
        (span) => {
          const name = span.name ?? "";
          const hasOpenInferenceKind = typeof span.attributes?.["openinference.span.kind"] === "string";
          return (
            name.startsWith("pixelbot.chat") ||
            name.startsWith("ai.streamText") ||
            hasOpenInferenceKind
          );
        },
      ),
    ],
  });
}

