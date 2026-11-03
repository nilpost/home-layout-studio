# Declared-ring drawing-unit metrics

This read-only HLS-106 increment previews area and perimeter for explicit, current,
passing schematic enclosure rings. Values use **drawing units** and **drawing units
squared**. They do not identify rooms or establish physical area, enclosure, survey
accuracy, structural safety or regulatory compliance. An opening span may close a
schematic outline without making it a physical enclosure.

## Supported profile

The metric module accepts the same raw evidence as `RoomBoundaries.evaluate` and runs
that evaluator internally. It never accepts a caller's assertion that a ring passed.
Existing project/source/frame, semantic, unsupported-evidence and topology checks remain
mandatory. Unsupported or stale evidence, open-plan intent and failed topology have no
totals. Fractional represented coordinates are outside this first numerical profile;
they are not rounded, snapped or silently omitted.

Integer represented coordinates use exact integer intermediates for shoelace area and
axis-aligned edge lengths. Totals are returned as JSON-safe decimal strings rather than
BigInt or potentially unsafe numbers. This avoids cancellation for small rings at large
coordinates and preserves large totals. Winding does not change absolute area. A
collinear continuation is valid only when the original topology evaluator permits it.

## Transient API

`RingMetrics.evaluate(rawBoundaryInput)` returns detached JSON-safe data under metric
contract version 1 and profile `integer-root-drawing-units-v1`. Each finding identifies
the declaration, project, current source hash and frame, with separate topology status,
metric status and reasons. Computed `areaDrawingUnitsSquared` and `perimeterDrawingUnits`
are exact decimal strings. Unavailable totals are null. The aggregate status is computed
only when every declaration has a supported computed result; otherwise it is unknown.
A mixed collection may retain individual supported readings without asserting whole-project
measurement coverage. Empty collections remain unknown.

For example, a 1-by-1 integer ring translated near coordinate 1,000,000,000 still returns
area `"1"` and perimeter `"4"`. A maximum-coordinate ring may return a total above the
safe Number range as an exact string. Consumers must retain these strings, rather than
coercing them into approximate numeric values or physical units.

## Preview and compatibility

The boundary dialog shows a transient metric preview with explicit drawing-unit labels
and reasons when unavailable. Changing inputs or current source/state/policy invalidates
the preview through the existing review guards. Merely viewing metrics performs no saved
project mutation. Save/Cancel continue to affect only the explicit declaration.

No metrics are persisted or exported in this slice. Project declaration schema 1,
`RoomBoundaries.evaluate`, checker 1.5 evidence, historical saved reports and broad room
coverage remain unchanged. Drawing-unit metrics do not promote saved physical area
coverage into checked status. Existing global calibration lacks source/frame/span binding
and is deliberately not used for physical conversion.

Fabricated production-function and exact arithmetic regressions provide program-level
evidence. Native browser input/readability and actual private-project acceptance remain
separate; preserve a fresh complete current UI export before any household reload/edit.
