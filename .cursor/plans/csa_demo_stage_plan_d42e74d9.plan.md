---
name: CSA Demo Stage Plan
overview: "Align the pixel-bot project with CSA-Overview submission readiness: verify the codebase against required scope, complete any small README/write-up gaps for the rubric’s Communication dimension, then execute a structured 3–5 minute demo recording and repository handoff (GitHub access)."
todos:
  - id: preflight
    content: "Run demo pre-flight: env, optional Phoenix, lint/test, full manual test matrix"
    status: pending
  - id: writeup-gap
    content: "Add or tighten README (or short linked doc): why this business + end-user problem in explicit CSA wording"
    status: pending
  - id: record-video
    content: "Record 3–5 min Loom/QuickTime: product path, technical tour, reflection/trade-offs/next 3"
    status: pending
  - id: github-handoff
    content: Confirm GitHub visibility/access; README matches run commands and deliverable links
    status: pending
isProject: false
---

# Plan: CSA “Demo stage” (submission-ready)

[CSA-Overview.md](file:///Users/boyu/Documents/vault/CSA-Overview.md) frames success as **three deliverables**, not a separate engineering milestone:

1. **Working code** + `README.md` (run instructions, stack, what you built, what’s next)
2. **Demo video (3–5 minutes)** — product walkthrough, technical walkthrough, reflection
3. **Short write-up** (README or separate doc) — business/use case and **why**, **problem for the end user**, **AI tools** (what worked / didn’t), **next 3 features**

Your repo already implements the **minimum scope** (business context, chat UI, KB + retrieval, persona/instructions, boundaries/handoff) and several **optional** items (streaming, handoff, admin/config, telemetry). The gap to “Demo stage” is mostly **verification**, **communication deliverables**, and **recording**—not large feature work unless you want extra polish.

---

## Current state vs CSA requirements


| CSA requirement        | Where it lives in pixel-bot                                                                                 |
| ---------------------- | ----------------------------------------------------------------------------------------------------------- |
| Business context       | Retro handheld shop; see [README.md](README.md) opening                                                     |
| Chat UI                | `app/page.tsx`, Vercel AI SDK `useChat`, streaming via API route                                            |
| Knowledge base         | [src/lib/knowledge-base.ts](src/lib/knowledge-base.ts), [src/lib/retrieval.ts](src/lib/retrieval.ts)        |
| Persona / instructions | [src/lib/chat-prompt.ts](src/lib/chat-prompt.ts), admin tone in UI                                          |
| Boundaries / handoff   | [src/lib/handoff.ts](src/lib/handoff.ts), [src/lib/chat-path.ts](src/lib/chat-path.ts), `POST /api/handoff` |
| README run + stack     | [README.md](README.md) Quickstart + “How it works”                                                          |
| Next 3 features        | README “Next 3 features (real product path)”                                                                |
| AI tooling reflection  | README “AI tooling (Cursor / LLM assistants)”                                                               |


**Write-up gap (rubric Communication):** CSA explicitly asks for **why you chose this business** and **what problem the agent solves for the end user** as distinct bullets. The README explains *what* PixelBot is and lists capabilities; you may want **2–4 sentences** (same doc or a short `CSA-NOTES.md`) that state **why retro handhelds** and **user problem** in one place so a reviewer does not hunt for them.

---

## Phase 1 — Pre-flight (before recording)

Follow your existing [Demo pre-flight checklist](README.md) (lines ~166–170):

- Valid `OPENROUTER_API_KEY` in `.env.local`; restart dev server after changes.
- Optional: `phoenix serve` if the technical segment will show traces ([Phoenix validation section](README.md)).
- Run `npm run lint` and `npm test` after any last-minute code edits.
- Walk the **[Manual test matrix](README.md)** once end-to-end (recommendation clarifier, repair + mock ticket, out-of-scope, KB policy, admin tone).

This satisfies CSA’s expectation that the project is **runnable with minimal setup** and behaves predictably on camera.

---

## Phase 2 — Demo video (3–5 minutes), mapped to CSA

CSA’s three segments map cleanly to your **[Product walkthrough script](README.md)** (demo-ready section), with one addition: a **reflection** closer.

Suggested timing (adjust to your pace):

1. **Product walkthrough (~60–90s)** — Who is this for? Open the app, use a starter chip, show recommendation clarifier (budget + form factor), then broken-device flow through the **exact** handoff phrase and **mock ticket** (`DEMO-…`). Optionally one out-of-scope or policy question from the matrix.
2. **Technical walkthrough (~60–90s)** — Briefly show: `app/api/chat/route.ts` (path resolution + streaming), `knowledge-base` + `retrieval`, `handoff` / `chat-path` guardrails, admin panel wiring. If showing Phoenix: one trace (`pixelbot.chat.request` / `pixelbot.handoff.mock_ticket`) as in README.
3. **Reflection (~45–60s)** — Trade-offs (already in README “Trade-offs”), **next 3 features**, and what you’d improve with more time—this mirrors CSA’s explicit ask and the **Communication** dimension.

**Tools:** Loom, QuickTime, or any screen recorder; record at a resolution where code and chat are readable.

---

## Phase 3 — Repository and handoff

- Ensure **GitHub** repo is accessible (public, or private with reviewer access per CSA).
- Confirm **README** still matches actual commands (`npm install`, `npm run dev`, optional tests/Phoenix)—no stale paths or env names.
- If you add a **separate short doc** for the write-up, link it from the README so deliverable (3) is obvious.

---

## Optional polish (only if time before recording)

- Tighten one confusing UX path found during the manual matrix (prefer small, verifiable fixes).
- Add the **why / user problem** prose to README (or `CSA-NOTES.md`) if not already explicit—high impact for Communication with minimal scope creep.

---

## Success criteria for “Demo stage”

- CSA minimum scope demonstrable in one sitting (chat + KB + boundaries + persona).
- Demo video covers **product**, **technical**, and **reflection** in ~3–5 minutes.
- Write-up covers **business + why**, **end-user problem**, **AI tools**, **next 3 features** (README and/or linked doc).
- Repo runs from README steps; tests/lint pass if you touched code.

No code changes are strictly required to reach Demo stage if pre-flight passes and deliverables (2)–(3) are produced; the plan is intentionally **submission- and communication-focused** per CSA-Overview.