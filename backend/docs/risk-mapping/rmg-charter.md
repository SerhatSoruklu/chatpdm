# RMG Charter

Risk Mapping Governance (RMG) is a bounded subsystem inside ChatPDM.

RMG is deterministic. Given the same input, domain manifest, registries, and evidence pack version, RMG must produce the same output.

Its purpose is to admit, narrow, validate, or refuse scenario queries under explicit authored rules. It does not predict outcomes, infer hidden states, or generate open-ended analysis.

RMG exists to provide a deterministic governance layer for scenario structure. It keeps risk-oriented queries inside explicit domains, registries, evidence packs, and contracts so unsupported claims are blocked early rather than expanded silently.

RMG is not a replacement for core LLGS concept resolution. LLGS remains the primary concept system. RMG is a parallel bounded layer with its own rules and its own admissibility boundary.

Core invariant:

- if a scenario query is supported by the authored domain and evidence boundary, RMG may admit or narrow it
- if a scenario query is only partially supported, RMG must narrow it
- if a scenario query exceeds the authored boundary, RMG must refuse it
- all admitted outputs must be traceable to explicit registry entries and evidence support

RMG governs admissible scenario structure. It does not predict futures.
