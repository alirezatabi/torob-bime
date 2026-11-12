# Deployment: Vercel + hosted PostgreSQL

This is a proposed deployment procedure, **not a claim that a deployment has been performed**. Use a dedicated database and a hosted PostgreSQL provider such as Neon. Verify the current provider documentation for connection pooling, TLS, quotas and supported Node versions.

## 1. Prepare a database

1. Create a dedicated PostgreSQL database and obtain its TLS connection URL from the provider. Keep it secret and URL-encode special characters in credentials. Configure TLS using the provider's instructions.
2. In a local shell with access to that database, set `DATABASE_URL` to the **direct migration connection** (many pooled endpoints have migration/advisory-lock limitations). Run `npm ci`, then `npm run db:deploy`. If you want the fictional demo catalogue, run `npm run db:seed` against this same dedicated database. These commands mutate the selected database; never use a real production database for tests or experiments.
3. If you generate real model snapshots first, seed again afterwards. Snapshot generation and live evaluation call a paid external API; review the data and costs first.

## 2. Configure and deploy

1. Import the repository into Vercel as a Next.js project, select Node 22, and keep the `npm run build` build command. `postinstall` and build use standard `prisma generate`; the builder must be able to reach Prisma's binary CDN. This has not been verified from a clean networked install here.
2. Set `DATABASE_URL` in Vercel's server environment to the appropriate runtime connection URL (use a provider-supported pool for serverless traffic where appropriate). Set `NEXT_PUBLIC_SITE_URL` to the final HTTPS site origin for sitemap/robots metadata.
3. Optionally set **both** `ANTHROPIC_API_KEY` and `LLM_MODEL`; optionally set `LLM_MODEL_FAST`. Never expose the key with a `NEXT_PUBLIC_` prefix. Without them the intent and explanation paths use rules. Set secrets separately for preview and production and do not commit `.env.local`.
4. Do **not** set `ALLOW_PREVIEW_EMBED` in a public deployment: its explicit development-preview opt-in relaxes `frame-ancestors` and removes `X-Frame-Options`. Keep `TRUST_PROXY` unset unless the actual proxy's forwarding behavior is audited and it strips/sanitizes client-supplied addresses.
5. Deploy. The application renders pages dynamically to attach a per-request CSP nonce. `/evaluation` and `/api/eval-report` import build-time assets rather than reading files relative to the runtime working directory. The DB catalogue uses a revision-keyed Next cache with a 60-second revalidation; a successful ingestion creates a new revision.

## 3. Manual smoke tests after deployment

- Open `/`, all three `/compare/...` routes, `/evaluation`, `/api/eval-report`, `/roadmap`, and an invalid category (expect HTTP 404). Confirm fictional data, provenance, responsive layout, a source drawer, and the behind-the-scenes route.
- Test same-origin search with an ordinary browser. Verify a foreign origin is rejected and JSON/content-size/rate errors have the intended status. Check CSP, `frame-ancestors`, `X-Frame-Options`, content type and referrer headers. Test the real deployment proxy: local forwarded-header simulation is not a substitute.
- In a **separate staging environment**, verify database-empty/unreachable fallback and a successful ingestion/refresh. Do not break a production DB to test fallback. Exercise migrations and serverless connection limits with the provider's monitoring.
- If a model key is configured, run `npm run snapshot` from an appropriately secured machine with network access, inspect the resulting values and evidence, then seed/rebuild and verify the displayed model and original generation date. Run `npm run snapshot -- --eval` and `npm run eval -- --snapshot` separately if an extraction replay metric is wanted. These are real paid calls; do not present mocked or offline results as model measurements.

## Production gaps

The per-process token bucket and explanation cache are demonstrations, not distributed abuse protection. Replace them with a shared atomic store/gateway, use a trusted IP-forwarding configuration, set provider spending limits, and add monitoring before public use. Search-text PII detection is incomplete; do not enter sensitive data. Budget and comparison choices appear in the shareable URL. Synthetic policies and premiums are not market data, and quote matching is not semantic entailment. Accessibility, model performance, resilience, security and regulatory suitability all require independent review.
