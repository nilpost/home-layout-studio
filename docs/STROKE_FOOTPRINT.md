# Drawing-space line stroke foundation

`src/stroke-footprint.js` exposes pure deterministic `StrokeFootprint.line`, `.point`
and `.compare` functions. It is **not loaded by the editor**. There is no SVG/CSS
adapter, UI, project/schema migration, saved checker capability or deployment change.
It prepares a bounded part of HLS-106; it does not complete door/opening review.

## Explicit input contract

```js
const stroke = {
  kind: 'line',
  a: [0, 0], b: [8, 0],
  frame: {id: 'example-frame', units: 'drawing', transform: 'none'},
  style: {resolved: true, width: 2, cap: 'round', vectorEffect: 'none'},
  provenance: {geometry: 'synthetic segment', style: 'explicit synthetic style'}
};
StrokeFootprint.line(stroke);
StrokeFootprint.point(stroke, {point: [9, 0], frameId: 'example-frame'});
StrokeFootprint.compare(stroke, anotherStroke);
```

Every shown field is required. Provenance values are nonempty strings, at most 300
characters; they identify caller-supplied evidence and do not verify it. Frame identity
uses exact string equality. A shared frame asserts already-resolved common coordinates;
the module performs no coordinate conversion. Only `drawing` units, `transform:'none'`
and `vectorEffect:'none'` are accepted. Width must be an explicitly resolved positive
number; omitted CSS/SVG defaults are never supplied. Unknown extra fields reject rather
than silently discarding a dash, transform, clipping or other rendering condition.

Only finite nondegenerate horizontal/vertical **single lines** are supported, in either
endpoint order. Butt/square caps produce analytical rectangles. Round caps produce
analytical capsules (the segment Minkowski-summed with a radius `width/2` disk).
Diagonal/curved/zero-length paths, joins, dashes, clipping, unresolved paint/style,
transforms and non-scaling strokes remain unsupported. Fully transparent or otherwise
conditionally painted strokes must be excluded or resolved by a future adapter; this
input contract describes an explicitly painted stroke, not arbitrary SVG visibility.

## Results and diagnostics

All functions return either `status:'supported'` or `status:'unknown'` with a reason
and scope `drawing-line-stroke`; invalid inputs do not throw to callers. Inputs are
never modified. Callers must retain unknown results as incomplete coverage.

`line` returns shape kind (`rectangle`/`capsule`), axis, explicit cap/width, frame ID,
provenance, `bounds:[minX,minY,maxX,maxY]` and normalized `centerlineBounds`.
These are mathematical drawing footprints, not DOM paths or physical measurements.

`point` returns `relation:'interior'|'boundary'|'separate'` for a point in the same
explicit frame. `compare` returns `interior-overlap|boundary|separate` for two strokes
in the same explicit frame. Boundary contact is distinct from interior overlap.
`separationEstimate` is zero for intersection/contact and a finite positive floating
estimate for separated sets. It is not an exact minimum-distance certificate, tolerance
or physical clearance. No signed penetration depth is returned.

Rectangle pairs use interval intersection. Capsule pairs and mixed rectangle/capsule
pairs use the distance between their axis-aligned centerline segment/rectangle sets,
then compare that distance with the applicable radius sum. A capsule's bounding-box
intersection alone never establishes overlap: rounded corners can leave a real gap.
A point or pair relation uses exact binary interval arithmetic or an exact dyadic
BigInt sign test for `dx²+dy²-r²`; it does not classify near tangency from rounded
`Math.hypot` equality. `Math.hypot` is used only for the separation estimate.

## Conservative numerical coverage

Coordinates and widths are bounded to absolute 1,000,000,000 drawing units. Nonzero
inputs and intermediate extents must be normal IEEE-754 numbers (`>=2**-1022` in
magnitude); subnormal/overflow/underflow values are unknown. Halfwidth must remain
positive and representable. Error-free TwoSum residual checks reject rounded extent,
length, radius-sum or gap arithmetic. Footprint bounds must retain both dimensions
and stay within the coordinate domain. Thus many ordinary decimal translations are
**conservative unknowns**, not invalid drawings. For example, a width 0.1 butt line at
y=0 is supported; at y=1 its computed halfwidth extents are inexact and are unknown.
This deliberately narrower foundation avoids a lost stroke width becoming false proof.

If exact radial sign says separated but the positive floating distance estimate is
zero, subnormal or nonfinite, the result is unknown (`numeric-distance-precision`).
There is no arbitrary epsilon or project tolerance that turns ambiguous arithmetic
into a pass. Unsupported mathematical or rendering scope likewise stays unknown.

## Verification and remaining gates

Run `node tests/stroke-footprint.mjs`. Fabricated fixtures cover every supported cap,
horizontal/vertical/reversed directions, round-cap box false positives, tangency versus
interior, crossing lines, mixed cap shapes, explicit frames/styles/provenance, numerical
limits, extent loss, near tangency and frozen-input preservation.

Before runtime use, a separate reviewed adapter must resolve actual SVG/CSS cascade,
visibility, stroke scaling, transforms, clipping, dashes and provenance, and retain every
unsupported case. Multiple paths/joins and miter limits require their own geometry:
conservative join bounds can prove separation when disjoint, but intersecting bounds
cannot prove collision. This module does not offer join bounds or infer connections.
Door curves, hosted openings, swing envelopes, passage clearances, units/calibration,
physical/project tolerances and source accuracy need separate evidence and acceptance.

Any saved-report integration needs an explicit checker-version/capability contract and
legacy round-trip tests. Browser rendering and complete preview/Cancel/Apply/Undo
acceptance remain future gates; isolated math tests do not verify the UI. Neither line
contact nor separation certifies construction, structural safety, as-built conditions,
regulatory compliance or physical door clearance.
