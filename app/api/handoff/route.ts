import { NextResponse } from "next/server";
import {
  ROOT_CONTEXT,
  SpanKind,
  SpanStatusCode,
  trace,
} from "@opentelemetry/api";
import { setPixelbotSpanKind, setPixelbotSpanStatus } from "@/lib/chat-otel";
import { createDemoTicketId } from "@/lib/demo-ticket";

export const maxDuration = 30;

function jsonError(status: number, error: string) {
  return NextResponse.json({ error }, { status });
}

export async function POST(req: Request) {
  const tracer = trace.getTracer("pixel-bot.chat");

  return tracer.startActiveSpan(
    "pixelbot.handoff.mock_ticket",
    { kind: SpanKind.SERVER },
    ROOT_CONTEXT,
    async (span) => {
      span.setAttribute("openinference.span.kind", "CHAIN");
      span.setAttribute("span_kind", "CHAIN");
      span.setAttribute("pixelbot.component", "api.handoff");
      span.setAttribute("http.route", "/api/handoff");
      span.setAttribute("http.method", "POST");

      try {
        let raw: unknown;
        try {
          raw = await req.json();
        } catch {
          setPixelbotSpanKind(span, "CHAIN");
          setPixelbotSpanStatus(span, "ERROR");
          span.setStatus({ code: SpanStatusCode.ERROR, message: "Invalid JSON" });
          span.end();
          return jsonError(400, "Invalid JSON");
        }

        const body = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
        const reason = typeof body.reason === "string" ? body.reason : undefined;
        const messageCount =
          typeof body.messageCount === "number" && Number.isFinite(body.messageCount)
            ? body.messageCount
            : undefined;

        const ticketId = createDemoTicketId();
        const createdAt = new Date().toISOString();

        span.setAttribute("pixelbot.handoff.ticket_id", ticketId);
        if (reason) span.setAttribute("pixelbot.handoff.reason", reason);
        if (messageCount != null) span.setAttribute("pixelbot.handoff.message_count", messageCount);

        console.info("[pixelbot.handoff] mock ticket", { ticketId, reason, messageCount });

        setPixelbotSpanKind(span, "CHAIN");
        setPixelbotSpanStatus(span, "OK");
        span.setStatus({ code: SpanStatusCode.OK });
        span.end();

        return NextResponse.json({ ticketId, createdAt });
      } catch (error) {
        span.recordException(error as Error);
        setPixelbotSpanKind(span, "CHAIN");
        setPixelbotSpanStatus(span, "ERROR");
        span.setStatus({
          code: SpanStatusCode.ERROR,
          message: error instanceof Error ? error.message : "Unknown error",
        });
        span.end();
        return jsonError(500, "Internal error");
      }
    },
  );
}
