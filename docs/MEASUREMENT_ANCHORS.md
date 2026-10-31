# Explicit measurement anchors

This local HLS-106 foundation binds one original dimension to two user-selected
schematic wall/window segment endpoints. It does not infer anchors from nearby labels,
screen pixels, PDF paper size or camera images. A binding records user intent; it is not
physical verification of either endpoint. No original dimension text/value is rewritten.

Persist `measurementAnchors` as an array. Absent legacy data validates as `[]`.
Each record has `id`, `projectId`, `dimensionId`, `start` and `end` endpoint references,
`sourceHashAtCreation`, and optional ISO UTC `createdAt`. An endpoint is
`{segmentId,endpoint:'a'|'b'}` using the exact stable segment ID returned by the geometry
model, including a subsegment suffix where present. One binding per dimension prevents
competing interpretations. Duplicate identities, unknown fields and malformed references
are rejected. Orphan references remain valid metadata and review as unknown.

`MeasurementAnchors.createBinding({id,projectId,dimensionId,start,end,sourceHash,
createdAt})` returns a detached normalized record. The caller supplies stable IDs and
explicit endpoint choices. `validate(anchors,{projectId})` validates/copies stored records
without reading source files or resolving references. Source edits never silently refresh
`sourceHashAtCreation`: stale bindings require deliberate re-confirmation against the new
source, ideally preserving the earlier binding in reversible revision history.

`review({anchors,projectId,segments,dimensions,calibration,tolerancePercent,sourceHash})`
returns a detached `{findings,total,checked,status,coverage}`. Segments use `{id,a:[x,y],
b:[x,y]}`. Dimensions preserve original `{id,value,unit,unitStatus}`. The review computes
the straight-line endpoint distance. Wall routes, dimension chains, room perimeters,
door openings and structural clearances require separate models. Only mm/cm/m units are supported, converted using
`calibration.realMillimetres / calibration.drawingUnits`. Mixed/unknown unit expressions
remain unknown; jo/tatami areas are never converted to lengths or square metres.

A result can pass or fail a comparison only when all of these hold: one valid source
dimension and two resolved finite endpoints; positive finite distance/value; supported
unit with `unitStatus:'verified'`; positive finite calibration with `status:'verified'`;
matching source hash; and caller-selected finite `tolerancePercent` in [0,100]. This
status represents declared software inputs, not independent survey verification.
There is no default construction tolerance. Missing tolerance yields unknown; invalid
explicit tolerance rejects. Manual/provisional calibration or inferred units may yield a
numerical comparison for review, always with unknown status and evidence explaining why.

Each finding contains `anchorId`, `code`, `status` (pass/fail/unknown), `severity`,
`affectedIds`, `measured`, `expected`, `unit`, `errorPercent`, and `evidence`. Unavailable
numbers are null. Error percent is signed: `100 * (measured / expected - 1)`; tolerance
uses its absolute value. Evidence preserves source hashes, selected endpoint coordinates,
original declared measurement, calibration status/ratio, explicit tolerance and all
unknown reasons. A stale source can still show a numerical preview, but never pass.

Coverage reports bindings, numerical comparisons, verified comparisons, unknown results,
and unbound dimension IDs. `checked` counts verified comparisons only. No bindings means
overall unknown. A failing verified binding makes overall fail; otherwise any unknown
binding makes overall unknown. Unbound dimensions remain explicitly listed and must not
be represented as checked by a consuming project report. No complete-project, chain,
room, topology, code compliance, structural or as-built claim follows from these checks.

The site must preview the association and numbers, offer cancel/removal, capture a current
project-state token and recheck it before saving. Common reversible project mutations
must mark older consistency reports stale. Provider adapters use this same model and
must not manufacture verified calibration/unit status to make a comparison pass.
