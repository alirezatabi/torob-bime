# Evaluation report

- Mode: **snapshot-replay** (saved model output only; no offline substitution)
- Generated (UTC): 2026-11-12T12:55:32.096Z
- Dataset: 34 synthetic free-form Persian policy documents; 30 Persian utterances. These cases and sample wording share authors and are not an independent or expert audit.
- Extraction: not measured (no valid snapshots), across 0/34 evaluated documents; missing/stale snapshots: 34.
- Exact source quote in raw output: not measured (no non-null output). Substring grounding is not semantic entailment. Invalid runs: 0; retried runs: 0.
- Intent: not evaluated in snapshot replay.
- Pass thresholds: extraction ≥80%, raw grounding ≥95%, intent ≥80% when evaluated; no missing snapshots or live fallbacks.

## Per-field accuracy

| Field | Correct / total | Accuracy |
| --- | ---: | ---: |
| None | — | — |

## Failures

- C01: snapshot missing, stale, or invalid (not replaced with rules)
- C02: snapshot missing, stale, or invalid (not replaced with rules)
- C03: snapshot missing, stale, or invalid (not replaced with rules)
- C04: snapshot missing, stale, or invalid (not replaced with rules)
- C05: snapshot missing, stale, or invalid (not replaced with rules)
- C06: snapshot missing, stale, or invalid (not replaced with rules)
- C07: snapshot missing, stale, or invalid (not replaced with rules)
- C08: snapshot missing, stale, or invalid (not replaced with rules)
- C09: snapshot missing, stale, or invalid (not replaced with rules)
- C10: snapshot missing, stale, or invalid (not replaced with rules)
- H01: snapshot missing, stale, or invalid (not replaced with rules)
- H02: snapshot missing, stale, or invalid (not replaced with rules)
- H03: snapshot missing, stale, or invalid (not replaced with rules)
- H04: snapshot missing, stale, or invalid (not replaced with rules)
- H05: snapshot missing, stale, or invalid (not replaced with rules)
- H06: snapshot missing, stale, or invalid (not replaced with rules)
- H07: snapshot missing, stale, or invalid (not replaced with rules)
- H08: snapshot missing, stale, or invalid (not replaced with rules)
- H09: snapshot missing, stale, or invalid (not replaced with rules)
- H10: snapshot missing, stale, or invalid (not replaced with rules)
- T01: snapshot missing, stale, or invalid (not replaced with rules)
- T02: snapshot missing, stale, or invalid (not replaced with rules)
- T03: snapshot missing, stale, or invalid (not replaced with rules)
- T04: snapshot missing, stale, or invalid (not replaced with rules)
- T05: snapshot missing, stale, or invalid (not replaced with rules)
- T06: snapshot missing, stale, or invalid (not replaced with rules)
- T07: snapshot missing, stale, or invalid (not replaced with rules)
- T08: snapshot missing, stale, or invalid (not replaced with rules)
- T09: snapshot missing, stale, or invalid (not replaced with rules)
- T10: snapshot missing, stale, or invalid (not replaced with rules)
- C11: snapshot missing, stale, or invalid (not replaced with rules)
- H11: snapshot missing, stale, or invalid (not replaced with rules)
- T11: snapshot missing, stale, or invalid (not replaced with rules)
- C12: snapshot missing, stale, or invalid (not replaced with rules)

## Limits

The offline parser is a limited set of rules and cannot resolve every unstructured policy or implication. Snapshot replay is not a new live model call. All companies, plans, policies and annual premiums are fictional. Checking the presence, context and unit of a quotation is not proof that it entails the value; users must review the complete terms.
