# Project memory — Torob Bime

- Persian RTL insurance comparison demo; npm/Next, native Windows PostgreSQL (no Docker required), Prisma, Zod, Anthropic, Vitest and Playwright.
- Product schemas in `lib/schemas/` are the source of truth. UI, extraction and ranking iterate schema fields rather than branch per insurance type. Validate external and DB data.
- Every non-null value must have a verified, exact original source span, field-specific context, matching value/unit and confidence. Quote matching is not a proof of entailment. Unknown is not denied coverage.
- Companies, plans, policy texts and sample annual premiums are fictional. Label them «نمونه، قیمت واقعی نیست». Never invent insurer ratings, trust scores, real prices, model outputs or purchasing recommendations.
- Provenance is per product: «قانون‌محور (آفلاین)», «استخراج‌شده با مدل X در تاریخ Y (اسنپ‌شات)», or «زنده با مدل X». Models are selected only through `LLM_MODEL`/`LLM_MODEL_FAST`; never label rules as model output.
- Never persist user text or secrets. API privacy detection is a guard, not exhaustive. Only bounded source excerpts go to comparison clients; full sample policy goes to the explicit extraction view.
- Server logs contain fixed messages and safe error name/code only, never credentials, connection strings, provider messages, policy text or user input. Never read report files from a request handler at runtime.
- Use semantic design tokens, 13px minimum captions and 15–16px body, no negative letter-spacing in Persian, logical CSS properties, `lang=fa`/`dir=rtl`, Persian digits, keyboard support, reduced motion and light/dark themes.
- Voice: friendly respectful «شما», no slang/contractions, exaggerated claims or real-market implications. Interactive states and limitations must remain explicit.
- Rank deterministically from verified coverage, with 3× priority weight and confirmed requirements before score. Sample annual premium is a separate, clearly fictional budget/value axis, never a real quote or coverage-score input.
- Tasks and risks: `docs/redesign-plan.md`; developer and Windows setup: `README.md`/`docs/setup-windows.md`. Validate with `npm run typecheck`, `lint`, `format:check`, `test`, `eval`, `build`, and `test:e2e`.
