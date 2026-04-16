# UK Domain Wave Notes

## Scope

- `UK_AIRSPACE_CONTROL_V1` is the first executable UK air-domain pack.
- `UK_GROUND_MANEUVER_V1` is the first executable UK ground-domain pack.
- Both packs depend on the admitted INTL baseline and the admitted UK foundation layer.

## Boundary Notes

- `UK_AIRSPACE_CONTROL_V1` keeps its gate logic in the air domain and does not absorb no-fly, target-approval, or collateral-refinement overlays.
- `UK_GROUND_MANEUVER_V1` keeps its gate logic in the land domain and does not absorb detention, checkpoint, or search/seizure overlays.
- Neither pack redefines UK national baseline, ROE baseline, command authority, or delegation semantics.
- Neither pack introduces coalition or NATO behavior.

## Divergence From The US Model

- The UK air pack keys off the UK ROE baseline and UK delegated authority path.
- The UK ground pack keys off the UK delegation baseline and explicit action authorization.
- The domain gates are bounded execution packs, not umbrella family labels.
