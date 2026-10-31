# Drawing-space line stroke foundation

`src/stroke-footprint.js` exposes pure deterministic `StrokeFootprint.line`, `.point`
and `.compare` functions, plus conservative local-join and single-cubic helpers. It is **not loaded by the editor**. There is no SVG/CSS
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

The exact footprint API supports only finite nondegenerate horizontal/vertical **single lines**, in either
endpoint order. Butt/square caps produce analytical rectangles. Round caps produce
analytical capsules (the segment Minkowski-summed with a radius `width/2` disk).
Diagonal/curved/zero-length paths, complete joined paths, dashes, clipping, unresolved paint/style,
transforms and non-scaling strokes remain unsupported. Fully transparent or otherwise
conditionally painted strokes must be excluded or resolved by a future adapter; this
input contract describes an explicitly painted stroke, not arbitrary SVG visibility.

## Results and diagnostics

The exact line functions return either `status:'supported'` or `status:'unknown'`
with a reason and scope `drawing-line-stroke`; invalid inputs do not throw to callers. Inputs are
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
unsupported case. Whole joined paths and arbitrary join angles require their own geometry:
conservative join bounds can prove separation when disjoint, but intersecting bounds
cannot prove collision. The local right-angle helper below never infers connections or
models whole joined paths.
Door curves, hosted openings, swing envelopes, passage clearances, units/calibration,
physical/project tolerances and source accuracy need separate evidence and acceptance.

Any saved-report integration needs an explicit checker-version/capability contract and
legacy round-trip tests. Browser rendering and complete preview/Cancel/Apply/Undo
acceptance remain future gates; isolated math tests do not verify the UI. Neither line
contact nor separation certifies construction, structural safety, as-built conditions,
regulatory compliance or physical door clearance.


## Explicit local right-angle join bounds

```js
const corner = {
  kind: 'orthogonal-join',
  points: [[-4, 0], [0, 0], [0, 6]], // incoming endpoint, vertex, outgoing endpoint
  frame: {id: 'example-frame', units: 'drawing', transform: 'none'},
  style: {resolved: true, width: 2, join: 'miter', miterLimit: 4, vectorEffect: 'none'},
  provenance: {geometry: 'explicit synthetic adjacent triple', style: 'explicit join style'}
};
StrokeFootprint.join(corner);
StrokeFootprint.boundSeparation(corner, stroke);
```

All three outer array indices and both coordinates of each point must be own, present
numeric values. There must be two nonzero axis-aligned legs on different axes: exactly
a right-angle turn. Collinear continuation, U-turn, zero-length/diagonal legs, curves,
inferred adjacency and transformed coordinates are unknown. Reversing the triple or
any of the eight axis turn orientations leaves the same enclosing square.

The style requires explicit `resolved`, positive `width`, `join` and `vectorEffect`.
Supported join values are `miter`, `bevel` and `round`. Miter additionally requires an
explicit finite **nonnegative** `miterLimit`; zero is accepted. Bevel/round styles omit
that field (unexpected fields remain unknown). The supported miter-limit profile is
0 through 1,000,000,000; larger finite values are conservative unknowns, not a claim
that they are invalid SVG. The style meaning and miter-limit fallback follow
[W3C SVG2 stroke painting](https://www.w3.org/TR/SVG2/painting.html#StrokeMiterlimitProperty).
No CSS/SVG default or renderer configuration is supplied by this module.

`join` returns `scope:'drawing-local-join'`, `quality:'conservative-bound'`,
`kind:'local-join-square-bound'`, a copied vertex/provenance, explicit width/join/style
limit when applicable, frame ID and `bounds`. The square is the vertex plus/minus
halfwidth on both axes. At a right angle the outer miter tip is offset by halfwidth
on each axis; bevel endpoints and the round arc also remain inside that square.
Miter-limit bevel fallback remains enclosed too. This is a **local join envelope**,
not an exact join shape, complete leg body, endpoint cap or whole path footprint.
It does not classify which join shape a particular miter limit produces.

`boundSeparation` accepts **raw descriptors only**, with at least one local join; the
other operand may be a supported raw line or local join. It rebuilds every bound,
validates resolved styles/provenance and requires matching explicit frames. Mutating
an earlier output cannot influence a later result; passing an output as a descriptor
is unknown. Exact `line`/`point`/`compare` likewise reject join descriptors or bounds.

Strictly disjoint enclosing boxes can return `relation:'separate'` with scope
`drawing-bound-separation`, quality `conservative-bound`, ordered `operandScopes` and copied `operandProvenance`,
exact represented `axisGaps` and `separationLowerBound`. The lower bound is the maximum
positive axis gap; unlike a rounded Euclidean estimate it is an exact conservative
lower bound in drawing units. Touching or intersecting bounds return **unknown**
(`bounds-intersect-or-touch`), never contact, collision or interior overlap. In
particular, an empty rounded/beveled corner can still have overlapping boxes.
Numerical precision/range failures remain unknown under the existing exact-arithmetic
guards. These helpers add no epsilon or physical/project tolerance.

**Scope matters:** a line can intersect a far leg of the declared corner while remaining
strictly outside its vertex square. The helper may prove local-join-region separation
in that case, while the whole joined path still collides. Returned operand scopes and
coverage make that distinction explicit. Callers must not turn this result into a
whole-path, door-swing, passage, physical clearance or saved checker pass.

Fabricated regressions cover all eight turns and reversal for every join style,
explicit zero/low/high miter limits, sparse/inherited coordinates, degenerate and
unsupported geometry/styles, exact numeric extents, bound tangency/false positives,
frame mismatch, far-leg scope, frozen inputs and output tampering. Runtime SVG/style
extraction, whole-path/cap union, arbitrary-angle joins, saved checker contracts and
browser acceptance remain separate gates.

## One regular cubic: conservative envelope only

```js
const curve = {
  kind: 'single-cubic',
  points: [[0, 0], [2, 4], [6, 4], [8, 0]],
  frame: {id: 'example-frame', units: 'drawing', transform: 'none'},
  style: {resolved: true, width: 2, cap: 'square', vectorEffect: 'none'},
  provenance: {geometry: 'synthetic single cubic controls', style: 'explicit cubic style'}
};
StrokeFootprint.cubic(curve);
StrokeFootprint.cubicBoundSeparation(curve, stroke);
```

Four dense own point pairs describe exactly one cubic Bezier segment: start, first
control, second control, end. The frame, style, provenance and numerical profile are
explicit as above; cap must be butt/round/square. Joins, adjacent path segments,
transforms, non-scaling strokes and unresolved/extra styles are unknown.

A deliberately narrow regularity profile is required:

- On at least one axis, all four controls must be monotone nondecreasing or monotone
  nonincreasing, and the axis must be nonconstant. All three adjacent comparisons are
  checked; endpoint order or overall extents alone are insufficient.
- The first control must differ from the start, and the second control must differ
  from the end, so both endpoint tangents are nonzero. Equal middle controls are
  permitted when the other requirements hold.

The derivative is three times a weighted sum of the three adjacent control differences.
Inside the segment, its Bernstein weights are strictly positive. On the supported
monotone nonconstant axis, all differences have the same weak sign and at least one
is nonzero; that derivative component is therefore nonzero in the interior. The
endpoint conditions complete the regularity proof. Unsupported loops, cusp-like or
backtracking profiles stay unknown; the module does not attempt a general cubic
regularity test. Some otherwise valid regular curves deliberately remain unsupported.

`cubic` returns `scope:'drawing-single-cubic-stroke'`, quality `conservative-bound`,
kind `single-cubic-control-hull-bound`, frame/provenance, explicit width/cap,
`controlBounds`, inflated `bounds` and the supporting `monotoneAxes`. All arrays and
provenance are fresh copies. This is an enclosing box, never an exact curve footprint.

A cubic lies in its control-point convex hull and hence in that hull's axis-aligned
box. The box is inflated by the **full stroke width** on every side. Stroke-body
points are at most halfwidth from the curve. Butt/round cap offsets are also bounded
by halfwidth; a square-cap corner is at most `sqrt(2)*halfwidth`, less than fullwidth.
Thus the deliberately loose envelope encloses the whole single regular cubic and its
supported endpoint caps. No adjacent segment, join, complete path, filled region or
door sweep is included. ExactSum guards require represented control differences and
inflated extents; halfwidth must remain positive and normal even though the envelope
uses fullwidth. Precision loss is unknown, not a claim of separation.

`cubicBoundSeparation` is a new raw-descriptor helper, leaving the existing join
`boundSeparation` behavior unchanged. It requires at least one supported raw cubic;
the other operand may be a supported raw line or another single cubic. Local joins
and precomputed/tampered outputs are not accepted. It rebuilds both inputs and requires
identical explicit frame IDs. A strictly disjoint pair of enclosing bounds can return
`relation:'separate'`, scope `drawing-cubic-bound-separation`, conservative quality,
ordered operand scopes/copied provenance, exact represented axis gaps and their maximum
as a conservative drawing-distance lower bound. Touching/intersecting bounds are
**unknown**, never proof of tangency, collision or interior overlap. A loose control
box can overlap even when the actual curve stroke is separated.

Old exact line APIs and the local join API still reject cubic descriptors. Neither
helper expands saved checker capabilities or runtime coverage. A single-cubic result
must not be promoted to a whole-path, connected doorway, passage or physical clearance
pass. SVG/CSS/style extraction, arbitrary regularity, adjacent joins/path unions,
source calibration, saved report contracts and browser acceptance remain separate gates.

Fabricated tests exercise analytic-profile rejection, repeated middle controls,
reflections/reversal, sampled body and endpoint-cap enclosure, tiny normal coordinates,
sparse/inherited coordinates, unresolved styles/frames, strict bounds separation,
bounds false positives, precision limits, frozen inputs and output tampering. Samples
supplement the analytic enclosure proof; they are not a substitute for that proof or
browser rendering acceptance.
