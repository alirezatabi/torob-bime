# Mission: Fix, harden and modernize "Torob Bime" (ترب بیمه)

You are a senior full-stack engineer + product designer working autonomously in this repository (`torob-bime`). An initial demo already exists and mostly works. A static code review (nothing was executed: no install, no tests, no build) found real bugs, production risks, product gaps, and a visual design that is clean but generic. Your job:

1. **Fix** every issue in §4 (ordered by priority).
2. **Redesign and modernize** the UI per §5, turning it into something that feels like a real, trustworthy Persian product.
3. **Prove it** with tests, screenshots and a final report (§8).

Start in **plan mode**. Read `CLAUDE.md`, `PLAN.md`, `README.md` first, then this whole document. Produce a written plan with milestones before editing. Keep a live task list.

---

## 1. Context (why this exists)

This is a job-application demo for the **AI Product Engineer** role at **Torob (ترب)**, an Iranian shopping search engine. Their challenge: _"Build Torob for a new market"_ and submit a **≤5-minute demo video** plus a project link. Reviewers judge: full-stack engineering, **product judgment**, **UX taste**, and **practical use of AI**.

Torob is a search engine, not a seller. Its core value: (1) turn messy offers into one canonical product, (2) rank offers by price + seller trust + location, (3) help the user decide. **Torob Bime** applies this to insurance: policies are long, messy documents, so AI turns them into a normalized, comparable, _source-grounded_ structure, ranks by the user's intent, and explains what is **not** covered.

The demo author is **Alireza Tabibzadeh (علیرضا طبیب‌زاده)**, a full-stack developer. Add tasteful author attribution (see D-14).

---

## 2. What is already good: KEEP and do not regress

- Schema-driven architecture: `lib/schemas/*` is the source of truth; pipeline/UI iterate over fields with **no per-type branches**. Keep it.
- Evidence grounding concept: non-null coverage needs a verbatim quote, confidence 0–1, else `null`. Keep (but see B-02 for brittleness).
- Deterministic, transparent ranking; AI never invents values; explanations rendered from verified fields.
- Honesty rules (from `CLAUDE.md`): every company/plan is **fictional and labeled "نمونه"**; no fabricated trust scores, ratings, prices-as-facts; offline/rule mode is never labeled as LLM output; model name only via `LLM_MODEL`; no personal data stored; no secrets in client code.
- Persian/RTL correctness basics (`lang=fa`, `dir=rtl`, logical CSS properties, Persian digits), the source dialog, the "what is NOT covered" panel, the evaluation page's candor.
- Existing tests (Vitest + Playwright + axe). Keep them green; update them when behavior intentionally changes.

If a fix would violate one of these, stop and state the conflict in the plan.

---

## 3. Review method and limits

The findings below come from reading the code, not running it. Before fixing each item, **reproduce or confirm it** (read the file, write a failing test, or take a screenshot). If an item turns out to be wrong, say so in the final report instead of "fixing" it. Where a finding says _(verify)_, confirming it is your first step.

---

## 4. Issues to fix (priority order)

Each item: **ID: problem, where, fix, acceptance**. Implement P0 first, then P1, then P2.

### P0: credibility, correctness, deployment-breaking

**B-01: The AI story is never actually exercised in the demo.**

- Where: `fixtures/products.json`, `lib/ai/offline-extraction.ts`, `scripts/eval.ts`, `EVAL_REPORT.md`.
- Problem: every sample policy is written as rigid `label: value.` lines (e.g. `تصادف و برخورد: پوشش دارد.`), and the "offline parser" reads exactly that format. So the demo (and the 95.5% eval) measures a regex parser on text authored for it. The central claim (LLM turns messy policy text into grounded structure) is never shown, and the live Anthropic path is unverified.
- Fix:
  1. Rewrite the sample policies (all 12 products + the 34 extraction-eval documents) as **realistic free-form Persian policy prose**: numbered clauses (ماده/بند), conditional phrasing, exceptions in separate paragraphs, amounts in varied positions and units (میلیون/میلیارد تومان, درصد, ماه), synonyms, double negatives like «... به جز ...». Still clearly fictional and labeled sample. Keep a small number of structured legacy texts only as a regression set for the offline parser.
  2. Add a **snapshot mode**: `npm run snapshot` runs live extraction (needs `ANTHROPIC_API_KEY` + `LLM_MODEL`) over the catalogue and writes `fixtures/extractions/<product-slug>.json` containing values, evidence, confidence, `model`, `generatedAt`. When no DB/API is available, the app loads these snapshots and labels data honestly: «استخراج‌شده با مدل <model> در <date>» (never "live"). The offline regex parser becomes a clearly-labeled fallback used only if a snapshot is missing.
  3. You cannot run the live call (no key). Implement and unit-test it with a mocked SDK, then list in the final report the exact command the user must run once with their key.
  4. Update `npm run eval`: report **offline parser**, **snapshot replay**, and **live** as separate modes; add messy-text cases so failures are meaningful. Never mix modes in one number.
- Acceptance: samples are prose; snapshot loader + generator exist with tests; UI shows the correct provenance label per mode; README/DEMO updated truthfully.

**B-02: Evidence grounding is brittle (will reject many correct live results and accept some wrong ones).** `lib/ai/grounding.ts`

- `sourceText.includes(row.evidence)` is an exact match. LLM output commonly differs by whitespace, ZWNJ (U+200C), Arabic vs Persian ی/ک, or digit script → valid quotes rejected, so most live values become `null`. Fix: match on a **normalized form** (collapse whitespace, unify ی/ک/digits/ZWNJ) with an index map back to the original text; store the **exact original span** as `evidence` so the UI quote stays verbatim.
- Number check uses `parsePersianNumber(row.evidence)` = the **first** number in the quote; unit check also uses the first number. A quote like «ماده ۵: سقف تعهد ۱۰ میلیون تومان» is rejected (5 ≠ value). Fix: find the numeric token that is adjacent to a unit/magnitude word or the field label; accept if the claimed value equals any number-with-unit in the quote and unit matches.
- `hasContext` accepts any keyword hit, and keywords overlap across fields (`سرقت` is a keyword of both `total_theft` and `partial_theft`; `سقف` is generic), so the model can ground `partial_theft` with the `total_theft` line. Fix: require the field's `labelFa` or a field-specific anchor; reject evidence that matches a _different_ field's label better; add tests for the theft case.
- Boolean verification: bare `ندارد` is in the `negative` regex, so «پوشش دارد، فرانشیز ندارد» is rejected for `true`. Fix with clause-level polarity (split evidence on punctuation/conjunctions, evaluate the clause containing the field label).
- Add tests with realistic phrasings (ZWNJ variants, Arabic ی/ک, extra whitespace, multi-number quotes, double negatives).
- Acceptance: new tests pass; the old tests pass; grounding rate on the new messy eval set is reported honestly.

**B-03: Production file-path bugs (will break on serverless/standalone builds).**

- `app/api/eval-report/route.ts` reads `"EVAL_REPORT.md"` and `app/evaluation/page.tsx` reads `"fixtures/eval-summary.json"` via cwd-relative `readFile`; `scripts/eval.ts` writes them into the repo.
- Fix: import the JSON statically (`resolveJsonModule` is already on) or generate under `public/`/build step; serve the markdown from an imported string or a static asset. Remove runtime `fs` reads from request handlers. Verify with `next build && next start` from a different cwd.
- Acceptance: `/evaluation` and `/api/eval-report` work from a clean production build.

**B-04: Failures are swallowed silently.**

- `lib/data/catalog.ts` `catch {}` falls back to sample data with no log (a broken DB looks identical to "not configured"); `lib/ai/intent.ts` and `lib/ai/explanations.ts` swallow model errors; `app/error.tsx` ignores the error; no `global-error.tsx`.
- Fix: add a tiny server logger (`lib/server/log.ts`) that logs error **name/code/message only**, never request bodies, user text, keys or connection strings. Log in every catch above, record `reason` in the catalogue (`fallbackReason: "db-unreachable" | "empty" | "invalid-schema"`) and surface a short human reason in the existing fallback banner. Make `error.tsx` log with `digest`, add `global-error.tsx`.
- Acceptance: unit test that a failing DB produces a logged reason and `mode: "fallback"`.

**B-05: No abuse protection on the LLM routes; wasteful client calls.**

- `/api/intent` and `/api/explain` call Anthropic with no rate limit, no content-type/origin check; `/api/explain` is POSTed from `components/comparison-experience.tsx` on **every page view and every priority toggle** (no debounce, no cache) and re-sends the whole catalogue; `/api/intent` returns **400 for every error**, masking real 500s.
- Fix: (a) per-IP token-bucket rate limit helper (in-memory is fine for the demo, abstracted so Redis/Upstash can replace it); (b) require `Content-Type: application/json` and same-origin (`Origin`/`Sec-Fetch-Site`); (c) cache explanation selection by hash(slug + sorted priorities + catalogue version) with a TTL; (d) debounce the client call (≥400 ms) and cancel in-flight requests; better: compute explanation keys in a server component/action so there is no client round trip; (e) correct status codes (400 validation, 413, 429 with `Retry-After`, 500 internal).
- Acceptance: tests for 429, wrong content-type, cache hit; toggling 5 priorities quickly produces ≤1 model call.

**B-06: Prisma generate hack will break real installs/CI.** `scripts/generate-client.mjs`, `package.json` `postinstall`/`build`.

- It sets `PRISMA_SCHEMA_ENGINE_BINARY` and `PRISMA_QUERY_ENGINE_LIBRARY` to the **Node binary** (a workaround for a sandbox without network), and runs on every `postinstall` and `build`.
- Fix: replace with the standard `prisma generate`; remove the env overrides and the related `.env.example` commentary. Verify on a clean clone. Keep `engineType = "client"` + `@prisma/adapter-pg` only if still correct for the Prisma version you end up on.
- Acceptance: `npm ci && npm run build` works from scratch on a networked machine; document in the report that you could not verify if no network.

### P1: functional and UX bugs

**B-07: Comparison state is not in the URL.** `components/comparison-experience.tsx`: `priorities`, `constraints`, `selected` live only in React state, so customized comparisons cannot be shared, bookmarked or restored with Back. Fix: sync to the URL (shallow `router.replace` with `priorities`, `required`, `compare=slug1,slug2`), keep the existing query contract working, validate everything server-side as `compare/[slug]/page.tsx` already does, and add a **"کپی پیوند مقایسه"** button.

**B-08: Mobile header has no navigation.** `components/site-header.tsx`: nav is `hidden … md:flex` with no menu button, so mobile users cannot reach roadmap/evaluation from the header. Fix: accessible mobile menu (disclosure pattern or bottom sheet), ≥44 px targets.

**B-09: Search box UX.** `components/intent-search.tsx`: `Enter` inserts a newline instead of submitting. Fix: Enter submits, Shift+Enter newline, guard IME composition (`isComposing`), keep the existing labels used by e2e tests (or update tests deliberately).

**B-10: Budget is parsed but meaningless.** `lib/domain/intent.ts#extractBudget`, `intent-search.tsx`, `compare/[slug]/page.tsx`: the UI shows "budget recorded but not applied" because there is no price data; `?budget=` (empty) coerces to `0` and shows "بودجه ۰ تومان". Fix the empty/zero validation now. Then **decision D-P1 (see §6)**: either remove budget from the flow, or make it useful via labeled sample premiums.

**B-11: Table layout does not scale to 6 plans.** `min-w-[760px]` with a fixed 200 px label column leaves ~93 px per plan with 6 plans (truncated headers). Fix: width = label col + N × ≥150 px, sticky header row **and** sticky first column, per-row "best value" highlight, remove-from-compare button in each header.

**B-12: Repeated work per request.** `lib/data/catalog.ts` re-parses fixtures and re-runs offline extraction on every request; `components/hero-preview.tsx` and `app/(home)/page.tsx` do the same/import raw fixtures (including `sourceText`) just to count or preview. Fix: module-level memoization for the sample catalogue, `React.cache` for per-request dedupe, Next caching with revalidation for the DB path (invalidate after ingest), and use catalogue counts instead of importing fixtures in pages. Remove the redundant `force-dynamic` + `generateStaticParams` + `dynamicParams=false` combination on `compare/[slug]` (choose a coherent rendering strategy, document it).

**B-13: Sensitive-data guard is minimal.** `lib/domain/text.ts#containsSensitiveContact` only checks email + mobile. Add Iranian national ID (10 digits with checksum), 16-digit card numbers (Luhn), and IBAN (`IR` + 24 digits), after digit normalization, on both client and server, with tests. Keep the "no personal data" disclosure.

**B-14: Missing production basics.** Add: `metadata` per page (`generateMetadata` for `compare/[slug]`), viewport + theme-color, Open Graph/Twitter cards, favicon/app icons (`app/icon.tsx` or files), `robots`/`sitemap`, and security headers in `next.config.ts` (CSP with nonce or strict-dynamic as feasible, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, `frame-ancestors`). Remove the leftover `"*.e2b.app"` from `allowedDevOrigins`, and drop `-H 0.0.0.0` from default `dev`/`start` scripts (add `dev:lan` if wanted) so the dev server is not exposed on the LAN by default.

**B-15: LLM integration hygiene.** `lib/ai/extraction.ts`, `intent.ts`, `explanations.ts`:

- Sentinel string compare `feedback[0] === "No response"` to detect the first attempt; the retry prompt can say "Previous validation errors: Extraction provider error." Replace with typed attempt state.
- Three near-identical Anthropic client constructions and tool-call plumbing: extract one `lib/ai/anthropic.ts` (client factory, timeout, tool-call helper, error mapping, logging).
- Verify the current Anthropic SDK API/docs; use **prompt caching** for the schema/system prompt where supported, strict tool schemas where supported, and document recommended model env values in `.env.example` (verify current model IDs in Anthropic docs before writing them; one stronger model for extraction, a smaller/faster one for intent and explanation selection, each via its own env var, e.g. `LLM_MODEL` + optional `LLM_MODEL_FAST`).
- Keep the rule: model name comes only from env.

**B-16: Duplicated ranking math.** `lib/domain/ranking.ts`: `rankProducts` and `relativeFieldScore` duplicate the boolean/number/enum normalization. Extract one `normalizedFieldScore(field, value, ranges)` used by both, and cover it with table-driven tests (including all-equal numbers, unknown values, `higherIsBetter=false`, enums).

### P2: tooling, repo hygiene, DX

**B-17: Agent hooks are too heavy.** `.claude/settings.json` runs full `typecheck` + `lint` (≤120 s) on every Edit/Write **and** on Stop. Change: `PostToolUse` → format + `eslint --fix` on the edited file only; `Stop` → `typecheck` + unit tests. Update `.githooks/pre-commit` to also run lint/format check on staged files.

**B-18: Env loading mismatch.** Scripts use `dotenv/config` (`.env` only) while Next reads `.env.local`. Use `@next/env`'s `loadEnvConfig` in scripts so one file works everywhere.

**B-19: Repo hygiene for reviewers.** Root contains `PLAN.md` (with sandbox-specific notes: e2b, GitHub mirror, checksums), `EVAL_REPORT.md`, and `torob-bime-agent-prompt.md`. Move planning/prompt files into `docs/`, delete sandbox noise, and rewrite `README.md` as a **short, scannable** document: one-paragraph pitch, screenshot/GIF, live demo link placeholder, 3-step quick start (with and without Postgres), architecture diagram, honesty statement, link to `docs/` for details. Keep the long Windows/PostgreSQL setup in `docs/setup-windows.md`.

**B-20: No CI, no deploy path.** Add GitHub Actions: install, typecheck, lint, format check, unit tests, build, Playwright (with a Postgres service), offline eval. Add a documented deployment path (Vercel + hosted Postgres such as Neon, or a Dockerfile) and make sure `/evaluation`, `/api/eval-report`, DB fallback and Prisma all work in that environment. You cannot deploy; write the steps and what the user must supply.

**B-21: Stack is a generation behind.** `package.json`: Next 15.5, Tailwind 3.4, ESLint 8 with legacy `.eslintrc.json`, Prisma 6.19, React 19.1. **Do this as a separate, revertible phase after P0/P1 are green** (see §7). Verify each target in official docs first, then migrate:

- **Next.js 16** (stable; Turbopack default, `middleware`→`proxy` rename if used, async request APIs, caching changes). Use the official upgrade guide/codemod. Evaluate Cache Components (`use cache`) for the catalogue (B-12) and the React Compiler; enable only if tests and build pass.
- **Tailwind CSS v4** (CSS-first config via `@theme`), required for the token system in D-01.
- **ESLint 9 flat config** (Next 16 removed `next lint`; the repo already calls `eslint` directly).
- **Prisma**: check whether a newer major is stable and what changes (generator, driver adapters); migrate only if clean, otherwise stay and record why.
  If any step cannot be made green quickly, revert that step, keep the rest, and say so in the report.

---

## 5. Design and modernization spec

### 5.1 Diagnosis of the current UI (facts from the code)

- ~250 raw hex colors (92 distinct) hard-coded in `className`s across `app/` and `components/`, while the tokens defined in `tailwind.config.ts` (`ink`, `muted`, `line`, `paper`, `brand`) are barely used. No semantic color system, no dark mode, no `prefers-reduced-motion` handling.
- ~83 usages of 9–12 px text (39 at 10–11 px). Too small for Persian body text.
- Negative letter-spacing (`tracking-tight`, `tracking-[-.03em]`) on Persian headings (`app/(home)/page.tsx`, `evaluation`, `roadmap`, `comparison-experience`, `logo`). Letter-spacing can break Arabic-script joining (_verify visually_). Remove it from all Persian text.
- One 697-line client component (`comparison-experience.tsx`) holds the whole compare page; static content is shipped as client JS.
- Insurers are shown as a single letter in a gray square; the hero is a static mock card; the comparison table is a plain grid; no motion; mixed informal/formal Persian voice («نیازت رو بگو» vs «بنویسید»).
- The hero promises «انتخاب آگاهانه، نه فقط ارزان‌ترین» while there is no price anywhere; «یک مقایسه، هزار نکته» is hyperbole.
- AI is invisible in the default (offline) mode, so the product's main differentiator is not visible on screen.

### 5.2 Design direction

**Goal:** modern, calm, trustworthy, "looks like a funded product". Torob-adjacent (clean white surfaces, red-coral accent, rounded cards, dense but readable), with its own identity: _"every number has a source."_ Mobile-first (most Iranian users are on phones).

**D-01: Design tokens (Tailwind v4 `@theme`).** Semantic tokens only: `surface`, `surface-muted`, `surface-raised`, `border`, `text`, `text-muted`, `brand` (+ `brand-soft`, `brand-strong`), `success`, `warning`, `danger`, `info` (each with soft/strong pairs), radius scale, shadow scale, spacing rhythm, z-index scale. Light and dark values. **Zero raw hex in components** (add a CI grep/ESLint rule). Check AA contrast for every text/background pair, including on tinted backgrounds.

**D-02: Typography.** Load Vazirmatn through `next/font/local` (variable font if available; preload, `display: swap`), drop the five `@fontsource` CSS imports. Scale: body 15–16 px / line-height ≈ 2, **no text below 13 px** (labels 13, captions 13, body 15–16, h3 17–18, h2 22–26, h1 32–44). Never apply letter-spacing to Persian. Use tabular numerals where supported for amounts. Wrap embedded LTR (`code`, English terms) in `dir="ltr"` + `unicode-bidi: isolate`.

**D-03: Component library (small, in `components/ui/`).** `Button`, `IconButton`, `Chip` (toggle/removable), `Badge`, `Card`, `Tooltip`, `Disclosure`, `Drawer` (bottom sheet on mobile, side drawer on desktop), `Tabs`, `Skeleton`, `Toast`, `ScoreRing`, `InsurerMark`. Use native elements/ARIA patterns (no heavy UI dependency unless justified in the plan; headless primitives like Radix are acceptable if you list the reason). Remove duplicated class strings.

**D-04: Home page.**

- Hero: one dominant AI search bar (large, rounded, focus ring in brand color), rotating example placeholders, example chips, privacy line (keep the Anthropic disclosure when AI is on).
- **Intent confirmation step:** after submit, before navigating, show «فهمیدم:» chips for the detected type, priorities and requirements (editable/removable), then the user continues. This makes the AI visible and builds trust.
- Category tiles with consistent icons, a "نمونه" badge and plan counts from the catalogue; a "how it works" strip using real product screenshots/mini-components, not generic icons; a trust strip: «هر عدد، یک منبع».
- Replace the hero preview mock with a **live mini-comparison** (real data from the catalogue) that animates subtly on load.

**D-05: Compare page (the core screen). Rebuild as server-rendered shell + small client islands.**

- **Sticky summary bar:** type title, editable priority chips, sample-data/provenance badge, "کپی پیوند" button.
- **Plan cards** (ranked): `InsurerMark` (deterministic monogram/color generated from the insurer slug, accessible name), plan name, `ScoreRing` with text label «۸۲٪ هم‌خوان با نیاز شما» (relative, not a purchase recommendation), top 3 facts with ✓/✗/– icons **plus text** (never color alone), a red-tinted "**چه چیزی پوشش داده نمی‌شود**" callout (max 2 items, expandable), "افزودن به مقایسه" and "منبع" actions.
- **Compare tray:** sticky bottom bar on mobile showing selected plans (2–6) with remove buttons and a primary «مقایسه (n)» button.
- **Comparison table:** sticky header + first column, grouped rows (add optional `group` to the field schema; default group when absent), differing rows tinted, **best value per row** marked «بهترین» (with text), unknown values shown as «نامشخص» with an info tooltip, term tooltips for jargon (فرانشیز، دوره انتظار، سقف تعهد…) from a small glossary in the schema (`glossaryFa`), a "hide identical rows" toggle (keep). On narrow screens offer a **two-plan side-by-side mode** (choose A/B) instead of an unusable 6-column scroller.
- **Evidence drawer** (replaces the small dialog): shows the quote **in context** (surrounding policy lines, quote highlighted), the field, value, confidence, extraction provenance (model/snapshot/rules), and the sample-data notice. Needs `sourceText` context for the quoted line only (send a limited excerpt, not the whole policy, to the client). Return focus to the trigger on close; lock body scroll while open.

**D-06: "Behind the scenes" view (signature demo moment).** Route like `/compare/[slug]/extraction/[product]` or a drawer: left = the free-form policy text, right = extracted fields; hovering/focusing a field highlights its evidence span in the text and vice versa. Shows null/ungrounded fields explicitly. This is what makes the AI visible even without an API key (snapshot mode, B-01).

**D-07: Motion.** 150–250 ms ease-out transitions for hover/press/expand, skeleton screens that match the final layout, optional route transitions via the View Transitions API if the Next/React version supports it cleanly. Respect `prefers-reduced-motion` (disable non-essential motion). No decorative looping animation.

**D-08: Dark mode.** Follow `prefers-color-scheme` with a manual toggle persisted in `localStorage` (no flash of wrong theme: set the attribute before paint). Test both themes in screenshots and axe.

**D-09: Accessibility (WCAG 2.2 AA target).** Contrast AA everywhere; focus rings visible on all interactive elements; touch targets ≥ 44×44 px; semantic headings; table headers/scopes (existing) preserved; `aria-live` for async results; skip-to-content link; keyboard operable tooltips/drawers/menus; no color-only meaning. Keep and extend the axe tests (light + dark, desktop + mobile, with the drawer open).

**D-10: Responsive.** Design at 360, 390, 768, 1024, 1280 widths. No horizontal page scroll. Bottom tray and sheets on mobile; multi-column on desktop. Thumb-zone primary actions.

**D-11: Performance budgets.** Lighthouse mobile: Performance ≥ 90, Accessibility ≥ 95, Best Practices ≥ 95, SEO ≥ 90 on `/` and `/compare/car-body`. Keep client JS small: server components by default, client islands only for interaction. Report the numbers you measured (or state you could not measure).

**D-12: Microcopy and voice.** Pick **one** Persian voice (recommended: friendly and respectful with «شما», simple words, no slang or «رو/تو» contractions) and apply it everywhere. List every changed string in the report. Remove hyperbole («هزار نکته»), keep honest claims. Update e2e selectors accordingly.

**D-13: Logo and identity.** Keep the name «ترب بیمه»; refine the mark (simple shield/lens glyph, brand color), consistent lockup in header/footer; add a favicon. Do not copy Torob's actual logo; keep a small footer note that this is an independent demo project made for the Torob challenge.

**D-14: Author attribution.** Footer line: «ساخته‌شده توسط علیرضا طبیب‌زاده برای چالش مهندس محصول هوش مصنوعی ترب»; link to the GitHub repo (leave contact/portfolio links as clearly marked config values, do not invent URLs).

---

## 6. Decisions needed (use these defaults unless told otherwise; flag them in the report)

- **D-P1: price axis.** Torob's core is price, and this demo has none. _Default:_ add an **optional, clearly labeled fictional "حق‌بیمه نمونه"** per plan (a schema number field `sample_premium`, toman/month or year, stored in the fictional policy text and extracted/grounded like any other field), shown with a «نمونه، قیمت واقعی نیست» badge and documented in the README. Add a "value for coverage" view (coverage score vs sample premium) and make the budget input filter/flag plans using it. If you judge this conflicts with the honesty rules, do **not** add it; instead remove the budget input and say why.
- **D-P2: AI provenance labels.** _Default:_ three honest labels: «قانون‌محور (آفلاین)», «استخراج‌شده با مدل X در تاریخ Y (اسنپ‌شات)», «زنده با مدل X».
- **D-P3: Insurance types.** Keep the three active types (car body, supplementary health, travel). Do not activate more unless time remains; if you do, run the full pipeline for each and keep the honesty labels.

---

## 7. How YOU must work (agentic workflow)

Use the most capable agentic features available in this environment. If a feature is unavailable, say so and use the closest alternative; never claim to have used a capability you did not.

**Plan mode first.** Deliver: dependency graph of the tasks, milestone list with acceptance criteria, the token/component API for D-01/D-03 (so parallel work shares one contract), and risks. Keep the task list live.

**Update `.claude/agents/` (project subagents; least-privilege tools; `model` set deliberately; each returns a short summary, not file dumps).** Keep the existing roles and add:

- `design-system-engineer`: owns tokens, Tailwind v4 migration, `components/ui/*`, dark mode, fonts.
- `ui-builder`: owns pages/compare experience using the design system (no raw hex, no sub-13 px text).
- `llm-pipeline-engineer`: owns B-01, B-02, B-15, snapshot mode, eval.
- `backend-hardener`: owns B-03–B-06, B-12, B-13, B-14 (logging, rate limit, caching, headers, Prisma).
- `a11y-auditor` (read-only + Playwright/axe): audits every milestone in light/dark and 390/1280.
- `security-reviewer` (read-only): reviews routes, headers, secrets, prompt-injection surfaces, data flows.
- `reviewer` (read-only): reviews each milestone diff against this document, `CLAUDE.md` and the honesty rules; blocks completion on violations.

**Parallelization.** Freeze contracts first (token names, `ComparableProduct`, snapshot JSON schema, glossary/group fields in `contracts.ts`), then fan out in parallel: `design-system-engineer` (tokens/ui) ‖ `llm-pipeline-engineer` (B-01/B-02/B-15) ‖ `backend-hardener` (B-03–B-06/B-12–B-14). Then `ui-builder` composes D-04–D-06 on top of the finished design system. Use separate git worktrees/branches per stream where supported; merge only when typecheck + lint + tests are green. Run `reviewer`, `a11y-auditor` and `security-reviewer` before closing each milestone.

**Automation and verification.**

- Hooks per B-17 (fast per-file checks; heavy checks on Stop).
- If available: **Playwright MCP/tooling** to take screenshots at 390 and 1280 px in light and dark for `/`, `/compare/car-body`, `/compare/supplementary-health`, `/compare/travel`, `/evaluation`, `/roadmap`, plus the evidence drawer and the "behind the scenes" view; **inspect them yourself and fix what you see** (RTL, truncation, contrast, spacing). Next.js DevTools MCP and a Postgres MCP if present.
- Project memory: update `CLAUDE.md` (≤ 100 lines) with the new conventions (tokens only, min font size, voice guide, provenance labels, no runtime fs reads, logging rules).
- Small conventional commits per ID (e.g. `fix(B-03): serve eval report from static import`).

**Honesty and safety rules while working.** Never fabricate data, ratings, trust scores or model results. Never expose secrets. Never claim a command passed unless you ran it and saw it pass. If something cannot be run here (live Anthropic call, Windows, deploy), implement it, test it with mocks, and list the exact manual step for the user.

---

## 8. Milestones, acceptance and final report

1. **M1 Foundations:** contracts frozen, agents/hooks/`CLAUDE.md` updated, B-17/B-18/B-19 (partial: move files), tokens + fonts + `components/ui` skeleton (D-01–D-03).
2. **M2 Correctness & hardening (P0):** B-01–B-06.
3. **M3 UX bugs (P1):** B-07–B-16.
4. **M4 Redesign:** D-04–D-10, D-12–D-14; D-06 "behind the scenes"; D-P1 per decision.
5. **M5 Stack modernization (separate, revertible):** B-21 + B-20 (CI/deploy docs).
6. **M6 Polish and proof:** performance/a11y runs (D-09/D-11), screenshot set, README rewrite, `DEMO.md` rewrite for the new UI and the 5-minute script.

**Global definition of done:** `npm run typecheck && npm run lint && npm run format:check && npm test && npm run build` pass; `npm run test:e2e` passes (including axe in light/dark); `npm run eval` passes in offline mode; zero raw hex in `app/` and `components/`; no text under 13 px; no runtime `fs` reads in request handlers; every AI-derived number/sentence is source-traceable; provenance labels are correct in every mode.

**Final report format (concise, honest):**

- Table: ID → status (fixed / confirmed-not-a-bug / deferred) → one-line evidence (commit, test, screenshot).
- What changed in the design, with the screenshot list.
- Metrics you actually measured (tests, Lighthouse, grounding/eval numbers per mode).
- Items you could not verify here and the exact manual steps for the user (live `npm run snapshot` with API key, deploy, Windows run).
- Open decisions and which defaults you took.

Begin now: enter plan mode and present the plan.
