# Local workflow inventory

This inventory supports HLS-101. It describes current capabilities, not an authenticated
service. Private content remains on the current device until deliberate export/transfer.

| Workflow | Site controls | Boundary |
| --- | --- | --- |
| Start/open project | Reset demo / Import JSON | Export first; project import replaces the current document |
| Preserve/restore | Export JSON / Import JSON | Embedded photos/originals are private; reports, identities and history travel with backup |
| Import plan/reference | Import architectural SVG / Add original PDF or image | SVG replacement clears annotations; original reference alignment is visual |
| Photos/camera views | Add reference photos / Place and aim / numeric view controls | New photos are unplaced; physical position is supplied by the user |
| Architecture | Wall/window coordinate proposal / source editor | Explicit source review; schematic checks; preserve dimensions and locks |
| Furniture/markups | Draw, select, precise Preview changes / Apply changes / Cancel changes | Furniture/boxes can scale and rotate about their center; overlay-only selections can translate as one reviewed group; furniture/box groups can scale or rotate around one common pivot; drawing units; no connected architectural transforms |
| Comments | Pin, review, record completion, reopen | Completion is attributed to a recorded change; adding a comment does not notify an agent |
| Layer management | Layer items, selection, hide/show, lock/unlock, reversible deletion | Locked/protected items cannot be adjusted; parent visibility still applies |
| Source-anchored spans | Measure source spans; explicit dimension/endpoints; preview/save/cancel/remove | Selected endpoints only; user threshold; unknown until source units/calibration are verified |
| Source dimension chains | Review dimension chains; ordered saved span bindings and separate overall total | Single horizontal/vertical chain; explicit existing tolerance; verified inputs required for pass/fail |
| Consistency review | Review consistency, saved runs, rerun, comparisons, highlights | Stale runs cannot highlight; unknown/not-checked coverage is explicit |
| Portable agent work | Review corrections handoff / Review agent correction | Deliberate private file/text transfer; version 1 contract; user reviews before Apply |
| Undo/history | Undo, Redo, View change history | Same-project review evidence retained; history capacity rejects further audit-producing edits atomically |
| Deliverable export | Export SVG / JSON / private consistency report | Exports include private content; they are not publication actions |
| Private asset records | Project assets; edit/link selected items; draft maintenance/issues; review/import/export private asset JSON | Stable identity and field provenance; read-only source metadata, no automatic source access |
| Vault source/attachments | Metadata references only | No browser vault connector, retrieval or write-back; server authorization remains undeployed |
| Login/sharing/invites | Unavailable | No authenticated backend, remote private storage or email service deployed |

## Regression evidence

`npm test` uses fabricated plans for geometry, media metadata, review records, import
validation, asynchronous races, project identity, undo, locks and exact overlay operations.
Manual browser acceptance covers the connected controls and backup round trip. Tests do
not establish physical layout accuracy, structural safety, code compliance or actual
Codex/Claude service integration.

A selected furniture/box overlay also exposes one center-based uniform-scale canvas
handle. Dragging changes only the ghost; release prepares the shared proposal. Apply
commits one reversible revision, while Cancel, Escape or pointer cancellation discards
the gesture. Numeric controls remain available for exact input.

Group uniform scaling supports 2–100 selected furniture/box overlays. The preview shows
every affected item and one common pivot derived from the complete effective rotated
bounds. A percentage changes local sizes and distances from the pivot together. Review
the full selection before Apply; Cancel leaves all originals unchanged. Every member
must be supported, visible, unlocked and current. Arrows, paint, photos, comments and
architectural source are outside this operation.

Group rotation is a relative clockwise delta about the current effective selection
bounds center. Preview/apply/cancel uses the same all-member guards and one history
transaction. Inactive historical angle metadata blocks this operation until individual
reviewed activation; no silent field reinterpretation occurs. Every subsequent proposal
derives a fresh pivot. Use Undo for an exact reversal.

Opening endpoint associations support explicit source opening/two-wall endpoint selection,
three-segment preview, guarded Save/remove, Cancel and Undo. Source changes require explicit
reconfirmation; stale, missing or unsupported geometry remains unknown. Saved checker1.4
findings retain source evidence, and private JSON/manual handoffs retain records. This
workflow never alters source geometry or establishes door hosting, swing or clearance.

The group scaling handle reuses the same reviewed group-scale operation. Its displayed
grip uses effective rotated selection bounds; each drag derives from the original
selection snapshot. Release prepares the proposal, explicit Apply saves one revision,
and cancellation or any invalid member discards the gesture.

## Source-edit impact preview

Open source review or propose a numeric segment edit, then check the draft. The impact panel compares original/draft segments and lists affected explicit opening and measurement references. A changed source retains stale verification until each declaration is explicitly reviewed again. Renumbered or missing segment IDs remain unresolved. Edits to the draft invalidate the preview; check again before assessing impacts. Apply retains existing source-lock, dimension-label and transaction safeguards. This diagnostic preview does not preserve connections by moving neighbors automatically or establish room/hosted-door semantics.

Numeric source edits retain native line identities and attributes, keeping existing
endpoint declarations attached. Choose the segment again if its source or project
state changes. Stored declarations retain their original source hash and still need
explicit reconfirmation after Apply; this does not repair earlier orphaned references.
