# Safety Review

This review exists to reduce interpretation risk around RMG.
The system is deterministic and bounded, but its output can still be misread if wording drifts.

## Top Interpretation Risks

- confidence being read as probability
- supported paths being read as future outcomes
- refusal being read as incapability
- audit output being read as broader reasoning than it is
- broad-collapse language being mistaken for supported collapse prediction

## Top Misuse Risks

- quoting bounded confidence as if it were likelihood
- presenting supported structural paths as forecasts
- omitting unknowns or unsupported bridges when summarizing output
- claiming RMG knows hidden facts not present in authored artifacts

## Safety Rules

- Confidence means bounded support confidence, not probability.
- Supported paths mean supported structural paths within admitted scope.
- Refusal means the query is outside the authored support boundary.
- Inspect and audit surfaces must remain structural and replayable.
- No output may imply prediction, forecast, or hidden inference.
- No new surface may expose more than authored support justifies.

## Why Confidence Can Be Misread

Confidence is a class over authored support strength.
If it is described loosely, readers may treat it as a forecast.
That is incorrect.

## Why Supported Paths Can Be Misread

Supported paths are structural links supported by authored artifacts.
They do not mean the linked outcome will occur.

## Why Refusal Must Be Framed Carefully

Refusal is a boundary outcome.
It should be described as outside current authored support, not as a lack of intelligence or a failure to reason.

## Release Checklist for Wording Changes

- Does any outward wording imply prediction?
- Does any wording imply probability?
- Does any label overclaim what supported paths mean?
- Does any refusal wording imply lack of intelligence instead of boundary enforcement?
- Does any new surface expose more than authored support justifies?
- Does bounded confidence remain clearly non-probabilistic?
- Do inspect and audit surfaces remain structural and replayable?
