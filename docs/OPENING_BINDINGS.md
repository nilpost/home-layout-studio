# Explicit opening endpoint bindings

The isolated `OpeningBindings` domain models a declared opening segment associated
with two explicitly chosen wall endpoints. It does not alter geometry, snap endpoints,
cut walls, attach door leaves or infer hinges/swing/clearance. It is not loaded by the
editor yet; UI, project persistence and saved-report integration remain undelivered.

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

## Required runtime integration

1. Load the domain before app startup and require it before saved-project access/writes.
2. Add an optional legacy-compatible empty project collection; validate nonempty ownership,
   detached import, private backup and explicit manual handoff preservation.
3. Add explicit opening and two wall-endpoint selection, preview/highlight all three,
   stale/context/source guards, reversible Save/remove and cancellation without writes.
4. Preserve bindings through reviewed source edits; changed source hashes require review.
   Guard full-SVG replacement while bindings remain. Undo restores exact records/source.
5. Integrate bounded stable findings and a separate limited endpoint coverage row in saved
   reports. Broader room/door/clearance/survey/regulatory coverage remains unchecked.
6. Run legacy, transactional and browser acceptance before claiming a user-facing feature.

## Checker compatibility gate

A future checker bump must preserve all existing report versions and their exact coverage
matrices. Current anchor support includes versions 1.2 and 1.3; chains begin at 1.3.
Opening-endpoint support must be explicitly version-gated. Merely changing the current
checker version would cause current-version-only chain validation to reject saved 1.3
reports and could block startup. Preserve historical matrix wording/status, bounded
summaries, truncation disclosure and unknown incomplete coverage.

Acceptance must cover legacy absent collections, foreign ownership, malformed/duplicate
records, numerical bounds, reverse/wrong endpoint association, stale/missing/unsupported
source evidence, failed Save/remove rollback, exact Undo/redo, JSON/handoff and every
historical checker import. Use fabricated geometry; preserve real projects before any
upgrade. No software result establishes architectural, physical or regulatory accuracy.
