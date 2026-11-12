# Evaluation report

- Mode: **offline-rules** — deterministic rules, NOT an LLM evaluation
- Generated (UTC): 2026-11-12T11:58:03.524Z
- Dataset: 34 synthetic free-form Persian policy documents; 30 Persian utterances. These cases and sample wording share authors and are not an independent or expert audit.
- Extraction: 129/132 labeled values correct (97.7%), across 34/34 evaluated documents; missing/stale snapshots: 0.
- Exact source quote in raw output: 94/94 (100%). Substring grounding is not semantic entailment. Invalid runs: 0; retried runs: 0.
- Intent: 28/30 (93.3%); priorities 28/30 (93.3%); live fallback exclusions: 0.
- Pass thresholds: extraction ≥80%, raw grounding ≥95%, intent ≥80% when evaluated; no missing snapshots or live fallbacks.

## Per-field accuracy

| Field | Correct / total | Accuracy |
| --- | ---: | ---: |
| car-body.collision (تصادف و برخورد) | 8/8 | 100% |
| car-body.deductible (فرانشیز هر خسارت) | 8/8 | 100% |
| car-body.exclusions (استثنای مهم) | 2/2 | 100% |
| car-body.minor_damage (خسارت جزئی و خط‌وخش) | 6/6 | 100% |
| car-body.natural_events (حوادث طبیعی) | 5/5 | 100% |
| car-body.partial_theft (سرقت لوازم خودرو) | 5/5 | 100% |
| car-body.total_theft (سرقت کلی خودرو) | 6/6 | 100% |
| car-body.vehicle_limit (سقف ارزش خودرو) | 6/6 | 100% |
| supplementary-health.deductible (فرانشیز درمان) | 5/5 | 100% |
| supplementary-health.dental_limit (سقف دندان‌پزشکی) | 6/7 | 85.7% |
| supplementary-health.exclusions (استثنای مهم) | 4/4 | 100% |
| supplementary-health.hospital_limit (سقف بستری و جراحی) | 8/8 | 100% |
| supplementary-health.outpatient_limit (سقف خدمات سرپایی) | 6/6 | 100% |
| supplementary-health.preexisting (بیماری‌های از پیش موجود) | 7/7 | 100% |
| supplementary-health.waiting_period (دوره انتظار) | 6/6 | 100% |
| travel.adventure_sports (ورزش‌های پرخطر) | 5/5 | 100% |
| travel.baggage_delay (تأخیر در تحویل بار) | 7/7 | 100% |
| travel.deductible (فرانشیز درمان اضطراری) | 6/6 | 100% |
| travel.emergency_dental (سقف دندان‌پزشکی اضطراری) | 6/6 | 100% |
| travel.exclusions (استثنای مهم) | 4/4 | 100% |
| travel.medical_limit (سقف هزینه درمان اضطراری) | 8/9 | 88.9% |
| travel.trip_cancellation (لغو سفر) | 5/6 | 83.3% |

## Failures

- H11/dental_limit: expected 0, got null
- T11/medical_limit: expected 30000, got null
- T11/trip_cancellation: expected false, got null
- I29: expected type supplementary-health, got clarify
- I29: expected priorities ["hospital_limit"], got []
- I30: expected type travel, got clarify
- I30: expected priorities ["medical_limit"], got []

## Limits

The offline parser is a limited set of rules and cannot resolve every unstructured policy or implication. Snapshot replay is not a new live model call. All companies, plans, policies and annual premiums are fictional. Checking the presence, context and unit of a quotation is not proof that it entails the value; users must review the complete terms.
