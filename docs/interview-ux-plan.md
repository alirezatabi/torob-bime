# Interview-ready product and UX pass

## Review against the original prompt

- The core product is an insurance **comparison/search** demo: a Persian need leads to a deterministic, explainable ranking; exclusions and source quotations are first-class. The existing pipeline and three schema-driven types support this, but cards mostly list fields rather than clearly saying which grounded fact contributes to a score. Make that connection visible without presenting a model selection as a model-written explanation or claiming causation from an unsupported value.
- The first screen is honest and responsive, but the headline is abstract, the search label is visually hidden, and long explanatory text is often rendered at caption size. Make the purpose, next action and sample-data caveat easier to scan in an interview.
- Textarea, budget input, checkbox and three selects use different one-off styling. Build a consistent accessible control system with clear labels, hints, focus/error/disabled states and a designed dropdown in both themes and RTL.
- Four narrow desktop plan cards make 13 px text dense. Give ranking/exclusion explanations more space, simplify the visual hierarchy and provide quick navigation to the significant comparison sections without removing evidence or the two-plan mobile table.

## Decisions and constraints

- Keep fictional sample labels, transparent score/requirements, source buttons, unknown-versus-not-covered distinction, privacy notices, URL state and schema-driven data. Do not invent market prices, insurer trust, model results or AI-written explanations.
- Use accessible Radix Select only for a fully styled, keyboard-operated select/menu; it is a focused headless dependency rather than a custom ARIA keyboard implementation. Keep the remaining input and checkbox elements native. Document and test its keyboard and mobile behavior.
- Increase small supporting text to 14 px and ordinary body text to at least 16 px where practical. Preserve semantic theme tokens, reduced-motion, RTL and 44 px interactions.
- The home retains a layout-shaped loading skeleton. The comparison renders without a streamed Suspense wrapper: rapid Back/Forward during partial hydration previously left stale, inert server-rendered controls. Its entry links and intent confirmation instead show an accessible pending state while the server prepares data. Test both the pending state and history during delayed hydration.

## Milestones

- [x] 1. Add reusable form controls and replace every current input, textarea, checkbox and select; verify errors, keyboard, focus, RTL, mobile and dark mode. Radix's modal select marks the application shell inert while open and restores focus on close; both open-menu themes were checked with axe and keyboard interaction.
- [x] 2. Clarify the home value proposition and presentation flow; improve comparison navigation, density and card readability; explicitly connect each ranking summary to a verified fact and a source. The home disclaimer and footer distinguish mixed catalogues; mobile table counts use the displayed pair. Source-less values remain unknown and are never linked as evidence.
- [x] 3. Test ranking/fact eligibility, representative flows, select menus, mobile and desktop layouts, axe, lint/typecheck/unit/build and the production browser suite. Inspected and refreshed 36 screenshots and updated demo guidance. The default build passed 66 unit tests (including two with PostgreSQL), 33 browser tests and 3 mocked-AI tests; offline eval remains 129/132 values, 94/94 quotes and 28/30 intents. Automated axe is not a manual accessibility audit. Real Anthropic, native Windows and deployed proxy checks remain unverified.
