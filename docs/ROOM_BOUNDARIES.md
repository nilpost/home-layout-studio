# Explicit schematic room-boundary foundation

`RoomBoundaries` evaluates an explicitly declared ordered enclosure ring. The editor
provides a separate authoring and review dialog using this existing evaluator. It never
infers a room, edits a source, measures physical area, associates a label or chooses room
intent. The existing consistency checker version and coverage contract are unchanged;
this is a standalone review of supplied declarations. Actual household declarations
remain a separate acceptance step.

## Declarations contain identity and intent, not coordinates

```js
const declaration = RoomBoundaries.createDeclaration({
  id: 'fabricated-enclosure', projectId: 'fabricated-project',
  sourceHash: 'fixture-source', frameId: 'fixture-root-user-space',
  intent: 'enclosure',
  edges: [
    {segmentId: 'wall-a', startEndpoint: 'a'},
    {segmentId: 'window-b', startEndpoint: 'a'},
    {segmentId: 'wall-c', startEndpoint: 'b'},
    {segmentId: 'opening-d', startEndpoint: 'a'}
  ]
});
```

The detached record has exactly `id`, `projectId`, `sourceHashAtCreation`, `frameId`,
`intent`, and `edges`. `sourceHash` becomes `sourceHashAtCreation` on creation.
`startEndpoint:'a'` traverses the referenced segment from a to b; `'b'` traverses b to a.
The order and direction are supplied deliberately. There are no copied coordinates,
synthetic closing edges, automatic reversal/reordering, snapping or gap filling.

`validate(records,{projectId})` returns detached validated records. Identity strings are
nonempty, at most300 characters, and contain no whitespace/control characters. Records
have unique declaration IDs,4–64 unique segment references, and intent `enclosure` or
`open-plan-zone`. Foreign project ownership, malformed records, unknown fields, duplicate
refs/record IDs and excessive sizes reject. Missing refs are retained as metadata and
become unknown at evaluation; validation does not fetch or infer missing geometry.
All arrays must have dense own data slots. Accessors, extra fields and custom object/array
prototypes do not enter record parsing; no input serializer is invoked.

## Explicit current geometry and unsupported evidence

```js
const result = RoomBoundaries.evaluate({
  records: [declaration], projectId: 'fabricated-project',
  sourceHash: 'fixture-source', frameId: 'fixture-root-user-space',
  segments: [
    // Supply every referenced edge from the current guarded geometry extractor.
    {id:'wall-a', kind:'wall', a:[0,0], b:[6,0],
     sourceHash:'fixture-source', frameId:'fixture-root-user-space',
     coordinateStatus:'supported'}
  ],
  unsupported: []
});
```

This deliberately incomplete example is unknown because three refs are unresolved.
A supported edge requires explicit own `id`, semantic `kind` (`wall`, `window` or
`opening`), dense own finite a/b coordinate pairs within ±1e9 drawing units, current
`sourceHash`/`frameId`, and `coordinateStatus:'supported'`. It must be nondegenerate
and exactly horizontal or vertical. Source/frame/coordinate-status claims come from
the caller: this module does not authenticate them, parse SVG, run coordinate guards,
verify extraction or establish units/scale. The caller must supply trustworthy current
extraction evidence rather than relabel unsupported geometry as supported.

`unsupported` must be explicitly supplied, even when empty. Missing evidence remains
unknown; it is never silently treated as complete extraction. A nonempty upstream list
keeps the declaration unknown. Missing geometry/project/source/frame context also stays
unknown. Malformed collection structure, entry IDs or unknown entry fields reject;
referenced missing/unsupported geometry fields, nonfinite/oblique/degenerate coordinates,
ambiguous IDs, missing provenance and unrecognized semantics remain unknown evidence.
Point accessors or inherited/sparse slots are not executed or accepted.

Every numerically used edge must match the **same current source and frame** and have
supported coordinates. A foreign-frame/source or coordinate-unsupported segment is
unresolved and excluded from continuity/contact comparisons; coordinates from different
frames are never compared. A stale declaration association alone can retain conditional
current-geometry violations, if the compared segment subset is current and common-frame.
The declaration nevertheless remains unknown. No implicit transform/registration occurs.

## Supported topology and status

The enclosure profile permits concave orthogonal rings and either winding. Predicates
use only exact equality, ordering and inclusive interval contacts on represented finite
coordinates. They do not subtract to measure gaps, compute area, add epsilon or invent a
physical tolerance. Even a representable subnormal gap is a gap in this narrow model.

The evaluator checks:

- Consecutive directed endpoints and the final declared edge-to-first-edge closure.
- Every adjacent pair for positive overlap/retrace or a contact other than their shared
  directed endpoint. Collinear same-direction endpoint continuation is allowed.
- Every nonadjacent pair for inclusive crossing, endpoint/interior touch and positive
  overlap/retrace; all are violations, including contacts missed by proper-crossing tests.
- Zero horizontal or vertical extent when every declared edge is resolved.

For each declaration, `unknown` dominates supported numerical violations; otherwise
violations produce `fail`, and a complete supported simple closed ring produces `pass`.
Numerical violations among supported edges remain visible beneath unknown context.
Overall unknown also dominates fail: `findings` retains individual failures and
`knownViolationCount` exposes their evidence. `checked` counts only non-unknown
findings. An empty declaration set always returns unknown, never room coverage passed.
`open-plan-zone` remains unknown: closing an arbitrary zone is not proof of room intent.

Every result, including an empty set, carries a fixed `coverage` descriptor with scope
`explicit-declared-schematic-rings-only`, `roomDiscoveryPerformed:false` and
`physicalEnclosureVerified:false`. Passing all supplied records is not a complete
inventory of actual rooms or whole-house coverage.

A pass means only the explicitly declared schematic ring satisfies this profile. An
opening span can mathematically close a ring without proving physical enclosure, a
hosted door, usable circulation or survey accuracy. Holes, adjacency, room labels/IDs,
wall thickness/faces, multiple levels, curved/oblique boundaries, area/perimeter,
calibrated dimensions, jo/tatami conversion and regulatory/structural conclusions are
outside this foundation. It does not check undeclared rooms or the whole plan.

## Limits, detached results and acceptance

At most1,000 records,64 edges per record,20,000 geometry entries and20,000 upstream
unsupported messages are accepted. Upstream messages are nonempty strings up to2,000
characters. All pair checks still run within the ring limit. Finding evidence samples
at most96 numerical violations while preserving exact `numericalViolationCount`,
unique violation codes and `violationsTruncated`; no checked pair silently disappears.
Only a10-message/200-character upstream sample is copied once at result level, with
counts and truncation flags. Each finding also carries up to64 detached `resolvedEdges`
with edge index/ref, semantic kind, selected direction, directed a/b endpoints and
current source/frame provenance. These transient coordinates make continuity/contact
evidence inspectable; unresolved or foreign-frame/source edges contribute no coordinate
evidence. Coordinates are never copied into stored declarations, and no measured
distances/areas are invented.

Input records, geometry and frozen arrays are unchanged. Validated records, finding
metadata, arrays and evidence are detached. Run `node tests/room-boundaries.mjs` for the
fabricated topology/provenance/unknown matrix. Tests include both windings, concavity,
collinear continuations, exact tiny gaps, contact/overlap/retrace cases, mixed-frame
rejection, retained violations under unknown, explicit limits and frozen isolation.
No existing opening-binding epsilon, consistency checker or source contract is changed.


## Site authoring and private persistence

Open **Review declared boundaries** to choose a saved declaration or create a new one.
Set the intended use, then choose each boundary segment and traversal direction in
deliberate order. Preview shows the bounded directed-edge diagram and pass/fail/unknown
findings. No edges are reordered, reversed, snapped or inserted automatically. An
opening span can close a schematic outline without establishing physical enclosure.

Preview is transient. Explicit Save/remove uses the existing project transaction,
audit and Undo/Redo; source geometry and source dimension labels are unchanged. A
reviewed draft is bound to current project identity, state and source. Replacing the
source leaves saved declarations associated with their earlier hash; a fresh reviewed
association must be explicit. Missing or changed references remain visible as unknown.

Optional `roomBoundaries` metadata is validated using the existing module, retained
in private project backup/import and copied into manual handoffs. Older projects without
the field remain supported. No coordinates or computed physical areas are stored in
declarations. The evaluator result is separate from saved consistencyReports and does
not silently add coverage to the existing checker version.

The site supplies current geometry through its guarded source extractor and additional
source-shape provenance checks. It carries upstream unsupported evidence rather than
assuming complete extraction; transformed, ambiguous, malformed or unsupported source
geometry cannot become a supported root-frame edge merely by being selected.

Fabricated production-function tests and browser acceptance must be distinguished
from actual household review. Survey accuracy, physical enclosure, calibrated areas,
room discovery, adjacency and complete architectural/code review remain outside this
feature. Test data and screenshots use fabricated geometry only.


### Verified local acceptance — 2026-11-02

Forty production-function workflow cases plus independent probes cover guarded source
extraction, legacy/foreign/malformed imports, handoff preservation, source/state/policy
changes, Save/remove/Undo, storage rollback, delayed dialog events and visible limit/
display failures. Additional source-proof failures conservatively suppress numerical
coordinates for all extracted segments; this loses supported-subset detail deliberately
rather than producing trusted evidence from an unproved source context.

Native browser acceptance with fabricated native-line geometry verified explicit ordered
selection, a passing ring diagram, Cancel, Save, handoff, export/import/reload, removal
and Undo. Full exports prove Cancel/Undo exact preservation and Save changing only
declarations/revision/state token/audit; source bytes and unrelated data are unchanged.
A reversed edge fails, open-plan intent remains unknown, and changed-source declarations
remain unknown with Save disabled until a fresh preview. Native Escape saves nothing.
Previous generic browser test data was preserved and restored. No actual household room
was declared or certified.
