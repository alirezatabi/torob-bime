# Evaluation report

- Mode: **offline-structured-parser** — deterministic parser and keyword classifier, NOT an LLM evaluation
- Generated (UTC): 2026-11-12T09:10:11.903Z
- Dataset: 34 separately authored, manually checked fictional policy snippets; 30 Persian utterances. This is a small synthetic test, not an insurer or independent domain-expert audit.
- Extraction: 126/132 labeled field values correct (95.5%).
- Evidence grounding: 91/91 non-null values in the final raw response (before sanitization) contain a verbatim source quote (100%). This tests substring grounding, not semantic entailment. Invalid runs: 0; runs with retries: 0.
- Intent type/clarification accuracy: 28/30 (93.3%). Exact priority-set accuracy: 28/30 (93.3%). Live model fallbacks excluded: 0.
- Pass thresholds: extraction ≥80%, raw grounding ≥95%, intent type ≥80%; zero live-model fallbacks.

## Per-field accuracy

| Field | Correct / total | Accuracy |
| --- | ---: | ---: |
| car-body.collision (تصادف و برخورد) | 7/8 | 87.5% |
| car-body.deductible (فرانشیز هر خسارت) | 7/8 | 87.5% |
| car-body.exclusions (استثنای مهم) | 2/2 | 100% |
| car-body.minor_damage (خسارت جزئی و خط‌وخش) | 6/6 | 100% |
| car-body.natural_events (حوادث طبیعی) | 5/5 | 100% |
| car-body.partial_theft (سرقت لوازم خودرو) | 5/5 | 100% |
| car-body.total_theft (سرقت کلی خودرو) | 6/6 | 100% |
| car-body.vehicle_limit (سقف ارزش خودرو) | 6/6 | 100% |
| supplementary-health.deductible (فرانشیز درمان) | 5/5 | 100% |
| supplementary-health.dental_limit (سقف دندان‌پزشکی) | 6/7 | 85.7% |
| supplementary-health.exclusions (استثنای مهم) | 4/4 | 100% |
| supplementary-health.hospital_limit (سقف بستری و جراحی) | 7/8 | 87.5% |
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

- C11/collision: expected true, got null
- C11/deductible: expected 10, got null
- H11/hospital_limit: expected 90000000, got null
- H11/dental_limit: expected 0, got null
- T11/medical_limit: expected 30000, got null
- T11/trip_cancellation: expected false, got null
- I29: expected type supplementary-health, got clarify
- I29: expected priorities ["hospital_limit"], got []
- I30: expected type travel, got clarify
- I30: expected priorities ["medical_limit"], got []

## Limits

The structured offline parser only understands labeled demo-style lines; it is not evidence of performance on real, unstructured policies. The raw evidence rate does not prove that a quotation entails a value. Unknowns are counted against labeled expectations, and invalid model outputs are never silently called successes.
