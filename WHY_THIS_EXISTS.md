# Why This Exists

ChatPDM exists because meaning drift is a real failure mode. If a system rewrites, paraphrases, or “helps” too much, it can quietly change what a term means. ChatPDM is built to keep meaning anchored: authored concepts stay authoritative, registry terms stay visible but bounded, and unsupported queries are refused instead of guessed.

## The Problem

In many systems, wording changes are treated as harmless. In practice, they are not.

- A rephrased explanation can shift the semantic payload.
- One layer can say one thing while another layer says something slightly different.
- Ambiguous input is often softened into an answer instead of being refused.
- Developers lose the boundary between what is canonical, what is inspectable, and what is out of scope.

That is fine for chat-style products. It is not fine when consistency matters.

## Why Current Systems Fail Here

Most AI-style systems generate an answer at runtime. That means they can:

- paraphrase instead of preserve
- fill gaps with plausible wording
- blur the line between definition and explanation
- hide uncertainty behind fluent output

If the system is supposed to preserve stable meaning, that behavior is a problem.

## What ChatPDM Does Differently

ChatPDM is a deterministic concept-resolution system.

It works in a bounded loop:

`normalize -> classify -> resolve or refuse`

It separates three states:

| State | What it means |
| --- | --- |
| `core_concept` | runtime-admitted, definition-led, canonical |
| `registry_term` | recognized and visible, but not admitted to runtime ontology |
| refusal | the query is outside the authored boundary or cannot be resolved safely |

Concrete examples:

- `law` is a canonical concept. It is admitted, defined, and resolved inside the runtime contract.
- `ab initio` is a recognized registry-only term. It is visible for inspection, but it is not promoted to runtime concept status.
- `civic duty` is not silently expanded into a made-up answer. If the query cannot be resolved exactly, ChatPDM refuses and may suggest a broader authored term like `duty`.

## Why a Developer Should Care

If you need any of the following, ChatPDM is worth understanding:

- stable meaning across versions
- deterministic interpretation instead of probabilistic phrasing
- refusal instead of semantic guessing
- a clear boundary between canonical concepts and registry-only vocabulary
- a system where definition stays authoritative

That matters when the cost of drift is high: policy surfaces, governance terms, concept contracts, validation systems, or any workflow where explanation must not silently mutate.

## What You Can Do With It Today

- Inspect canonical concepts and see their definition-led outputs.
- Inspect registry-only terms and see why they are visible but not admitted.
- Test supported and unsupported queries.
- Compare how the runtime resolves, suggests, or refuses.
- Use the repo as a reference for deterministic, bounded meaning instead of open-ended generation.

## What ChatPDM Is Not

ChatPDM is not:

- a chatbot
- a general-purpose AI assistant
- an open-world reasoning engine
- a universal ontology platform
- a system that guesses when it should refuse

It is a bounded concept system with explicit admission rules.

## Current Scope

ChatPDM v1 is intentionally narrow.

It currently focuses on authored concept resolution, registry visibility, explicit refusal, and governance-scoped meaning. The system is designed to stay within that boundary until the contract is intentionally expanded.

## Closing Line

If you need meaning to stay stable, bounded, and inspectable, this is why ChatPDM exists.
