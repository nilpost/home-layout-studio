# Local private asset records

This HLS-102 increment stores deliberate private metadata in the current project. It
does not read a vault, fetch a manual, upload an attachment, authenticate users, synchronize
devices or write back to source notes. Project identity checks are local integrity
checks; server authorization and private remote storage remain deployment gates.

Each record has a stable `id`, its parent `projectId`, required `name`, optional `room`,
`manufacturer`, `model`, `notes`, and `linkedRefs`. Layout references use `base:<id>`,
`item:<id>`, `comment:<id>`, `photo:<id>` or `original:reference`. A filename is a label,
not an asset identity. Imports preserve IDs. Missing linked items produce findings and
retain their references, so deleting an item does not silently destroy asset history.

The `provenance` map covers each text field with `authority` of `user`,
`imported-source` or `unverified`, plus optional `sourceId`. An imported-source field
must identify an existing source. Missing provenance normalizes to unverified; importing
a string never establishes its truth. User-created form records default to user authority.
Editing a field deliberately should mark that field user-authored while retaining other
fields' provenance and source records. An authoritative source does not certify accuracy.

`sources` are read-only references: `id`, `label`, `kind` (`vault-note`, `manual`, `other`),
`uri`, optional `revision`/`contentHash`, `status`, and optional `importedAt` timestamp.
Status is `unverified`, `available-at-import`, `unavailable` or `changed`.
`available-at-import` requires its import time and means historical evidence only.
The module never changes statuses or invents content hashes from filenames. Sources
reported changed/unavailable retain evidence and produce findings for owner review.

References must use credential-free HTTPS, or for vault notes
`obsidian://open?vault=Example&file=Synthetic%20Note`. The latter remains sensitive
private metadata. File, HTTP, script/data URLs and bare paths/filenames are rejected.
Reference strings must be displayed as plain text in this increment; they are not links
to fetch, open or embed automatically. No source content is included in public code.

Optional `maintenance` entries contain stable `id`, `kind` (`schedule` or `history`),
`text` and optional ISO `date`. Optional `issues` contain stable `id`, `text`,
`status` (`open` or `resolved`) and optional ISO UTC `recordedAt`. These are user records,
not automatic reminders or verified service events. Empty collections are valid.

## Deliberate import preview

```json
{
  "assetSchemaVersion": 1,
  "projectId": "synthetic-project",
  "assets": [{
    "id": "synthetic-appliance",
    "projectId": "synthetic-project",
    "name": "Synthetic appliance",
    "linkedRefs": ["item:synthetic-footprint"],
    "model": "Example model",
    "provenance": {"model": {"authority": "imported-source", "sourceId": "synthetic-manual"}},
    "sources": [{"id": "synthetic-manual", "label": "Example manual", "kind": "manual", "uri": "https://example.invalid/manual", "status": "unverified"}]
  }]
}
```

Call `AssetRecords.stageImport(payload,{projectId,existingAssets,knownRefs,now})` to
validate and preview. It returns `{assets,findings}` without changing either input.
Imports append only: foreign projects and duplicate/existing asset IDs reject the whole
batch. The UI must show findings and request explicit apply through its existing revision
guard and reversible mutation flow; cancel discards the proposal. Recheck the current
revision/state before apply. `now` is optional preview metadata validation; it does not
convert unverified sources into available sources or rewrite recorded evidence.

`AssetRecords.validate(assets,{projectId,knownRefs})` returns detached normalized records.
Absent assets normalize to `[]` for older backups. Orphan links remain valid; use
`AssetRecords.findings(assets,{knownRefs})` to display them. `createRecord(input)` uses
caller-supplied stable asset/project IDs and defaults field authority to user.
`updateRecord(current,patch)` accepts only the text fields and `linkedRefs`, preserves
IDs/sources/history/issues, and marks changed text fields user-authored while retaining
unchanged provenance. `inspectReferences` is an alias for `findings`. These APIs do not
apply edits or bypass the editor's project-state guard.

Limits: 1,000 records; 1,000 item links, 100 sources and 200 entries per maintenance/issue
collection per record; name/room 160 characters, manufacturer/model 240, notes 6,000,
entry text 2,000, source URI 2,000. Unknown fields reject instead of being silently lost.
Private backups and correction handoffs must preserve the full normalized metadata.

## Local maintenance and issues

The asset form supports owner-entered maintenance schedules/history with an optional
calendar date, plus open/resolved issues. Add, remove, resolve and reopen operate on
a draft; **Save asset** commits the full record with reversible project history.
**Cancel draft** restores the saved record. Activity changes do not replace unsaved
name/model/notes fields. The visible draft status reminds users to save.

`AssetRecords.updateActivity(current,{maintenance,issues})` validates detached activity
collections and preserves source references, stable asset identity, text fields and
field authority. Editing activities does not verify imported source facts, complete a
real maintenance job, set reminders, fetch links or write back to any source. Existing
per-collection bounds and date/status validation apply. Private backup, asset export
and manual handoff retain saved activity entries; undo restores prior records.

The evidence panel uses plain human-readable text for field authority, source identity,
URI, revision/hash, recorded availability time and reference findings. Source links are
not activated or fetched. Historical availability at import remains distinct from live
verification; unavailable and changed references retain their recorded evidence.
