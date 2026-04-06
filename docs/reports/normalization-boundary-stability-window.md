Evidence source
  surrogate

Attempts
  total: 43

Changed vs unchanged
  changed: 30
  unchanged: 13

Transform frequency
  surface_cleanup: 0
  unicode_nfc: 1
  percent_decode: 11
  base64_decode: 20
  hex_decode: 5
  reverse_then_base64_decode: 4
  reverse_then_hex_decode: 0

Refusals by code
  NORMALIZATION_TOO_DEEP: 1
  NORMALIZATION_TOO_LARGE: 1
  NORMALIZATION_INVALID_ENCODING: 3
  NORMALIZATION_AMBIGUOUS: 2
  NORMALIZATION_NON_TEXT_OUTPUT: 1
  NORMALIZATION_POLICY_BLOCKED: 0

Latency summary
  count: 43
  p50 bucket: 0-1
  p95 bucket: 0-1
  buckets: 0-1=42, 1-2=1, 2-5=0, 5-10=0, 10-25=0, 25-50=0, 50-100=0, 100-250=0, 250+=0

Depth distribution
  0: 13
  1: 20
  2: 9
  3: 1

Expansion outliers
  none

Repeated boundary signatures
  2x raw=2cb218b62c4a1d6a code=NORMALIZATION_AMBIGUOUS path=none depth=0 input=1-16 output=null shape=repeated_signature,ambiguity_burst
  2x raw=f5ad3d055c5e31cf code=NORMALIZATION_INVALID_ENCODING path=percent_decode depth=1 input=17-64 output=null shape=repeated_signature

Recommendation
  hold
  rationale: low latency, ambiguity is low, refusals are mostly malformed or junk, no credible missed-transform evidence, repeated signatures are sparse and explainable
