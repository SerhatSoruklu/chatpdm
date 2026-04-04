# Vocabulary Registry Console

This document describes the current public vocabulary boundary surface in ChatPDM.

It is the registry console view, not a plain list. The goal is to make the boundary terms easy to search, filter, and inspect while keeping a clear separation from runtime ontology admission.

## What the Console Shows

The vocabulary registry console presents:

- a short boundary heading and explanation
- a search field for registry terms
- bucket filters for the public boundary categories
- matched-term and page summaries
- card-based term results
- pagination and page-size controls

The console is designed for a large registry. It stays readable when the term set grows into the thousands.

## What the Console Means

The surface is intentionally conservative.

- terms are recognized by the system
- terms remain outside runtime ontology
- bucket labels describe registry status, not concept admission
- the list is for inspection, not promotion

The page is meant to help a reader understand what is present in the boundary set without implying that the terms are live concepts.

## Interaction Flow

The current flow is:

1. search the registry
2. narrow by bucket
3. inspect the matching cards
4. move through pages when the result set is large

Search, bucket filtering, and pagination work together. The page always shows the current registry slice rather than rendering the full set at once.

## Presentation Rules

The console uses a structured card layout because it needs to stay legible at scale.

- cards are used instead of a plain term dump
- each card keeps room for boundary metadata
- counts and summaries stay visible above the results
- the lower surface should read as a registry console, not a CRUD table

The visual baseline is quiet and premium. It should feel deliberate, not decorative.

## Freeze Note

This surface is now treated as the accepted baseline.

The old plain-list vocabulary view is not part of the current direction and should not be reintroduced accidentally.

Any future change should preserve:

- registry-console structure
- bucket filter semantics
- search and pagination behavior
- the distinction between recognized vocabulary and admitted runtime ontology
