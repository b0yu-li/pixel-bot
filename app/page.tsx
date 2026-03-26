"use client";

import { useChat } from "@ai-sdk/react";
import { useMemo, useState } from "react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";

export default function Page() {
  const {
    messages,
    sendMessage,
    status,
    error,
  } = useChat({
    transport: new DefaultChatTransport({ api: "/api/chat" }),
  });

  const [input, setInput] = useState("");

  const isLoading = useMemo(() => {
    // `status` is a finite state machine; treat anything non-ready as "loading".
    return status !== "ready" && status !== "error";
  }, [status]);

  return (
    <main className="container">
      <div className="titleRow">
        <h1>PixelBot</h1>
      </div>
      <p className="tagline">
        Retro handheld support agent prototype. Ask about firmware, setup, and
        store policies.
      </p>

      <section className="chat" aria-label="Chat transcript">
        {messages.length === 0 ? (
          <div className="content" style={{ color: "var(--muted)" }}>
            Start by asking a question like: “What firmware should I use for
            PS1?”
          </div>
        ) : (
          messages.map((m) => (
            <div key={m.id} className={`msg ${m.role}`}>
              <div className="roleBadge">
                {m.role === "assistant" ? "PixelBot" : "You"}
              </div>
              <div className="content">
                <ReactMarkdown skipHtml={true}>
                  {m.parts
                    .filter((p) => p.type === "text")
                    .map((p) => p.text)
                    .join("")}
                </ReactMarkdown>
              </div>
            </div>
          ))
        )}

        {isLoading ? (
          <div className="msg assistant">
            <div className="roleBadge">PixelBot</div>
            <div className="content">Thinking...</div>
          </div>
        ) : null}
      </section>

      <form
        className="composer"
        onSubmit={(e) => {
          e.preventDefault();
          const text = input.trim();
          if (!text) return;
          setInput("");
          sendMessage({ text });
        }}
      >
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
          Send
        </button>
      </form>

      {error ? (
        <p className="error">
          Something went wrong:{" "}
          {error instanceof Error ? error.message : String(error)}
        </p>
      ) : null}
    </main>
  );
}

