# Concept Audit Log

This folder stores append-only audit records for concept governance events.

Current convention:

- `data/concept-audit-log/<concept>/` stores immutable per-change records
- each record is a standalone JSON file
- audit files are append-only and must not be overwritten in place

The audit log exists so concept governance stays inspectable across:

- change classification
- validator state at decision time
- approval history
- publication history
