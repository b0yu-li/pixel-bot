"use client";

import { useChat } from "@ai-sdk/react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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

type MockHandoffTicketState =
  | { phase: "loading" }
  | { phase: "ok"; ticketId: string; createdAt: string }
  | { phase: "error"; message: string };

export default function Page() {
  const [isBooting, setIsBooting] = useState(true);
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

  const messageText = useCallback((message: (typeof messages)[number]) => {
    return message.parts
      .filter((p) => p.type === "text")
      .map((p) => p.text)
      .join("")
      .trimEnd();
  }, []);

  const handoffRequestedRef = useRef(new Set<string>());
  const [mockHandoffTickets, setMockHandoffTickets] = useState<
    Record<string, MockHandoffTicketState>
  >({});

  const showStandaloneLoading =
    isLoading &&
    (messages.length === 0 || messages.at(-1)?.role !== "assistant");

  useEffect(() => {
    transcriptEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, status]);

  useEffect(() => {
    if (status !== "ready") return;
    for (const m of messages) {
      if (m.role !== "assistant") continue;
      const t = messageText(m);
      if (t !== HANDOFF_TRIGGER_PHRASE) continue;
      if (handoffRequestedRef.current.has(m.id)) continue;
      handoffRequestedRef.current.add(m.id);
      setMockHandoffTickets((prev) => ({ ...prev, [m.id]: { phase: "loading" } }));
      void (async () => {
        try {
          const res = await fetch("/api/handoff", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              reason: "repair_handoff",
              messageCount: messages.length,
            }),
          });
          const data = (await res.json()) as {
            ticketId?: string;
            createdAt?: string;
            error?: string;
          };
          if (!res.ok) {
            throw new Error(data?.error ?? `HTTP ${res.status}`);
          }
          if (!data.ticketId || !data.createdAt) {
            throw new Error("Invalid response");
          }
          const ticketId = data.ticketId;
          const createdAt = data.createdAt;
          setMockHandoffTickets((prev) => ({
            ...prev,
            [m.id]: {
              phase: "ok",
              ticketId,
              createdAt,
            },
          }));
        } catch (e) {
          setMockHandoffTickets((prev) => ({
            ...prev,
            [m.id]: {
              phase: "error",
              message: e instanceof Error ? e.message : "Request failed",
            },
          }));
        }
      })();
    }
  }, [messages, status, messageText]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setIsBooting(false);
    }, 1400);
    return () => {
      window.clearTimeout(timer);
    };
  }, []);

  const submitText = (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    setInput("");
    sendMessage({ text: trimmed }, { body: { runtimeConfig } });
  };

  const resetConversation = () => {
    setMessages([]);
    setInput("");
    handoffRequestedRef.current.clear();
    setMockHandoffTickets({});
  };

  const copyTicketId = useCallback(async (ticketId: string) => {
    try {
      await navigator.clipboard.writeText(ticketId);
    } catch {}
  }, []);

  return (
    <main className="container">
      {isBooting ? (
        <section
          className="bootOverlay"
          role="status"
          aria-live="polite"
          aria-label="PixelBot is booting"
        >
          <div className="bootPanel">
            <p className="bootTitle">INITIALIZING PIXELBOT...</p>
            <p className="bootSubline">Loading retro support modules</p>
            <div className="bootProgress" aria-hidden="true">
              <span />
            </div>
            <p className="bootHint">Press Start to continue</p>
          </div>
        </section>
      ) : null}
      <div className="titleRow">
        <div className="titleBlock">
          <span className="hudLabel">
            PXL-OS CONSOLE v1.0
            <span className="hudLights" aria-hidden="true">
              <span className="hudLight" />
              <span className="hudLight" />
              <span className="hudLight" />
            </span>
          </span>
          <div className="brandLockup" aria-label="Pixel Bot brand">
            <h1 className="pixelTitle">
              <span>Pixel</span>
              <span>Bot</span>
            </h1>
            <svg
              className="brandLogo"
              viewBox="0 0 96 56"
              role="img"
              aria-label="Retro controller logo"
            >
              <defs>
                <linearGradient id="pb-shell" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#343083" />
                  <stop offset="100%" stopColor="#1d1a4f" />
                </linearGradient>
              </defs>
              <rect x="3" y="20" width="90" height="28" rx="8" fill="url(#pb-shell)" />
              <rect x="11" y="11" width="74" height="18" rx="7" fill="url(#pb-shell)" />
              <rect x="0" y="18" width="96" height="32" rx="9" fill="none" className="logoShell" />
              <rect x="19" y="25" width="18" height="6" className="logoNeon" />
              <rect x="25" y="19" width="6" height="18" className="logoNeon" />
              <circle cx="66" cy="28" r="6" className="logoAccentA" />
              <circle cx="79" cy="36" r="6" className="logoAccentB" />
              <rect x="44" y="33" width="8" height="3" className="logoStartSelect" />
              <rect x="54" y="33" width="8" height="3" className="logoStartSelect" />
            </svg>
          </div>
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
          className="adminToggle secondaryButton"
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
              const ticket = mockHandoffTickets[m.id];
              const isStreamingAssistant =
                isLoading &&
                m.role === "assistant" &&
                messages.length > 0 &&
                messages.at(-1)?.id === m.id;

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
                {ticket ? (
                  <div className="mockHandoffCard" aria-live="polite">
                    <div className="mockHandoffCardTitle">Mock repair ticket (demo)</div>
                    {ticket.phase === "loading" ? (
                      <p className="mockHandoffCardLine">Creating demo ticket…</p>
                    ) : null}
                    {ticket.phase === "ok" ? (
                      <>
                        <p className="mockHandoffTicketId">
                          <code>{ticket.ticketId}</code>
                        </p>
                        <p className="mockHandoffCardMeta">
                          {new Date(ticket.createdAt).toLocaleString()}
                        </p>
                        <button
                          type="button"
                          className="ghostButton mockHandoffCopy"
                          onClick={() => void copyTicketId(ticket.ticketId)}
                        >
                          Copy ID
                        </button>
                        <p className="mockHandoffFootnote">
                          No external system—shown for prototype escalation only.
                        </p>
                      </>
                    ) : null}
                    {ticket.phase === "error" ? (
                      <p className="mockHandoffError" role="alert">
                        {ticket.message}
                      </p>
                    ) : null}
                  </div>
                ) : null}
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
          <button
            type="submit"
            className="primaryButton"
            disabled={isLoading || !input.trim()}
          >
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
        <p className="error" role="alert">
          {(() => {
            const msg =
              error instanceof Error ? error.message : String(error);
            const lower = msg.toLowerCase();
            if (
              lower.includes("openrouter") ||
              lower.includes("api key") ||
              lower.includes("unauthorized") ||
              lower.includes("401")
            ) {
              return (
                <>
                  AI service isn’t configured or the key was rejected. Add{" "}
                  <code>OPENROUTER_API_KEY</code> to <code>.env.local</code>{" "}
                  (see README), restart <code>npm run dev</code>, then try again.
                </>
              );
            }
            return (
              <>
                Something went wrong: {msg}. Try again, or use a starter prompt
                to restart the flow.
              </>
            );
          })()}
        </p>
      ) : null}
    </main>
  );
}

