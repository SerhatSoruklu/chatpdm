# Lock 7 - Drift Alarm Metrics

## Purpose

Watch for slow systemic drift before it becomes visible in production.

Language systems usually fail gradually, not suddenly.

## Rule

Track a small set of deterministic health metrics over time.

Recommended metrics:

- percentage of concepts exposing all 3 registers
- average token overlap between registers
- most common validator failure reason
- most common validator warning reason

## What It Protects

This lock prevents:

- invisible register collapse
- unnoticed increases in validation failures
- slow weakening of authoring discipline

## What To Watch

Warning signals:

- overlap trending upward across concepts
- increasing `too close` failures
- repeated drift warnings in the same register
- decreasing number of concepts with 3 valid registers

## Operational Standard

Record these metrics regularly and review changes, not just snapshots.

The point is not analytics for its own sake. The point is early detection of decay.
