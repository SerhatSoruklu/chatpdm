# RMG Terminology

- **admitted**: a scenario query that fits the authored domain, scope, and evidence boundary
- **narrowed**: a scenario query reduced to the supported subset of its original scope
- **refused**: a scenario query that exceeds the authored boundary and cannot be supported safely
- **domain**: the bounded subject area a scenario query is allowed to use
- **scope**: the specific subarea within a domain that a query addresses
- **evidence pack**: a versioned authored collection of evidence records used for support checks
- **registry**: an authored lookup set that defines allowed nodes, threats, paths, or constraints
- **supported path**: a causal path that is permitted by the registry boundary and evidence support
- **unsupported bridge**: a causal jump that is not justified by authored support
- **falsifier**: an authored condition or fact that would weaken or block a scenario claim
- **bounded confidence**: a limited support class returned by contract, not a probability claim
- **scenario query**: a request about a bounded risk scenario rather than a concept definition
- **governance**: the rule system that constrains what can be admitted, narrowed, validated, or refused
- **admission diagnostics**: a structured explanation of why a query was admitted, narrowed, or refused

