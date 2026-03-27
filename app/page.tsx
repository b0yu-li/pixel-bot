"use client";

import { useChat } from "@ai-sdk/react";
import { useEffect, useMemo, useRef, useState } from "react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";

type RuntimeConfig = {
  tone: string;
  boundarySummary: string;
};

const DEFAULT_TONE = "Friendly, nostalgic, tech-savvy, and concise.";
const DEFAULT_BOUNDARY_SUMMARY =
  "Only support retro handheld firmware/setup/compatibility and store policies. Decline unrelated requests politely.";

const HANDOFF_TRIGGER_PHRASE =
  "I'll connect you with a human technician to finalize your repair quote.";

const TONE_PRESETS = [
  {
    id: "concise",
    label: "Concise",
    value: "Helpful and concise. Keep answers short, practical, and direct.",
  },
  {
    id: "warm",
    label: "Warm",
    value:
      "Friendly, encouraging, and patient. Keep technical guidance simple and reassuring.",
  },
  {
    id: "expert",
    label: "Expert",
    value:
      "Technical and precise. Explain trade-offs clearly and include concrete setup advice.",
  },
] as const;

const BOUNDARY_PRESETS = [
  {
    id: "strict",
    label: "Strict Scope",
    value:
      "Only support retro handheld firmware/setup/compatibility and store policies. Decline unrelated requests politely.",
  },
  {
    id: "assistive",
    label: "Assistive Scope",
    value:
      "Support retro handheld firmware/setup/compatibility and store policies only. For unrelated requests, refuse briefly and redirect to supported topics.",
  },
] as const;

const STARTER_PROMPTS = [
  {
    id: "firmware",
    label: "Firmware Setup",
    text: "What firmware should I use for PS1 games on a retro handheld?",
  },
  {
    id: "recommend",
    label: "Get Recommendation",
    text: "Can you recommend a retro handheld under $120 for GBA and SNES?",
  },
  {
    id: "repair",
    label: "Repair Handoff",
    text: "My handheld screen is cracked and I need a repair quote.",
  },
  {
    id: "policy",
    label: "Store Policy",
    text: "What is your return window and what condition is required?",
  },
] as const;

export default function Page() {
  const [adminOpen, setAdminOpen] = useState(false);
  const [runtimeConfig, setRuntimeConfig] = useState<RuntimeConfig>({
    tone: DEFAULT_TONE,
    boundarySummary: DEFAULT_BOUNDARY_SUMMARY,
  });

  const transport = useMemo(
    () =>
      new DefaultChatTransport({
        api: "/api/chat",
        body: {
          runtimeConfig,
        },
      }),
    [runtimeConfig],
  );

  const {
    messages,
    sendMessage,
    setMessages,
    status,
    error,
  } = useChat({
    transport,
  });

  const [input, setInput] = useState("");
  const transcriptEndRef = useRef<HTMLDivElement | null>(null);

  const isLoading = useMemo(() => {
    // `status` is a finite state machine; treat anything non-ready as "loading".
    return status !== "ready" && status !== "error";
  }, [status]);

  const statusLabel = useMemo(() => {
    if (status === "error") return "Error";
    if (status === "ready") return "Ready";
    return "Streaming";
  }, [status]);

  const latestAssistantMessageId = useMemo(() => {
    for (let i = messages.length - 1; i >= 0; i -= 1) {
      if (messages[i]?.role === "assistant") return messages[i].id;
    }
    return null;
  }, [messages]);

  const messageText = (message: (typeof messages)[number]) =>
    message.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("")
      .trimEnd();

  const showStandaloneLoading = isLoading && !latestAssistantMessageId;

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  const submitText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    sendMessage({ text: trimmed });
  };

  const resetConversation = () => {
    setMessages([]);
    setInput("");
  };

  return (
    <main className="container">
      <div className="titleRow">
        <div className="titleBlock">
          <span className="hudLabel">PXL-OS CONSOLE v1.0</span>
          <h1 className="pixelTitle">PixelBot</h1>
        </div>
        <div className="headerActions">
          <span
            className={`statusPill ${
              status === "error"
                ? "statusError"
                : status === "ready"
                  ? "statusReady"
                  : "statusStreaming"
            }`}
          >
            {statusLabel}
          </span>
          <button type="button" onClick={resetConversation} className="ghostButton">
            New Chat
          </button>
        </div>
      </div>
      <p className="tagline pixelTagline">
        Retro handheld support agent prototype. Ask about firmware, setup, and
        store policies.
      </p>

      <section className="adminPanel" aria-label="Admin config panel">
        <div className="panelLabel">Admin Config</div>
        <button
          type="button"
          className="adminToggle"
          onClick={() => setAdminOpen((v) => !v)}
          aria-expanded={adminOpen}
          aria-controls="admin-config-content"
        >
          {adminOpen ? "Hide Admin Mode" : "Show Admin Mode"}
        </button>

        {adminOpen ? (
          <div id="admin-config-content" className="adminContent">
            <label className="adminField">
              <span>Persona tone</span>
              <textarea
                value={runtimeConfig.tone}
                onChange={(e) =>
                  setRuntimeConfig((prev) => ({ ...prev, tone: e.target.value }))
                }
                rows={2}
              />
            </label>

            <label className="adminField">
              <span>Boundary policy summary</span>
              <textarea
                value={runtimeConfig.boundarySummary}
                onChange={(e) =>
                  setRuntimeConfig((prev) => ({
                    ...prev,
                    boundarySummary: e.target.value,
                  }))
                }
                rows={3}
              />
            </label>

            <label className="adminField">
              <span>Handoff trigger phrase (locked)</span>
              <textarea value={HANDOFF_TRIGGER_PHRASE} rows={2} disabled />
            </label>

            <div className="adminField">
              <span>Quick presets</span>
              <div className="adminPresets">
                {TONE_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="chip"
                    onClick={() =>
                      setRuntimeConfig((prev) => ({ ...prev, tone: preset.value }))
                    }
                  >
                    Tone: {preset.label}
                  </button>
                ))}
                {BOUNDARY_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    className="chip"
                    onClick={() =>
                      setRuntimeConfig((prev) => ({
                        ...prev,
                        boundarySummary: preset.value,
                      }))
                    }
                  >
                    Boundary: {preset.label}
                  </button>
                ))}
                <button
                  type="button"
                  className="chip"
                  onClick={() =>
                    setRuntimeConfig({
                      tone: DEFAULT_TONE,
                      boundarySummary: DEFAULT_BOUNDARY_SUMMARY,
                    })
                  }
                >
                  Restore All Defaults
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      <section className="chat" aria-label="Chat transcript">
        <div className="panelLabel chatLabel">Live Transcript</div>
        {messages.length === 0 ? (
          <>
            <div className="emptyState">
              <h2>What PixelBot can do</h2>
              <ul>
                <li>Firmware and emulator setup guidance for retro handhelds</li>
                <li>Recommendations based on budget and form factor</li>
                <li>Store policy answers (returns, shipping, warranty basics)</li>
                <li>Repair-quote handoff when issue details + ZIP are provided</li>
              </ul>
            </div>
            <div className="starterChips" aria-label="Starter prompts">
              {STARTER_PROMPTS.map((prompt) => (
                <button
                  key={prompt.id}
                  type="button"
                  className="chip"
                  onClick={() => submitText(prompt.text)}
                  disabled={isLoading}
                >
                  {prompt.label}
                </button>
              ))}
            </div>
          </>
        ) : (
          messages.map((m) => (
            (() => {
              const text = messageText(m);
              const isStreamingAssistant =
                isLoading &&
                m.role === "assistant" &&
                m.id === latestAssistantMessageId;

              return (
             <div
               key={m.id}
               className={`msg msgEnter ${m.role} ${
                isStreamingAssistant && text.trim()
                   ? "streamingText"
                   : ""
               }`}
             >
              <div className="roleBadge">
                <span
                  className={`avatar ${m.role === "assistant" ? "assistant" : "user"}`}
                  aria-hidden="true"
                >
                  {m.role === "assistant" ? "PB" : "U"}
                </span>
                <span className="roleName">
                  {m.role === "assistant" ? "PixelBot" : "You"}
                </span>
              </div>
              <div className="content">
                {isStreamingAssistant && !text.trim() ? (
                  <div className="typingIndicator" aria-label="PixelBot is thinking">
                    <span />
                    <span />
                    <span />
                  </div>
                ) : (
                  <ReactMarkdown skipHtml={true}>{text}</ReactMarkdown>
                )}
              </div>
            </div>
              );
            })()
          ))
        )}

        {showStandaloneLoading ? (
          <div className="msg assistant loadingMsg msgEnter">
            <div className="roleBadge">
              <span className="avatar assistant" aria-hidden="true">
                PB
              </span>
              <span className="roleName">PixelBot</span>
            </div>
            <div className="content">
              <div className="typingIndicator" aria-label="PixelBot is thinking">
                <span />
                <span />
                <span />
              </div>
            </div>
          </div>
        ) : null}
        <div ref={transcriptEndRef} />
      </section>

      <div className="composerDock">
        <form
          className="composer consoleInputBar"
          onSubmit={(e) => {
            e.preventDefault();
            submitText(input);
          }}
        >
          <span className="inputPrompt" aria-hidden="true">
            &gt;
          </span>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about retro handhelds..."
            disabled={isLoading}
            name="input"
            aria-label="Chat input"
          />
          <button type="submit" disabled={isLoading || !input.trim()}>
            {isLoading ? (
              <span className="buttonLoading">
                <span className="spinner" />
                Sending...
              </span>
            ) : (
              "Send"
            )}
          </button>
        </form>
      </div>

      {error ? (
        <p className="error">
          Something went wrong:{" "}
          {error instanceof Error ? error.message : String(error)}. Try again,
          or use one of the starter prompts to restart the flow.
        </p>
      ) : null}
    </main>
  );
}

