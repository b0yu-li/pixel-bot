import { registerOTel } from "@vercel/otel";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { OpenInferenceSimpleSpanProcessor } from "@arizeai/openinference-vercel";
import { SEMRESATTRS_PROJECT_NAME } from "@arizeai/openinference-semantic-conventions";

export function register() {
  const collectorEndpoint =
    process.env.PHOENIX_COLLECTOR_ENDPOINT ?? "http://127.0.0.1:6006/v1/traces";
  const projectName = process.env.PHOENIX_PROJECT_NAME ?? "pixel-bot-local";
  const apiKey = process.env.PHOENIX_API_KEY ?? "";

  registerOTel({
    serviceName: "pixel-bot",
    attributes: {
      [SEMRESATTRS_PROJECT_NAME]: projectName,
    },
    spanProcessors: [
      new OpenInferenceSimpleSpanProcessor({
        exporter: new OTLPTraceExporter({
          url: collectorEndpoint,
          headers: {
            Authorization: apiKey ? `Bearer ${apiKey}` : "",
            api_key: apiKey,
          },
        }),
      }),
    ],
  });
}

