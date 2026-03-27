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
OPENROUTER_MODEL=qwen/qwen3.5-plus-02-15

# Arize Phoenix local telemetry
PHOENIX_COLLECTOR_ENDPOINT=http://127.0.0.1:6006/v1/traces
PHOENIX_PROJECT_NAME=pixel-bot-local
# Optional (used for Phoenix Cloud). Keep empty for local.
PHOENIX_API_KEY=
```

### 3) Run
```bash
npm run dev
```

Open:
- http://localhost:3000

### 4) (Optional) Run local Arize Phoenix telemetry
Start Phoenix locally in a separate terminal:

```bash
pip install -U arize-phoenix
phoenix serve
```

Then open:
- http://127.0.0.1:6006

## How it works

### Chat
- Frontend: `app/page.tsx` uses the Vercel AI SDK `useChat` hook.
- Backend: `app/api/chat/route.ts` uses `streamText` and returns `toUIMessageStreamResponse()` for streaming UX.
- Admin mode: `app/page.tsx` exposes a session-level config panel for tone and boundary summary.
- LLM telemetry: `streamText` runs with `experimental_telemetry` enabled so local Phoenix can receive model-call traces.

### Knowledge base + retrieval
- The KB lives in `src/lib/knowledge-base.ts` (12 Q&As).
- `src/lib/retrieval.ts` does a lightweight keyword/token overlap scoring to pick the most relevant snippets for the current user message.

### Behavior logic
- `src/lib/handoff.ts` detects recommendation intent (budget + form factor) and broken-device handoff readiness (ZIP + issue signals).
- `src/lib/handoff.ts` also classifies out-of-scope requests.
- The API route enforces deterministic guardrails first (scope handling, recommendation clarifiers, exact handoff phrase), then uses LLM generation for normal in-scope questions.

## Product decisions
- **Configurable support persona**: session-level admin controls make the prototype feel like an agent platform.
- **Deterministic critical paths**: scope boundaries and escalation/handoff are code-enforced for reliability.
- **Retrieval-first responses**: weighted retrieval favors title/tags/question relevance over long-answer noise.
- **Guided first-turn UX**: starter prompt chips and capability framing reduce blank-screen friction and drive realistic support flows.

## What admin/config mode demonstrates
- A business owner can tune assistant tone and boundaries without code edits.
- The handoff trigger phrase remains locked for compliance and consistent escalation.
- Config is session-level in this prototype, showing a path to persisted settings.

## Manual test matrix
1. **Recommendation clarification**
   - Input: “Recommend me a handheld for GBA under $100.”
   - Expected: asks for any missing budget/form-factor details before recommendation.
2. **Broken-device escalation**
   - Input: “My handheld screen is cracked” + ZIP + issue details.
   - Expected: outputs exactly: `I'll connect you with a human technician to finalize your repair quote.`
3. **Out-of-scope boundary**
   - Input: weather/crypto/medical/legal unrelated questions.
   - Expected: polite refusal with redirection to retro-handheld/store-policy scope.
4. **KB-grounded policy**
   - Input: “What is your return window?”
   - Expected: answer aligns with the KB return policy.
5. **Admin mode impact**
   - Change tone text in Admin mode and ask a new question.
   - Expected: response style reflects updated tone instructions.

## Phoenix telemetry validation (LLM calls only)
1. Start Phoenix (`phoenix serve`) and confirm UI is reachable at `http://127.0.0.1:6006`.
2. Start the app (`npm run dev`) and send one deterministic guardrail prompt (for example, an out-of-scope request) and one in-scope prompt that reaches the model.
3. In Phoenix UI, clear the filter box and keep `Root Spans: All`.
4. Confirm traces appear under project `pixel-bot-local` (or your `PHOENIX_PROJECT_NAME`) and verify:
   - Route span `pixelbot.chat.request` has non-empty status.
   - LLM path includes `pixelbot.chat.llm` with model metadata.
   - Guardrail path sets `pixelbot.response.path=guardrail` and reason attributes.
5. If rows still appear as generic HTTP spans only, restart `npm run dev` after env/config edits and retry both prompts.

### If `kind` or `status` still look empty/unknown in Phoenix
- Clear the filter box first. A filter like `span_kind == 'LLM'` can hide all rows if indexing is delayed.
- Keep `Root Spans` as `All`, then add columns for `name`, `span_kind`, `status`, and `openinference.span.kind`.
- Open one `pixelbot.chat.request` row and verify attributes include:
  - `span_kind=CHAIN`
  - `otel.status_code=OK` (or `ERROR`)
  - `status=OK` (or `ERROR`)
- Open one `pixelbot.chat.llm` row and verify attributes include:
  - `span_kind=LLM`
  - `openinference.span.kind=LLM`
  - `llm.model_name=<your model>`
- Known-good filter examples:
  - `name contains 'pixelbot.chat'`
  - `span_kind == 'LLM'`
- Note: instrumentation exports a focused subset of spans (`pixelbot.chat*`, `ai.streamText*`, or spans with `openinference.span.kind`) to reduce noisy framework rows like `POST /api/chat`.

## Product walkthrough script (demo-ready)
1. **Opening (15-20s)**: “PixelBot is a retro handheld support agent for firmware/setup, recommendations, and store policy questions.”
2. **User journey (60-90s)**:
   - Start from empty state and click a starter chip.
   - Show recommendation clarifier behavior (budget + form factor).
   - Show broken-device flow ending with the exact human handoff phrase.
3. **Owner journey (45-60s)**:
   - Open Admin mode, switch tone/boundary presets, and show style change in next answer.
   - Highlight locked handoff phrase for compliance consistency.
4. **Reliability & observability (30-45s)**:
   - Explain deterministic guardrails in API route.
   - Show Phoenix trace for one request and call out latency plus token/cost attributes.

## Rubric mapping (CSA overview)
- **Technical execution (30%)**: streaming chat, KB retrieval, deterministic guardrails, telemetry-backed tracing/cost attributes.
- **Product thinking (30%)**: guided first turn, clear boundaries, recommendation/handoff journeys, and admin controls.
- **Communication (20%)**: runnable local setup, manual test matrix, and explicit walkthrough script.
- **Creativity and ambition (20%)**: blended deterministic + LLM behavior, configurable admin mode, and observability polish.

## Next 3 features (real product path)
1. **Tool-calling for real operations**: mock order lookup / repair ticket creation with confirmation messages.
2. **Persistent business settings**: save admin tone/boundary presets and add role-based edit access.
3. **Session analytics dashboard**: top intents, unresolved queries, handoff rate, and recommendation conversion.

