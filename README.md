# PixelBot (Retro Handheld Support Agent)

## What this is
PixelBot is a prototype AI customer support agent for a retro handheld shop. It answers questions using a small local knowledge base (firmware/setup/help + store policies), and it includes:

- Lead qualification: when the user asks for a recommendation, it asks for budget + preferred form factor before recommending anything.
- Human handoff (mock): when a user reports a broken device and provides both ZIP code + issue details, it outputs the exact trigger phrase:
  > I'll connect you with a human technician to finalize your repair quote.

## Quickstart

### 1) Install
```bash
npm install
```

### 2) Configure environment
Create a file named `.env.local` and set:
```bash
OPENROUTER_API_KEY=your_openrouter_api_key
```

### 3) Run
```bash
npm run dev
```

Open:
- http://localhost:3000

## How it works

### Chat
- Frontend: `app/page.tsx` uses the Vercel AI SDK `useChat` hook.
- Backend: `app/api/chat/route.ts` uses `streamText` and returns `toUIMessageStreamResponse()` for streaming UX.

### Knowledge base + retrieval
- The KB lives in `src/lib/knowledge-base.ts` (12 Q&As).
- `src/lib/retrieval.ts` does a lightweight keyword/token overlap scoring to pick the most relevant snippets for the current user message.

### Behavior logic
- `src/lib/handoff.ts` detects recommendation intent (budget + form factor) and broken-device handoff readiness (ZIP + issue signals).
- The API route builds a system prompt that combines persona boundaries + retrieved snippets + the handoff/lead-qualification rules.

## Next improvements (if more time)
- Replace the toy retrieval scoring with embeddings (still local) for better grounding.
- Add a small “admin/config view” to edit the KB and persona instructions.
- Add analytics: store chat transcripts to an in-memory log with simple metrics.

