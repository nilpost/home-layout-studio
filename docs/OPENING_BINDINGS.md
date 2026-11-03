# Explicit opening endpoint bindings

The `OpeningBindings` domain models a declared opening segment associated
with two explicitly chosen wall endpoints. It does not alter geometry, snap endpoints,
cut walls, attach door leaves or infer hinges/swing/clearance. The editor supports explicit authoring, private project persistence and source-bound
saved consistency findings. This is limited schematic endpoint association, not a
complete hosted-door or room model.

## Foundation contract

A record has a stable `id`, `projectId`, `openingSegmentId`, `startJamb` and `endJamb`
(each containing `segmentId` and endpoint `a` or `b`), plus `sourceHashAtCreation`.
Creation takes `sourceHash`; validation returns detached records. An absent collection
is compatible with legacy projects as an empty array. The owner must choose all three
segment references; a single host-wall ID is insufficient for an opening separating
two wall segments.

`evaluate()` receives explicit records, project identity, extracted segments, source
hash and unsupported geometry, returning `findings`, `total`, `checked` and `status`.
Each finding preserves its reasons, numerical violations and detached source evidence;
unknown coverage takes precedence over apparent alignment. A nonempty record set
without enclosing project/source identity cannot pass. Conflict evidence is bounded
with total counts and explicit truncation indicators. `preview()` evaluates one proposed stored record without
mutating the supplied record or geometry. Only unique, supported semantic opening/wall
references can yield numerical schematic alignment results. Missing, ambiguous, stale,
degenerate or unsupported geometry remains unknown. Unsupported extraction can hide a
conflicting wall, so it conservatively prevents a pass. The numerical equality epsilon
is 1e-7 drawing units, a coordinate comparison bound, not a surveyed tolerance or physical proof.

## Runtime behavior

1. The domain loads before app startup and is required before saved-project access/writes.
2. The optional legacy-compatible project collection defaults to empty; nonempty ownership,
   detached import, private backup and explicit manual handoff preservation are validated.
3. Choose an explicit opening and two wall endpoints, preview/highlight all three,
   then Save or remove reversibly. Input/state/source guards reject stale drafts; Cancel writes nothing.
4. Bindings survive reviewed source edits; changed source hashes require explicit reconfirmation.
   Full-SVG replacement is blocked while bindings remain. Undo restores exact records/source.
5. Bounded stable findings and a separate limited endpoint coverage row are saved in
   reports. Broader room/door/clearance/survey/regulatory coverage remains unchecked.
6. Schematic associations may be saved with failed or unknown checks; saving is a reviewed declaration, not a pass or a geometry correction.

## Checker compatibility

Saved validation now uses explicit frozen contracts for existing checker versions
1.0–1.4, independently of the current report-emitter constant. Historical 1.3 output remains unchanged. A future checker bump must preserve all existing report versions and their
exact coverage matrices. Current anchor support includes versions 1.2 and 1.3; chains begin at 1.3.
Opening-endpoint support must be explicitly version-gated. The former current-version-only chain validation has been replaced, with a regression
that simulates a future emitter while importing historical reports. Version 1.4 adds the separate opening-jamb endpoint row and bounded source evidence.
Legacy rows and capability envelopes remain exact; old reports remain importable. Preserve historical matrix wording/status, bounded
summaries, truncation disclosure and unknown incomplete coverage.

Acceptance covers legacy absent collections, foreign ownership, malformed/duplicate
records, numerical bounds, reverse/wrong endpoint association, stale/missing/unsupported
source evidence, failed Save/remove rollback, exact Undo/redo, JSON/handoff and every
historical checker import. Use fabricated geometry; preserve real projects before any
upgrade. No software result establishes architectural, physical or regulatory accuracy.
