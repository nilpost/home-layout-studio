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
| Furniture/markups | Draw, select, precise Preview changes / Apply changes / Cancel changes | Single overlays only; drawing units; no rotation/topology-aware group transforms |
| Comments | Pin, review, record completion, reopen | Completion is attributed to a recorded change; adding a comment does not notify an agent |
| Layer management | Layer items, selection, hide/show, lock/unlock, reversible deletion | Locked/protected items cannot be adjusted; parent visibility still applies |
| Consistency review | Review consistency, saved runs, rerun, comparisons, highlights | Stale runs cannot highlight; unknown/not-checked coverage is explicit |
| Portable agent work | Review corrections handoff / Review agent correction | Deliberate private file/text transfer; version 1 contract; user reviews before Apply |
| Undo/history | Undo, Redo, View change history | Same-project review evidence retained; history capacity rejects further audit-producing edits atomically |
| Deliverable export | Export SVG / JSON / private consistency report | Exports include private content; they are not publication actions |
| Vault-linked assets | Unavailable | No browser filesystem/vault connector or stable asset record model |
| Login/sharing/invites | Unavailable | No authenticated backend, remote private storage or email service deployed |

## Regression evidence

`npm test` uses fabricated plans for geometry, media metadata, review records, import
validation, asynchronous races, project identity, undo, locks and exact overlay operations.
Manual browser acceptance covers the connected controls and backup round trip. Tests do
not establish physical layout accuracy, structural safety, code compliance or actual
Codex/Claude service integration.
