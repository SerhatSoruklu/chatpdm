# Lock 6 - Derived Exposure Only

## Purpose

Keep the UI honest by deriving exposure from validation state instead of manual flags.

If exposure can be toggled independently, the interface will eventually lie about register quality.

## Rule

Register visibility must be derived from validator output, not manually enabled.

Do this:

```ts
showSimplified = validation.exposedRegisters.includes('simplified');
```

Do not do this:

```ts
showSimplified = true;
```

## What It Protects

This lock prevents:

- fake-distinct UI exposure
- stale manual overrides
- product drift between authored content and rendered truth

## Runtime Standard

If only `standard` passes, only `standard` appears.

If `simplified` or `formal` fail validation, they remain hidden.

No disabled placeholders should be used to suggest unavailable quality.
