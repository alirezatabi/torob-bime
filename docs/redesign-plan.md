# Review and redesign plan

## Constraints and decisions

- Work on the existing branch; npm and the user's native Windows PostgreSQL remain supported, with no Docker requirement.
- The available environment has no independent subagent runner, Windows host, Anthropic credentials, or production deployment. Define focused agent roles and perform explicit local review; do not claim delegation or live results.
- D-P1: use the prompt's default: add an optional fictional annual premium to each synthetic policy, extract and ground it like other numeric fields, and use only verified amounts to flag/filter a stated annual budget. Every amount and comparison must explicitly say it is a sample, not a real price, quote or purchase recommendation; unknown amounts never count as a match. This fictional axis is a product demonstration, not a claim about the market.
- D-P2/D-P3: distinguish rule-based, verified snapshot, and live model provenance; retain three active categories. Do not fabricate snapshots or model metrics.
- Default local servers should bind to loopback. Separate LAN/preview scripts bind to `0.0.0.0` when explicitly requested by this development environment.

## Dependency graph

```text
contracts + task plan + environment/agent roles
  ├─ grounded quote mapping + prose fixtures + snapshot contract/generator ─┐
  ├─ API security + logging + static report + Prisma generation ───────────┼─ P0 verification
  └─ semantic tokens + typography + UI primitives ─────────────────────────┘
       └─ URL-backed comparison + responsive accessible redesigned screens + AI provenance
            └─ production metadata/headers/cache + CI/deployment documentation
                 └─ isolated framework upgrades, only if verified and revertible
                      └─ screenshots, accessibility/performance checks and final report
```

## Frozen contracts

- A coverage field may define `group`, `glossaryFa` and field-specific anchors; a value is still null or a typed value with a verbatim original evidence span and confidence. Never invent an entailment from substring matching alone.
- Snapshot JSON contains a version, product/type slug, source hash, schema hash, configured model, UTC generation date, and values. Revalidate its shape, hashes and grounding against the current source before display. Missing, stale or invalid snapshots fall back explicitly to rules, never a fabricated model result.
- `ComparableProduct` carries a per-product provenance (`rules`, `snapshot` or `live`) and a bounded evidence context for presentation, not unbounded source text on the comparison page.
- Design tokens: `surface`, `surface-muted`, `surface-raised`, `border`, `text`, `text-muted`, `brand`, `brand-soft`, `brand-strong`, `success`, `warning`, `danger`, `info`, corresponding soft/strong roles, radius and shadow; light/dark values are defined centrally. Components use semantic classes rather than ad hoc colors. Persian body is ≥15px and captions ≥13px; no letter-spacing on Persian.
- Small accessible primitives: button/icon button, chip/badge/card, disclosure, drawer, tooltip, skeleton, toast, score ring and insurer mark. Native elements/ARIA are preferred; document any additional dependency.

## Milestones and checks

- [x] M1: reproduce findings; write tests; freeze contracts, agent roles, hooks, environment conventions, design tokens and font setup.
- [x] M2: P0 grounding and prose fixtures, snapshot generation/replay with mocks, static evaluation assets, safe logging/fallback reasons, bounded API use and standard Prisma generation. Never claim a live model result without a key.
- [x] M3: P1 shareable validated comparison state, mobile nav and keyboard input, consistent scoring/table, PII guard, caching, metadata/security and unified Anthropic client.
- [x] M4: redesign home/comparison/evidence and behind-the-scenes views; responsive light/dark, keyboard and reduced-motion support; honest provenance and author attribution.
- [x] M5: verify official upstream guides, perform upgrades in separable steps only when checks stay green; add CI and Vercel/hosted Postgres deployment instructions. Prisma 7 and Cache Components are explicitly deferred below.
- [x] M6: run typecheck, lint, format, unit/DB integration, eval, production build, Playwright/axe and available visual/performance checks; record exact evidence and limitations in `docs/verification-report.md`. External manual verification remains open.

## Checkpoint evidence (before framework upgrades)

- Baseline: 50 Vitest tests including a real disposable PostgreSQL transaction passed; the previous no-DB run skipped only that opt-in integration test.
- `npm run typecheck`, `lint`, `format:check`, `eval`, and the Next 15 production build passed. Standard Prisma generation required prepopulated genuine engine binaries in this network-restricted sandbox; a clean online install remains unverified here.
- Playwright: 14 tests passed both against development sample mode and production PostgreSQL; axe covered seven routes and the open drawer at 390/1280 in both themes. A roadmap overflow and inspector accessible-name mismatch were found and fixed.
- Offline rules: 129/132 labeled fields, 94/94 exact evidence quotes and 28/30 intent classifications on the synthetic set. Snapshot replay: 0/34 available, not measured; no Anthropic key was available. Model SDK and snapshot validation are tested using mocks only.
- DB cache invalidation was verified by ingesting a temporary fictional premium change and observing it immediately, then reseeding the original sample. `next start` from a different working directory served `/evaluation` and `/api/eval-report` successfully.
- Tokens and UI primitives are in place on Tailwind 3 as the reversible pre-upgrade checkpoint; Tailwind 4's `@theme` conversion is in M5. Native subagents and expert audits remain unavailable; checks are local, not delegated.

## Final local checkpoint

- The default production build, typecheck, lint, format and offline eval passed. With disposable PostgreSQL, 59 Vitest tests and 17 production Playwright tests passed; a separate mocked-network debounce test passed. The latest Lighthouse mobile single runs scored 94/100/100/100 for home and 93/100/100/100 for car comparison. See `docs/verification-report.md` for conditions, 32 screenshots and per-ID status.
- No live Anthropic credentials or model snapshots were available; replay measured 0/34 and correctly exited nonzero. Native Windows, a clean networked Prisma installation, real HTTPS proxy behavior and hosted deployment still require user verification.
- Prisma 7 was reverted after its engine CDN was blocked; Next Cache Components were evaluated but failed prerendering. The working stack remains Prisma 6 with the documented 60-second Next cache. Independent subagents/MCP were not available.

## Risk register

- Realistic Persian insurance language and semantic entailment cannot be proven by exact quotations; unknown or ambiguous values stay null, and limitations must be visible.
- Synthetic fixtures must retain honest, hand-checked labels; metrics must separate offline, snapshot and live and must not silently treat fallbacks as AI.
- The Prisma binary CDN and Anthropic endpoints may be blocked here. Standard Prisma generation is retained in project configuration; any local binary override used for testing must be a real verified engine and never shipped as a Node-binary hack.
- Next/Tailwind/ESLint upgrades can break caching, CSP or Windows installation; keep each step isolated and revert only the failing step, with an explicit report.
- In-memory limits/caches are per process and unsuitable as a distributed production defense; deployment docs must say so.
- Screenshot/axe checks do not replace expert accessibility review; report measured results only, including unavailable Lighthouse or Windows checks.
