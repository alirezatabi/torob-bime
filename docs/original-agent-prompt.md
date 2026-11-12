# Mission: Build "Torob Bime" (ترب بیمه) — an AI-powered insurance comparison engine

You are a senior full-stack engineer and product builder working autonomously in this repository. Read this entire document before writing any code. Start in **plan mode**: produce a written plan, wait for it to be consistent with this document, then execute.

---

## 1. Why this project exists (context)

This is a job-application demo for the **AI Product Engineer** role at **Torob (ترب)**, an Iranian shopping search engine. Their challenge: *"Build Torob for a new market"* (examples they gave: flight tickets, insurance, cars, houses) and submit a **≤5-minute demo video** plus a project link. They evaluate: full-stack engineering, **product judgment**, **UX taste**, and **practical use of AI**.

What Torob is (public information):
- A **search engine for shopping**, not a seller. It puts prices and terms from many shops side by side; the purchase happens at the shop.
- Its core value: (1) turn messy offers from many sellers into **one canonical product**, (2) **rank offers** by price + seller trust + location, (3) **help the user decide** (price history, alerts, guidance).
- Trust signals matter (shop score, tenure, guarantee badge). The UI is Persian, RTL, fast, and plain.

**Our product:** "Torob Bime" applies that model to **all types of insurance**. Insurance is a perfect fit because policies from different insurers are long, messy, hard-to-compare documents (coverage limits, deductibles, exclusions, waiting periods). Our AI turns them into a **normalized, comparable structure**, ranks them by the user's **intent**, and **explains** the ranking in plain Persian.

**Product principle:** the user's real problem is not "which is cheapest", it is "what exactly am I covered for, and what am I NOT covered for?". Every design decision should serve that.

---

## 2. Scope

### Vision (architecture must support it)
All insurance types: car third-party, car body, supplementary health, travel, life, fire/home, etc.

### Demo scope (build deeply, not broadly)
Implement **3 insurance types** with real depth. Pick types with *different* structures to prove the architecture is generic:
1. **Car body insurance** (بیمه بدنه خودرو)
2. **Supplementary health insurance** (بیمه درمان تکمیلی)
3. **Travel insurance** (بیمه مسافرتی)

Other types appear only as a roadmap entry plus an **empty schema file** that demonstrates how little work adding a type requires.

### Key architectural idea: schema-driven insurance types
Each insurance type is defined by a **Coverage Schema** (a typed list of coverage fields with units, value kinds, and a user-facing Persian label). Everything else (extraction, comparison table, ranking, explanation) is **generic** and driven by the schema. Adding a new insurance type = adding one schema definition, no new pipeline code.

---

## 3. Tech stack (mandatory)

- **Next.js** (App Router, Server Components + Server Actions / Route Handlers), **TypeScript** (`strict: true`)
- **Prisma** ORM + **PostgreSQL**
- **Tailwind CSS**
- UI language: **Persian (fa-IR), RTL**, font **Vazirmatn**; numbers formatted in Persian digits where appropriate; Toman currency formatting
- **Zod** for all runtime validation (LLM outputs, API inputs)
- **Anthropic SDK** for LLM calls (model name from env var `LLM_MODEL`, never hard-coded); use **tool use / structured output** for extraction, validated with Zod, with retry on validation failure
- Testing: **Vitest** for unit tests, **Playwright** for one end-to-end happy path
- Tooling: ESLint, Prettier, `tsc --noEmit` must pass; use `pnpm`
- Local infra: `docker-compose.yml` for PostgreSQL; `.env.example` with every variable documented

Do not add heavy dependencies without a reason written in the plan.

---

## 4. Domain model (starting point; refine in plan mode)

```prisma
model InsuranceType {
  id          String   @id @default(cuid())
  slug        String   @unique        // "car-body" | "supplementary-health" | "travel"
  nameFa      String
  schema      Json                      // CoverageSchema (validated by Zod at load time)
  products    Product[]
}

model Insurer {
  id          String   @id @default(cuid())
  slug        String   @unique
  nameFa      String
  trustSignals Json?                    // e.g. claim satisfaction, complaints — only if sourced
  products    Product[]
}

model Product {                          // an insurer's plan for one insurance type
  id              String   @id @default(cuid())
  insurerId       String
  typeId          String
  nameFa          String
  sourceText      String   @db.Text     // raw policy text (the ground truth)
  sourceUrl       String?
  isSampleData    Boolean  @default(true) // MUST be surfaced in UI when true
  insurer         Insurer       @relation(fields: [insurerId], references: [id])
  type            InsuranceType @relation(fields: [typeId], references: [id])
  coverages       CoverageValue[]
  priceModel      Json?                  // simple, transparent premium model (see §6)
  extractionRuns  ExtractionRun[]
}

model CoverageValue {                    // normalized value for one schema field
  id          String  @id @default(cuid())
  productId   String
  fieldKey    String                     // key from the type's CoverageSchema
  value       Json                       // typed per schema (number | boolean | enum | text)
  evidence    String  @db.Text           // EXACT quote from sourceText supporting the value
  confidence  Float
  product     Product @relation(fields: [productId], references: [id])
  @@unique([productId, fieldKey])
}

model ExtractionRun {
  id         String   @id @default(cuid())
  productId  String
  model      String
  createdAt  DateTime @default(now())
  rawOutput  Json
  valid      Boolean
  errors     Json?
}
```

Rule: **every extracted value must carry `evidence`** — a verbatim quote from the source text. If a value cannot be grounded, store `null` and flag it; never guess. The UI shows the evidence on demand ("show source").

---

## 5. Features to build

### F1. Single entry point with intent understanding
A search/chat box on the home page. The user writes free Persian text ("ماشین نو خریدم و نگران تصادف جزئی‌ام", "برای مادرم بیمه تکمیلی می‌خواهم", "سفر شنگن دارم"). The system:
- classifies the **insurance type** (or asks one short clarifying question if ambiguous),
- extracts structured **user needs** (priorities, constraints, budget) into a typed `UserIntent`,
- navigates to the comparison view with that intent applied.

### F2. Ingestion + normalization pipeline (the AI core)
- Script/CLI: `pnpm ingest <product-file>` reads policy text, calls the LLM with the type's schema, validates with Zod, stores `CoverageValue` rows with evidence + confidence, logs an `ExtractionRun`.
- Re-validate: programmatically check that every `evidence` string actually appears in `sourceText`; reject/flag otherwise.
- Idempotent and re-runnable.

### F3. Comparison view
- Side-by-side normalized table for 2–6 products, rows = schema fields, with **difference highlighting** (what differs is visually obvious; identical rows collapsible).
- Per-cell "source" popover showing the evidence quote.
- Clear badge when data is **sample data**.
- Excellent mobile layout (most Iranian users are on mobile).

### F4. Intent-based ranking + explanation
- Deterministic scoring from `UserIntent` weights over normalized coverage values (transparent, testable), **not** an opaque LLM ranking.
- LLM is used only to **explain** the result in 2 short Persian sentences per product: why it ranks here, and one important thing it does NOT cover. The explanation must be generated from the structured values and may not invent facts (pass only the normalized data, validate that cited fields exist).

### F5. "What am I NOT covered for?" panel
For each product, surface the most important **exclusions/limits** relevant to the user's intent. This is the product's signature feature; give it prominent UX.

### F6. Trust signal
Show an insurer trust signal **only if** it comes from a real, citable source. If no reliable data, show nothing rather than inventing a score. Document this decision in the README.

### F7. Evaluation harness (visible in the demo)
- `pnpm eval`: runs the extraction pipeline on a labeled set of **≥30 hand-verified cases** and reports per-field accuracy, evidence-grounding rate, and a list of failures.
- Also eval the intent classifier on ≥20 Persian utterances.
- Output a short markdown report. This is what proves product-engineering maturity.

### F8. Roadmap page
Lists other insurance types with their (empty) schema files, showing how a new type is added.

---

## 6. Data and honesty rules

- Use **small, curated sample data**: 4–6 products per type, written from or modeled after publicly available policy descriptions. Mark `isSampleData = true` and show a visible "نمونه" badge.
- **Never present fabricated data as real.** Do not invent insurer statistics, ratings, or prices as facts.
- Premium estimation, if included, must be a **simple, transparent, clearly-labelled sample model** (documented formula), never presented as a live quote.
- Do not build large-scale scrapers. No scraping in the demo.
- No real personal data. Validate and sanitize all user input; never put secrets in client code.

---

## 7. UX requirements

- RTL-correct everywhere (logical Tailwind properties: `ps-*`, `pe-*`, `ms-*`, `text-start`), Persian typography, Persian digits formatting helper.
- Plain, fast, trustworthy look in the spirit of Torob: clean, high contrast, no decoration for decoration's sake.
- Every AI-derived statement is traceable to a source quote.
- Loading, empty, and error states for every async view. Accessible (keyboard, labels, contrast).
- The first screen must make the value obvious in 5 seconds.

---

## 8. How YOU must work (agentic workflow)

Use the most capable agentic features available in this environment. If a feature is unavailable, say so and use the closest alternative.

### 8.1 Plan first
Enter **plan mode**. Deliver: architecture, folder structure, Prisma schema, Coverage Schema format (with Zod types), pipeline design, milestone list with acceptance criteria. Keep a live **task list** and update it as you go.

### 8.2 Project memory
Create a concise `CLAUDE.md` at the repo root: stack, commands, conventions, the honesty rules from §6, and the definition of done. Keep it under ~100 lines and update it when decisions change.

### 8.3 Specialized subagents
Create project subagents in `.claude/agents/` (each with a focused description, minimal tool access, and a clear output contract), for example:
- `schema-architect` — owns Prisma schema + Coverage Schema + Zod types.
- `llm-pipeline-engineer` — owns ingestion, structured extraction, evidence validation, retries.
- `ui-builder` — owns Next.js pages/components, RTL, Tailwind, accessibility.
- `data-curator` — prepares sample policy texts and the labeled eval set (marks sample data).
- `eval-runner` — owns `pnpm eval`, reports metrics, proposes fixes.
- `reviewer` — read-only; reviews diffs for correctness, type safety, honesty-rule violations, RTL bugs, security.

**Delegate in parallel** when tasks are independent (e.g., UI scaffolding while the pipeline is built, after the schema contract is frozen). Pass subagents the exact contracts they need (types, file paths); require them to return a short summary, not full file dumps. Run `reviewer` before every milestone is marked done.

### 8.4 Automation and verification
- **Hooks**: run `tsc --noEmit` + lint on file edits and block completion if they fail; run tests before commits.
- **MCP / tools** (if available): a Postgres MCP server to inspect data, and **Playwright** to open the running app, take screenshots, and verify RTL/mobile layout visually. Fix issues you see.
- Prefer **git worktrees or branches** for parallel subagent work; merge only after typecheck + tests pass.
- Make **small, conventional commits** with clear messages.

### 8.5 Skills / reusable commands
Create a small reusable command (or skill) for "add a new insurance type" that scaffolds a schema file, sample data stubs, and eval cases. Using it to add the roadmap type is a good test of the architecture.

---

## 9. Milestones and acceptance criteria

1. **Foundation** — repo, docker-compose, Prisma schema + migrations, seed, `CLAUDE.md`, subagents created, CI-style scripts (`typecheck`, `lint`, `test`, `eval`). *Done when:* app boots, DB migrates, all scripts run.
2. **Schema-driven core** — Coverage Schemas for 3 types, Zod types generated from them. *Done when:* adding a field to a schema flows to the comparison table without other code changes.
3. **Ingestion pipeline** — extraction with evidence grounding and retries. *Done when:* all sample products ingest with ≥95% evidence-grounded values.
4. **Comparison + ranking + explanation UI** — F3, F4, F5. *Done when:* a Persian free-text query leads to a ranked, explained, source-traceable comparison on mobile and desktop.
5. **Intent entry point** — F1 with clarifying question flow.
6. **Eval harness + report** — F7 with published metrics in README.
7. **Polish for the demo** — loading/empty/error states, sample-data badges, roadmap page, README with architecture diagram and "decisions and trade-offs" section, Playwright happy path.

**Definition of done (global):** `pnpm typecheck && pnpm lint && pnpm test && pnpm eval` pass; no honesty-rule violations; README explains the problem, the architecture, what was deliberately left out, and how to add a new insurance type.

---

## 10. Demo script support (≤5 minutes)

Make sure the app supports this flow smoothly, and write `DEMO.md` with a recommended script:
1. (0:00–0:30) The problem: policies are unreadable; users can't tell what they're not covered for.
2. (0:30–3:00) Live demo: free-text need → intent understood → comparison → "not covered" panel → source quote.
3. (3:00–4:00) Decisions: schema-driven design, evidence grounding, deterministic ranking, no fabricated data.
4. (4:00–5:00) Eval metrics, how AI was used to build this, and the roadmap (adding a new type in minutes).

---

## 11. Ground rules

- If requirements are ambiguous, make the **simplest reasonable assumption**, record it in `CLAUDE.md`, and continue; ask the user only for decisions that block progress or are hard to reverse.
- Do not stop at the first working version: verify visually, run evals, review, then polish.
- Never silently weaken a requirement; if something must be cut, say what and why in the plan and the README.
- Be concise in your reports: what changed, how it was verified, what is next.

Begin now: enter plan mode and present the plan.
