# Overlay rotation math foundation

Status: isolated engineering foundation. `overlay-footprint.js` is not loaded by the
application; persisted item rotation, rotation controls and rotated rendering are not
delivered by this increment. HLS-107 rotation remains planned.

`OverlayFootprint.rectCorners({x,y,w,h,rotation=0})` returns four detached `[x,y]` corner
pairs in original local top-left, top-right, bottom-right, bottom-left order, transformed
around the derived center `(x+w/2,y+h/2)`. `bounds(rect)` returns the detached axis-aligned
envelope `{x,y,w,h}`. No input, source geometry or project state is changed. Optional
`kind` may be `furniture` or `rect`; other item kinds are unsupported. Other metadata is
ignored by the math and remains untouched on the original item.

Angles are degrees, finite numbers in the explicit inclusive range [-360,360]. Missing
or undefined rotation means zero; null, strings, infinities and out-of-range values reject.
Angles within this range normalize only internally for trigonometry. The helper never
rewrites a supplied angle. Positive rotation follows SVG: clockwise on screen when y
increases downward. Quarter turns use exact sine/cosine values, avoiding near-zero trig
artifacts. Zero/full turns preserve original corner edge arithmetic. Arbitrary-angle
coordinates retain normal floating-point precision; no architectural snapping occurs.

Input coordinates and positive widths/heights, resulting corner coordinates and envelope
width/height are bounded by `MAX_COORDINATE=1e9` drawing units. Nonfinite arithmetic,
out-of-range envelopes and footprints whose area collapses at floating-point precision
reject. Extremely small dimensions can therefore reject even when mathematically positive.
This numeric supported range is not a survey tolerance, scale calibration or construction
allowance. Reflections/negative dimensions are not rotation and reject.

## Required integration before claiming rotation support

1. Introduce an optional persisted item angle defaulting to zero only for furniture and
   box overlays. Validate it consistently on normal edits, private import, save/restore
   and correction adapters. Preserve legacy backups without an angle and original source
   uploads. Do not silently migrate an unrelated metadata field into geometric meaning.
   The helper's full-corner/envelope limits are stricter than legacy validation of each
   coordinate and size separately: an old item can have individually valid `x` and `w`
   while `x+w` exceeds the new limit. Do not retroactively call this helper to reject an
   otherwise valid unrotated legacy backup on import. Retain the existing document and
   geometry, explain unsupported footprints, and require an explicit reviewed adjustment
   or migration before using those items with the new rotation operation. No silent
   geometry clamping, deletion or normalization is an acceptable compatibility path.
2. Extend the shared validated proposal model with explicit center-pivot rotation preview
   and guarded apply. Keep local width/depth unchanged; preserve stable IDs, labels, source
   references, locks, hidden state and all other metadata.
3. Render the rectangle and its label under the same SVG rotation. Hit targets, selection
   highlighting, ghost previews and pivot markers must agree with the rendered geometry.
   Preserve the transform in SVG exports and the angle in JSON backup/handoff.
4. Use shared rotated corners for item bounds, plan-boundary findings, scaling previews
   and group translation validation. Unrotated size checks alone cannot validate rotated
   extents. Verify move/scale after rotation and translation of mixed rotated overlays.
5. Exercise cancellation, stale state/selection, hidden/locked rejection, atomic failures,
   undo/redo, storage failure and old backups. Test 0, +/-90, 180 and arbitrary angles,
   including items near plan edges and labels/hit targets after transforms.

Swapping width and height at quarter turns changes an axis-aligned footprint; it does not
preserve label orientation or express general rotation and must not be presented as such.
This foundation supplies no wall/door topology, group rotation, architectural source edit,
physical placement inference or safety/compliance verification.
