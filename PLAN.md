# Plan — ترب بیمه

## Product contract

Build a Persian, RTL comparison engine for car body, supplementary health, and travel insurance. The sample catalogue is fictional and explicitly labeled, not quotes or advice. The user can describe a need, resolve ambiguity, compare 2–6 products, inspect exact source passages and see relevant limits. Do not invent ratings, premiums, evidence, or model results.

## Architecture

```text
 Persian search -> intent service (optional Anthropic tool; deterministic offline fallback)
                         | validated UserIntent + clarification
                         v
 coverage schemas + catalogue repository (Postgres / explicitly labeled sample fallback)
       |                           |
       |                    deterministic ranking
       v                           |
 structured extraction ------> grounded normalized coverage -> source-aware explanations/UI
       |
 exact evidence check + Zod + retry -> Prisma transaction + ExtractionRun

 hand-labeled extraction / intent cases -> same pipeline -> Markdown evaluation report
```

- Next.js App Router, strict TypeScript, Tailwind, local Vazirmatn fonts. Server routes validate all inputs with Zod; no secrets in the browser. npm is the package manager; PostgreSQL is installed natively, including on Windows, and Docker is not required.
- PostgreSQL/Prisma is the persistent path: `InsuranceType`, `Insurer`, `Product`, `CoverageValue`, and `ExtractionRun`. Store normalized values only after validating types, confidence and verbatim evidence; retain invalid runs and never replace valid values on failure. Use a transaction for replacement.
- The browser must work without credentials or a database using a small checked-in, hand-authored **fictional sample catalogue**. This is an explicitly labeled offline mode, not an LLM result. The same schema, validation, scoring and evidence components apply to both sources. A configured DB is used by the server with a safe sample fallback if unreachable, exposed in the UI.
- `CoverageSchema` is a Zod-validated list of `{key, labelFa, kind, unit?, options?, higherIsBetter, weight, isExclusion, keywords}`. Values are `number | boolean | string | null`; a non-null value must have an exact source quote and confidence 0–1. Schemas drive extraction, rendering, formatting, comparison and ranking; additional schemas require no new pipeline code.
- AI extraction and optional intent/explanation use the Anthropic SDK's tool use, an environment-provided `LLM_MODEL`, Zod validation, evidence/citation checks and bounded retries. Unverifiable values are null, not guessed. Offline extraction is a clearly identified deterministic parser for the demo's explicitly structured sample texts. Explanations always have a deterministic sourced fallback.
- Evaluation: at least 30 separately authored, hand-labeled sample-document extraction cases and 20 Persian intent utterances; these are not independently audited. Offline mode measures the actual deterministic pipeline; `--live` measures Anthropic when credentials/model are configured. Report per-field accuracy, evidence grounding, failures, intent results, and mode. Never report offline metrics as LLM performance.
- No unsourced insurer trust signal; no live price or fabricated quote. Local sample premium, if used, is explicitly labeled and formula-documented; omission is preferable.

## Layout / contracts

```text
app/                     App Router pages, routes and async states
components/              accessible RTL search, comparison, source and status UI
lib/schemas/             Zod contracts and insurance definitions; empty roadmap type
lib/ai/                  Anthropic tools, grounding, retries, intent/explanations
lib/domain/              intent, scoring, formatting and comparisons
lib/data/                sample catalogue and Postgres-backed repository
prisma/                  Prisma schema, migration and seed
scripts/                 ingest, eval, add-insurance-type, verification helpers
fixtures/                sample policy documents and separate labeled evaluation cases
tests/                   Vitest units and Playwright happy path
.claude/agents/          focused, least-privilege agent role definitions
```

`npm run ingest -- <product-file> [--offline]` accepts a validated sample-product JSON, extracts against the schema, checks verbatim evidence, and upserts a product and its values idempotently in Postgres. Without live credentials it must explicitly require `--offline`; it never silently substitutes a different model. `npm run eval` defaults to the clearly labeled offline benchmark; `npm run eval -- --live` uses Anthropic. `npm run add-type -- <slug> <nameFa>` scaffolds an empty roadmap schema, sample stub, and eval stub, without edits to pipeline code.

## Milestones and acceptance checklist

- [x] 1. Foundation: app boots, Prisma schema and migration/seed, env template, project memory, focused agent definitions, scripts and reproducible dependencies. Migration and seed were verified on an ephemeral native PostgreSQL 18 instance.
- [x] 2. Schema-driven core: three validated schemas and empty roadmap schemas; a new field flows through parsing and the generic table/scoring contracts.
- [ ] 3. Ingestion: structured tool, Zod, grounding, retries and idempotent persistence implemented and tested; all 88 sample values grounded in offline mode. **Live Anthropic ingestion remains unverified** because no credentials/network access to the provider are available.
- [x] 4. Comparison: 2–6 products, visible sample provenance, difference/identical rows, sourced cells, deterministic ranking, two grounded explanation sentences, prominent limits and mobile layout.
- [x] 5. Intent: Persian input, typed priorities, explicitly stated budgets and narrow unambiguous required-coverages constraints, ambiguity/clarification path, server validation and transparent offline fallback. Negative, numeric-threshold and ambiguous constraints are deliberately not inferred.
- [x] 6. Evaluation: 34 hand-labeled synthetic extraction documents and 30 Persian utterances, reproducible per-field report and failures; offline results are not labeled as model performance.
- [x] 7. Polish: roadmap, async/empty/error states, accessibility, README/diagram/trade-offs and demo script implemented; production build, typecheck, lint, formatting, 28 Vitest tests (including PostgreSQL integration), evaluation and seven Playwright tests passed. Production desktop/mobile screenshots and axe checks passed; invalid comparison routes return HTTP 404.

## Environment and workflow constraints

This agent environment does not expose specialized subagent execution or a Postgres MCP. Agent role files are supplied for compatible environments; implementation and manual review are performed here, without claiming delegation. The current branch is fixed, so no extra branch/worktree is created. Anthropic credentials remain unavailable. A disposable PostgreSQL 18 instance and Chromium were obtained separately for testing, not added to the project; the migration, repeatable seed/ingest, DB integrity checks, desktop/mobile screenshots, Playwright and axe checks ran there. The Prisma migration engine was obtained via a GitHub mirror and its SHA-256 cross-checked against independent cached checksums because the official binary host is blocked. Windows and live Anthropic are unavailable in this environment, so native Windows execution cannot be claimed. Hooks and a combined verification command are provided, but this host does not enforce external agent hooks. Dependency rationale: Prisma/Postgres, Anthropic, Zod, Next/React, Tailwind, Vitest and Playwright are required; `@prisma/adapter-pg` and `pg` enable Prisma's JavaScript database engine, `server-only` guards the catalogue boundary, `lucide-react` supplies lightweight icons, `tsx` runs TypeScript scripts, `@fontsource/vazirmatn` self-hosts the font, and the development-only `@axe-core/playwright` automates accessibility checks.

## Manual review log

- Reviewed grounding and persistence: reject unrelated/contradictory evidence and mismatched or missing numeric units, retain retry history, keep previous product and insurer metadata unchanged on invalid re-ingestion; exercised against Postgres.
- Reviewed honesty and privacy: synthetic badges remain visible; no fabricated trust/price; explicit provider disclosure; raw user query is not persisted or put in the URL; model-invented budgets and requirements are discarded. Only unambiguous explicit boolean-coverage requirements are applied; a missing value remains unknown.
- Reviewed UI/RTL: desktop and 390px mobile screenshots inspected; horizontal table scroll stays within the viewport; keyboard-accessible source dialog; automated WCAG checks exposed and prompted fixes to contrast and focusable scroll regions.
- Remaining limitations: exact text matching is not semantic proof, offline parsing is intentionally narrow, the synthetic eval is not expert-reviewed, and live provider behavior and native Windows execution still need verification in an environment with the required services.

## Windows / npm update

The user's latest request supersedes the original prompt's package-manager and Compose requirements: use npm and the PostgreSQL service installed on Windows, with no Docker dependency. Keep the sample-only fallback available.

- [x] Replace application, CLI, hook and demo instructions with npm; launch Prisma's local JavaScript CLI through Node to avoid Windows shell/path quoting issues.
- [x] Document PowerShell setup, the existing PostgreSQL service, database creation, connection URL and URL-encoded credentials; remove Compose.
- [x] Generated and verified `package-lock.json`; an npm install simulated for Windows x64 with scripts disabled installed the Windows SWC/esbuild/Rollup packages. `npm ci`, `npm install`, npm verify/build, `.env` loading, native PostgreSQL migration/seed/ingest and browser tests passed on Linux. Native Windows execution is not available here and remains unverified.
