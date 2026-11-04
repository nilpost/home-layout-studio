# Deliberately imported source-edit requests

The existing **Review agent correction** file flow can review a standalone native-line
or open-path source-edit request through the same trusted controllers as local editing.
The file is a proposal, not approval. Source changes require explicit Apply after a
human-readable preview; Cancel changes no saved project data.

## Supported standalone namespaces

- `sourceOperationContractVersion:1` with `move-explicit-line-junction` uses the
  [native-line request contract](JUNCTION_REQUEST_DRAFT.md).
- `sourceOperationContractVersion:2` with `move-explicit-open-path-junction` uses the
  [open-path terminal contract](OPEN_PATH_JUNCTIONS.md).

Keep these requests standalone. Do not wrap them in `contractVersion` or mix them with
`operationContractVersion` overlay payloads. Unknown/null/string versions, wrong operations,
mixed discriminators and unknown source fields reject without legacy fallback. Source
requests accept no replacement SVG, resolutions, provider labels, proof or policy override.
Existing documented full-source/overlay formats retain their own validation and limits.

Prepare the request using the original current handoff's project/state/revision/source
bindings. The import path validates and composes that original request before opening
review. It never substitutes current bindings to make a stale agent request work.
Imported review controls are read-only; Cancel and begin a separate local review to make
manual changes. A new preview cannot silently refresh an imported request. Tampered request,
form, proposal or composed draft remains subject to current source and policy checks.

## File-read and approval lifetime

Selecting a new file immediately revokes earlier full-source, overlay, native-line,
path and inline item/group approvals, and aborts supported canvas-handle drafts, even
while its text is still loading or if it later fails validation.
An older Apply cannot write during the read. Review ownership also distinguishes delayed
close events from older dialogs, so they cannot cancel a newer read or reopened review.
Superseded/cancelled read successes and
errors are discarded; the latest deliberate selection or manual review wins. Explicit
Cancel revokes the incoming read/review. Opening a chooser then cancelling without a new
file selection does not constitute a new import.

A valid new item/group numeric preview or eligible canvas-handle gesture also supersedes
an older pending read before retaining its new draft. Rendering, selection, hovering and
panning alone do not count as new reviews. Typed targets are captured before cleanup;
new local reviews remain usable and reversible.

The change is scoped to correction-file reads. Unrelated project/SVG/photo file handling
is unchanged. No new global raw-file cap is imposed that would reject a previously valid
escaped full-source correction simply because its JSON encoding is larger than its SVG.

## Trusted Apply and interoperability boundary

Import does not supply geometry ownership, visibility, locks or permission. Actual current
source/policy is resolved by the existing adapters, rechecked at Apply and committed once
through persistence/history/protection guards. Foreign/stale context, hidden/locked or
unsupported geometry rejects. Failure rolls back; Undo restores the complete committed
edit. Existing source hashes/associations, media, assets, comments and viewport are retained
except the explicitly reviewed geometry/history change. No comments resolve automatically.

SourceJunctions v1, SourcePathJunctions v2, overlay/correction domain formats, old handoff
JSON capabilities and checker/project schemas remain unchanged. Separate-namespace guidance
is added to handoff prose and documentation; the old capability envelope still describes
its own version. This is manual private-file interoperability, not live Codex/Claude
connections, authentication, remote authorization or automatic project access.

Source files and handoffs may contain private project metadata. Keep them out of public
source and served roots. Preserve a fresh complete current private UI export before any
household edit. Fabricated production tests do not establish native chooser/event/XML/
readability, actual private acceptance or physical accuracy.
