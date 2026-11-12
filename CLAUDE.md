# Project memory — Torob Bime

- Persian/RTL insurance comparison demo: Next.js App Router, strict TS, Tailwind, self-hosted Vazirmatn, Prisma/Postgres, Zod, Anthropic, Vitest, Playwright, npm. Windows users run native PostgreSQL; Docker is not required.
- `npm run dev`, `npm run db:deploy`, `npm run db:seed`, `npm run ingest -- fixtures/products.json --offline`, `npm run eval`, `npm run eval -- --live`, `npm run verify`, `npm run test:e2e`.
- Coverage schemas in `lib/schemas/` are the source of truth. Every component/pipeline iterates fields; do not add per-type branches. Validate DB schemas and all external inputs.
- A non-null coverage must have verbatim evidence from the policy text and confidence 0–1. Ungrounded or unknown data is null, never inferred as covered. Show source on demand.
- Every demo product/company is fictional and prominently labeled sample. Do not invent prices, ratings, trust statistics, policy facts or AI results. No purchase or live quote. Never store personal information or secrets in browser code.
- Offline sample/rule mode and live AI/DB modes are different; never label offline metrics or explanations as LLM output. LLM model is configured only via `LLM_MODEL`.
- Ranking is deterministic and relative, with clear weights and unknown-value treatment. Explicit unambiguous required boolean coverages are ranked by confirmed-condition count first, then score; unknown does not mean excluded. AI may select cited explanation facts but cannot invent values or requirements; render sentences from verified fields.
- Use logical CSS properties, `lang=fa`, `dir=rtl`, Persian digits, keyboard-accessible controls, useful async/error/empty states, and responsive layouts.
- Assumptions: 4 fictional plans per type; no real premiums or unsourced trust signals; no personal-data persistence. A checked-in sample catalogue provides a usable demo without DB/API credentials.
- Definition of done: `npm run typecheck && npm run lint && npm test && npm run eval` pass; review honesty/accessibility, test the demo on mobile and desktop when tooling is available, and document any unavailable live verification.
