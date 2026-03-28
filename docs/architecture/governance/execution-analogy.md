# Execution Analogy

This note is an analogy for execution gating in ChatPDM.

It is not the product definition.
It is a compact way to think about how the system evaluates inputs and refuses invalid execution states.

## Traffic analogy

- rules -> speed limit
- behavior -> driving speed
- non-compliance -> exceeding the limit
- evaluation -> camera detects the violation
- enforcement -> ticket issued

## ChatPDM mapping

- rules -> authored contract and promotion rules
- behavior -> a query or concept packet entering runtime
- invalid state -> unsupported scope, invalid structure, or unresolved execution state
- evaluation -> loader validation, query classification, and scope checks
- enforcement ->
  - block promotion (authoring level)
  - refuse execution (runtime level)

## Why this analogy exists

The analogy separates evaluation from enforcement.

In ChatPDM:

- not every invalid or unsupported state produces the same outcome
- the system evaluates first
- the system acts only through explicit authored rules
- evaluation does not change the validity of the input; it determines whether the system acts on it

The important distinction is:

- evaluation decides whether the input is actionable
- enforcement is the system response after that evaluation

## Failure taxonomy

The analogy is also useful for separating boundary failure from resolution failure.

- out-of-scope meaning -> language boundary failure
- in-scope but unclear meaning -> resolution failure
- evaluated, actionable invalid state -> enforcement path

This matters because ChatPDM should not treat every failure as the same kind of failure.

## Boundary

This analogy is only for understanding execution flow.

It must not replace the canonical product definition, response contract, or authored concept model.
