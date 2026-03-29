# Language Contract

## Principle

All public-facing wording must reflect implementation reality.

implementation -> wording

If a claim cannot be mapped to system behavior, it should not exist.

## Preferred Vocabulary

resolve, execute, match, return, refuse, map

concept, resolution, contract, runtime, scope, input, output, trace

## Forbidden Terms (public surfaces only)

understand
intelligent
smart
learn
AI-powered
assistant

These imply behavior the system does not perform.

## Mapping Rule

Every statement must be traceable:

"Can I point to where this happens in code?"

If not, remove or rewrite.

## Scope Enforcement

The language contract applies only to public-facing surfaces.
Internal and experimental documents are not restricted.
Public documents must remain aligned with implementation behavior.

## Locked Phrases (do not modify)

deterministic concept resolution system
fixed response contract
unsupported meanings are refused rather than guessed
