# Feedback Module

This module stores Phase 8.5 diagnostic feedback for the ChatPDM beta surface.

It captures one explicit feedback event per submitted response review. The stored record includes:

- session identifier when available
- raw query
- normalized query
- response type
- selected feedback option
- resolved concept when relevant
- candidate concept IDs for ambiguity feedback
- suggestion concept IDs for no-match feedback
- contract and resolver version fields
- creation timestamp

This module is intentionally narrow. It is not an analytics layer, admin system, or public reaction system.

