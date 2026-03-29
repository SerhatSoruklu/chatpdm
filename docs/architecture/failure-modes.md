# Failure Mode Registry

This registry defines strict structural failure modes for ChatPDM. These are not user-facing concepts; they are internal invariants used to evaluate system integrity, test refusal logic, and govern inspectability.

---

## 1. False Trace Assertion

**Alias:** Fake Memory Injection  
**Type:** Trace integrity failure  

**Definition:**  
A system behavior where prior interaction history is incorrectly reconstructed and presented as factual, conflicting with the actual verifiable trace.

**Trigger Condition:**  

- A claim about a past interaction is made by the system AND
- The claim is asserted without explicit uncertainty AND
- The claim cannot be verified from the actual trace.

**Risk State:**  

- `Unverified Trace Assertion` applies when a past-trace claim is asserted without verifiable trace support.

**Confirmed Violation Condition:**  

- `False Trace Assertion` applies when an unverified past-trace claim is later confirmed to conflict with the actual trace.

**Not this if:**  

- The system explicitly declares uncertainty.
- The system requests confirmation from the user.
- The reconstruction matches the actual trace perfectly.
- The issue pertains to a future prediction, not past recall.

**Required System Response:**  

1. Refuse certainty.
2. Surface uncertainty immediately.
3. Classify the event as `Unverified Trace Assertion`.
4. Re-anchor to verified trace or request confirmation.
5. Escalate to `False Trace Assertion` if contradiction is confirmed.
