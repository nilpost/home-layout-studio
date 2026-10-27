# Development backlog and deployment gates

These requirements were accepted on 2026-10-22, with collaboration and architectural review added on 2026-10-23. They must inform development now and
be reviewed before production deployment. They are planned work, not delivered features.
This document is the canonical requirements backlog; private deployment configuration
and household datasets remain outside this repository. Repository issues, if introduced,
should reference these IDs rather than establish a competing backlog.

## HLS-101 — Complete workflows directly in the site

Status: partial · Priority: required before deployment

Users must be able to carry out the actions and outcomes currently handled in the
companion chat directly in the site. An external chat must not be required to complete
the application's core workflows.

Acceptance criteria:
- Maintain a workflow inventory covering project creation/opening, private file/photo
  import, architectural and furniture editing, annotations, camera views, layer visibility,
  geometry checks, correction requests/review/application, history/undo, asset management
  and private backup/export/restore.
- Provide an in-site instruction/correction interface that works with the current project
  and explicit selected items. Show proposed changes and validation findings before apply.
- Preserve original sources, dimensions, provenance and reversible revisions; reject stale
  changes. Explain unsupported checks and approximate measurements visibly.
- Keep progress, errors, generated outputs and required user decisions inside the site.
- Verify a complete project/correction/backup round trip without relying on a separate chat
  or agent-operated filesystem steps.

Consider during development: keep core operations independent of chat-specific UI and
transport; expose one validated operation model for both site controls and agent adapters.

## HLS-102 — Link private vault knowledge to project assets

Status: partial · Priority: design now; required before deployment

An item in a layout should link to a stable asset record and relevant private knowledge,
for example an appliance's model, manual, maintenance history and unresolved issues.

Acceptance criteria:
- Assign stable asset IDs and associate assets with project/room/layout items, photographs,
  manufacturer/model details, manuals, maintenance schedules/history and issue records.
- Reference authorized vault notes and attachments with source links and provenance;
  distinguish linked source facts from user annotations or unverified inferences.
- Resolve or explain missing, changed and unavailable references. A copied filename alone
  must not be treated as a durable asset identity.
- Decide explicitly which source is authoritative for each field. Start with read-only vault
  references; any write-back must be scoped, reviewable and separately authorized.
- Provide access through an authenticated connector or deliberate private imports. Do not
  assume a deployed browser can read a local vault or upload the entire vault by default.
- Enforce project/user permissions for both metadata and attachments. No private note,
  manual attachment, photo or asset history may enter public source, builds or logs.

Consider during development: introduce stable IDs and source-reference fields before
building appliance-specific screens; keep vault paths and household content private.

## HLS-103 — Authenticated project portal on a dedicated subdomain

Status: planned · Priority: architecture now; required before deployment

Deploy under a dedicated subdomain of the owner's domain, with a login portal for access
to authorized projects. The exact domain and subdomain belong in private deployment
configuration; no hostname has been provisioned by this backlog entry.

Acceptance criteria:
- Select the exact subdomain and hosting arrangement from private requirements before any
  DNS or deployment change. Confirm cost and provisioning decisions at implementation time.
- Provide login/logout, session expiry/revocation and a project list after authentication.
- Enforce authorization server-side on every project, revision, photo, asset and attachment
  request. An obscure URL or a hidden navigation item is not an access control.
- Keep private object storage and backups protected; use HTTPS and server-side secrets.
- Test unauthenticated access, cross-project/user access denial, direct attachment access,
  expired sessions, backup/restore and recovery before deployment acceptance.
- Publish generic application code separately from private runtime data and configuration.

Consider during development: separate account, project, asset and revision identity now;
avoid single-project assumptions that would require a later permission-model rewrite.

## HLS-104 — Codex and Claude interoperability

Status: partial · Priority: design now; required before deployment

Both Codex and Claude must be able to understand the same project state and instructions,
inspect its assets, propose changes and resume work across handoffs.

Acceptance criteria:
- Define versioned, documented provider-neutral project, asset, annotation, photo-reference,
  validation-result and correction formats with stable IDs and revision/source references.
- Provide adapters or documented import/export paths usable by both agents; avoid making
  either provider's conversation history the sole store of application state.
- Supply concise project instructions and a capability/schema description for each agent.
  Keep adapters outside the shared domain model and apply equivalent permissions to both.
- Require the same validation, stale-revision rejection and user review for changes from
  either agent. Treat agent/tool/document content as data, not permission to act.
- Verify a Codex-to-Claude and Claude-to-Codex correction handoff against the same test
  project without losing geometry, comments, photos, asset links or provenance.
- Document setup, authentication and any capability gaps honestly. Do not claim an
  integration is deployed or working until its end-to-end flow has been verified.

Consider during development: keep tool contracts and correction semantics shared, with
explicit capability discovery and project-scoped authorization in each adapter.

## HLS-105 — Invite collaborators by email

Status: planned · Priority: design now; required before deployment
Depends on: HLS-103 authenticated project portal and project authorization.

A project owner can invite another person by email to collaborate on a specific private
project, with access managed directly from the site.

Acceptance criteria:
- Provide a Share / Invite screen: enter an email address, select viewer or editor access,
  review the project and permissions, and send an invitation. Only owners manage sharing.
- Require sign-in and verified ownership of the invited email before accepting an invitation.
  Use expiring, single-use invitations; support pending/accepted/expired/revoked states,
  resending and cancellation without creating duplicate memberships.
- Let owners inspect members, change roles and revoke access. Enforce permissions server-side
  for the project and every plan, photo, original PDF, asset, attachment, revision and export.
  Revocation must prevent subsequent requests and invalidate outstanding attachment links.
- Limit invitations to the selected project. Email messages must not contain private plans,
  photographs, annotations or chat transcripts; recipients see project content only after
  accepting authorized access. Keep recipient addresses and invitation tokens out of public
  code, builds and logs. Sending invitations must be an explicit owner action in the site.
- Attribute edits, comments and resolutions to a collaborator and timestamp in project history.
  Detect concurrent or stale edits and offer conflict review without silently overwriting work;
  preserve reversible revisions. Do not require real-time co-editing for the first release.
- Test owner/editor/viewer permissions, wrong-account acceptance, expired/reused/revoked
  invitations, cross-project access denial, revocation and conflicting edits end to end.

Consider during development: model project membership, roles and invitation lifecycle now;
sharing a project must not grant access to the owner's entire vault or ChatGPT account.

## HLS-106 — Run an architectural consistency review

Status: partial · Priority: core development; required before deployment

Provide a site-native **Review project consistency** run covering measured geometry,
notation and architectural relationships, with a traceable report for a real project.
Existing schematic checks and dimension comparisons provide partial coverage only.

Acceptance criteria:
- Inventory original plans, page/revision provenance, units, printed/derived scale and
  calibration references. Distinguish verified measurements, inferred units and approximate
  geometry; screen zoom and PDF paper size must not be treated as calibrated plan scale.
- Compare dimension chains and totals against anchored wall/opening geometry on both axes,
  across rooms and levels. Detect inconsistent scaling, mixed units, distorted references,
  missing/changed dimension labels and contradictory dimensions. Require project-specific
  tolerances; identify the source spans behind each calibration and finding.
- Check wall junctions, gaps, overlaps, duplicates, crossings, thickness and consistent
  alignment. Model intentional door/window openings so they do not create false gaps.
- Check room boundaries as closed regions, room labels/IDs, areas and adjacency, including
  exterior/terrace boundaries. Distinguish physical enclosure from intentionally open-plan
  zones. Preserve source area units; do not silently convert jo/tatami figures to square metres.
- Check doors against openings, wall/jamb connections, hinge and swing direction, widths,
  collisions and passage clearances; check windows/glazing placement and conflicting solids.
- Review fixed equipment, circulation, access, stairs/level changes and other relevant
  project constraints when sufficient dimensions and semantics are available. Report missing
  inputs and unsupported geometry explicitly instead of marking unknown checks as passed.
- Maintain a coverage matrix separating automated geometry checks, source-notation review,
  survey-dependent verification and professional/code review. Any jurisdictional rule set
  needs its location, edition and authoritative source; geometric consistency alone must not
  be presented as structural safety, regulatory compliance or as-built certification.
- Produce a saved report bound to project revision/source hash, run time and checker version,
  with pass/fail/warning/unknown/not-checked results, severity, affected items, source evidence,
  measured versus expected values and click-through highlights on the plan.
- Let the user rerun review after imports or edits, compare with earlier runs, and include
  unresolved findings in correction handoffs and deployment/export readiness checks.
  Propose fixes for review; never silently reshape walls or overwrite source measurements.
- Test representative valid and invalid plans, intentional openings/open-plan spaces,
  incomplete semantic models, unit/scale conflicts, stale reports and regression cases.

Consider during development: use stable element/room/dimension identities, anchored
measurements, explicit units and provenance now; keep the review engine independent of
agent providers and all actual project evidence private.

## HLS-107 — Adjust selected items with contextual controls

Status: partial · Priority: design during development; review before deployment

Selecting a door, wall or other layout item on the plan or in Layer items opens controls
suited to that item: position, rotation, scale, length and other applicable dimensions.

Acceptance criteria:
- Keep selection and the adjustment panel synchronized between the plan and item list.
  Show only supported controls, with visible handles and precise numeric inputs.
- Support move and rotation with a clear pivot; uniform scaling where appropriate;
  wall length/thickness, door width/swing/hinge and object width/depth as applicable.
  Use project units and distinguish calibrated values from provisional measurements.
- Preserve connected wall junctions and door/window relationships to their host openings;
  preview affected neighbors and report conflicts before applying changes. Do not distort
  architectural items with arbitrary nonuniform scaling or silently rewrite source labels.
- Respect hidden/locked items and protected dimensions. Explain unsupported or conflicting
  edits; preserve original uploads and offer explicit review of affected measurements.
- Make changes reversible with cancel, undo/redo and revision-linked history; rerun relevant
  HLS-106 consistency checks after applying edits and mark older reports stale.
- For multiple selected items, distinguish group transforms from individual dimensions,
  make the pivot and affected items explicit and prevent partial edits of locked selections.
- Use the same validated editing operations for site controls and HLS-104 agent corrections;
  test connected walls, hosted doors, unit conversion, locks, cancellation and undo.

Consider during development: model editable geometry and relationships by stable item ID;
keep transform previews separate from committed geometry and source measurements.

## Deployment review

Before deployment, review HLS-101 through HLS-107 and record evidence or an explicit
user-approved deferral for every acceptance criterion. Begin with the shared data model,
private storage/authorization design and agent contracts because these requirements
rely on them. This backlog does not authorize a deployment, DNS change or new access grant.

## Verified development progress — 2026-10-24, v0.9.0

These are partial deliveries, not acceptance of every criterion or permission to deploy.

| Requirement | Implemented slice | Remaining gate |
| --- | --- | --- |
| HLS-101 | [Workflow inventory](WORKFLOWS.md), source review, private backups, saved checks and overlay preview/apply/cancel | Site-native instruction execution, asset management and complete workflow acceptance |
| HLS-102 | Stable project/source/item identities retained | Asset entity, read-only authorized vault references, field provenance and attachment access |
| HLS-103 | Local project identity and state isolation | Owner-selected hosting/login/storage, server authorization and denial/recovery tests |
| HLS-104 | [Version 1 manual correction contract](AGENT_CONTRACT.md), common parser and reviewed apply path; fabricated Codex/Claude equivalence | Live authenticated adapters, complete asset format and reciprocal live-provider verification |
| HLS-105 | Dependency boundaries documented | Authenticated portal, invitation lifecycle, verified email, roles and revocation |
| HLS-106 | Saved checker-version/revision/source/state-bound runs, coverage matrix, comparison, stale highlights, private backup/report export | Anchored dimensions, project tolerances, room/door relationships, source/survey/professional review |
| HLS-107 | Exact numeric single-overlay preview/apply/cancel; lock/visibility/state guards; reversible history and rerun checks | Architectural relationships, connected neighbors, rotation, handles, group transforms and physical-unit editing |

Integrity repairs cover asynchronous export snapshots, concurrent import rejection,
undo-branch correction identity, stylesheet/root lock dependencies, semantic dimension
labels and atomic history capacity rejection. Audit history is not silently pruned:
at the 2,000-record schema boundary, a transaction requiring another record is rejected
without persisting an unreadable project. A full-history archive/continuation workflow
remains future work. Saved consistency runs retain the latest 50 across same-project
undo/redo; backups contain the retained evidence. Standalone report export wraps the
versioned `report` with `staleAtExport` metadata.


## Verified development progress — 2026-10-24, v0.10.0

HLS-102 now has a local private asset manager with stable project-bound records,
selected-item links, manufacturer/model/room/notes, per-field authority, read-only
source revision/hash/status references, and imported maintenance/issues. Deliberate
asset JSON import previews orphan/stale/unverified findings before Apply; edits,
deletions and imports share undoable history. Private project backup/restore and
manual provider handoffs preserve asset identities and evidence. See
[asset schema and import boundary](ASSET_RECORDS.md). No vault/remote connector or
attachment retrieval has been deployed. Maintenance/issue authoring beyond imported
records remains future UI work; server permissions remain mandatory before hosting.

HLS-106 excludes semantic shapes and dimension spans whose stylesheet, root, ancestor
or nested viewport changes require unsupported coordinate mapping. The source evidence
is visible. Stylesheet coverage is interpreted once per extraction. Large valid review
outputs are bounded with an explicit incomplete/unknown disclosure rather than aborting
or claiming complete coverage. Checker 1.1 imports prior 1.0 records.

Full SVG replacement keeps the annotation ID counter, preventing orphan links from
reattaching to unrelated new objects. If an asset still links any architectural base
item, full SVG replacement is rejected until those links are explicitly removed (or a
reviewed same-source edit is used). This conservative boundary avoids guessing whether
similarly named IDs in a different plan represent the same object. All other deployment
gates and incomplete architectural relationships above still apply.


Version 0.10.1 adds executable quota-failure regressions and explicit storage-write
acceptance for transactional edits, imports, history navigation, drags, migration/reset
and review recording. Display refresh failures after persistence retain committed state.
This strengthens HLS-101 backup/persistence integrity without claiming remote storage
or eliminating browser quota limits.


## Verified development progress — 2026-10-24, v0.11.0

HLS-106 now supports explicit source-dimension bindings to stable segment endpoints,
measured/declared comparison, a user-chosen project tolerance, readable preview,
reviewed save/cancel and reversible removal. Source hash changes invalidate verification
until the binding is explicitly reviewed again. Missing/duplicate geometry, absent
tolerance, unsupported units and provisional calibration remain unknown. Source facts
are not marked verified by this UI. Checks can pass/fail only from verified input metadata
and an explicit tolerance; numerical previews may still be shown provisionally.

Bindings, tolerance and evidence travel in private backups/provider handoffs. Full SVG
replacement refuses active bindings to avoid accidentally reusing endpoint identities.
Checker 1.2 reports selected-endpoint coverage separately, keeps unbound dimensions
unknown, and retains checker1.0/1.1 reports. [Binding format](MEASUREMENT_ANCHORS.md).
This is a partial endpoint-span delivery; chains/totals, axes/levels, rooms, hosted doors,
physical calibration, source tracing and professional/regulatory review remain open.


## Verified development progress — 2026-10-24, v0.12.0

HLS-106 adds explicitly selected single-axis dimension-chain totals: 2–8 ordered endpoint
bindings and a separate total, contiguous and monotonic on one horizontal/vertical axis.
Declared values are compared after metric conversion using the explicit project threshold.
Preview/save/cancel/remove, undo and private backup/manual handoff are supported. Missing,
stale, ambiguous, noncollinear or provisional inputs remain unknown; source labels and
geometry are unchanged. Broader multi-axis/level, rooms and hosted door relationships,
source verification and survey/professional review remain open. [Chain model](MEASUREMENT_CHAINS.md).


## Verified development progress — 2026-10-24, v0.13.0

HLS-102 now supports site-native authoring of local maintenance schedules/history and
open/resolved issues, with explicit draft/save/cancel, stable activity IDs and reversible
asset revisions. Field provenance and read-only source records are preserved. Dates
are user-entered metadata; no reminder delivery, source write-back or physical verification
is implied. Remote source/attachment connectors and authenticated permissions remain
undeployed gates. [Activity workflow](ASSET_RECORDS.md#local-maintenance-and-issues).

Version0.13.1 makes HLS-102 field attribution, read-only source evidence and unresolved
reference findings readable inside the asset form. It changes presentation only; no source
fetch, verification status change or remote permission is introduced.


## Verified development progress — 2026-10-24, v0.14.0

HLS-107 adds uniform scaling for one furniture or box overlay about its center. An
explicit percentage, visible pivot and ghost preview use the same guarded apply/cancel
and reversible history as precise numeric edits. Item identity, labels, linked assets and
other metadata remain unchanged. Inputs are drawing units, with no physical accuracy
claim. Architecture, arrows/paint, multiple selections, rotation and connected topology
remain outside this scale control. Hidden/locked/stale proposals cannot apply.

Startup now blocks editing before loading or writing a project if required editor
components fail to load, or saved metadata fails validation. It preserves existing
storage instead of falling through to a writable demonstration project. Reload to retry;
no automatic reset or recovery overwrite is performed.


## Verified development progress — 2026-10-24, v0.15.0

HLS-107 adds numeric translation of 2–100 selected overlays as one reviewed group.
Furniture/boxes move by their origins, arrows move both endpoints, and paint moves its
origin while retaining stroke points. Every selected item must remain present, visible
and unlocked. Mixed architectural/comment/photo selections reject the entire operation.
Preview shows all affected overlays, Apply creates one reversible history entry, and
Cancel makes no change. Selection membership and project/item identity are rechecked
before committing. Rotation, group scaling and connected architectural edits remain open.

Rotation preparation now includes an isolated, tested rectangle-corner and bounding-box
module. It is not loaded by the editor and does not enable rotation or add a persisted
angle field. [Integration and compatibility checklist](OVERLAY_ROTATION.md) records the
remaining domain, rendering, selection, export and acceptance work. HLS-107 rotation
remains undelivered.


## Verified development progress — 2026-10-24, v0.16.0

HLS-107 adds an explicit center-pivot angle for one furniture or box overlay, including
reviewed preview/apply/cancel, reversible history and persisted JSON/handoff metadata.
Shape, label, selection and preview transforms agree; SVG export retains the rendered
rotation. Rotated corners support bounds findings and guarded move/scale/group operations.
Only an explicit rotationVersion:1 marker activates the finite angle; unmarked legacy
rotation metadata remains inert and unchanged. Invalid active angles and unsupported
active item types reject.
No source architecture, group rotation or connected wall/door behavior is inferred.


## Verified development progress — 2026-10-24, v0.17.0

HLS-107 adds a canvas handle for centered uniform scaling of one furniture/box overlay,
reusing the guarded scale proposal and explicit Apply transaction. Dragging is preview-only;
pointer cancellation discards the gesture. Rotation and aspect ratio remain unchanged.
Group handles, group rotation/scaling and connected architecture remain open.
Acceptance covered rotated/zoomed pointer mapping, cancellation, stale/locked/hidden
rejection, invalid-bound protection, secondary-pointer isolation and one reversible commit.


## Verified development progress — 2026-10-25, v0.18.0

HLS-107 adds reviewed group uniform scaling for 2–100 furniture/box overlays around
a shared center derived from complete effective rotated bounds. The operation scales
local dimensions and relative centers together, preserving angle, proportions, labels
and source/asset metadata. Every member is checked before the whole selection can apply.
Preview and Cancel do not change saved geometry; Apply is one reversible transaction.
Arrows/paint, group rotation/handles and connected architecture remain outside this slice.


## Verified development progress — 2026-10-25, v0.19.0

HLS-107 adds reviewed relative group rotation for 2–100 furniture/box overlays about
the current effective rotated-bounds center. Item centers rotate around the common
pivot and active angles add the delta; local dimensions and proportions remain intact.
Inactive historical rotation fields require individual reviewed activation before a
group operation. Apply validates the complete selection and records one undoable change.
Arrows/paint, group handles and connected architecture remain outside this slice.


## Architectural foundation — 2026-10-25

HLS-106 preparation adds an isolated opening-to-wall-endpoint declaration validator
and conservative numerical checks for explicit endpoint alignment and conflicting wall
spans. It does not infer a host wall, snap/cut geometry or interpret door swing.
[Integration and checker compatibility gates](OPENING_BINDINGS.md) remain required.
The module is not loaded by the editor; no new project field, UI or saved-report
capability is delivered in this foundation slice. HLS-106 remains partial.


## Checker compatibility prerequisite — 2026-10-25

Saved checker1.0–1.3 reports now use explicit frozen capability and exact coverage
contracts, independent of the current emitter version. Existing1.3 output is unchanged.
Historical import, tampered coverage and simulated future-emitter regressions protect
legacy anchors/chains before opening-endpoint integration. No1.4 capability, opening
editor, project field or checker output expansion is delivered in this slice.


## Runtime opening associations — 2026-10-25, v0.20.0

HLS-106 adds explicit source opening-to-two-wall-endpoint authoring, all-three preview,
guarded Save/remove/Cancel, private JSON/manual handoff and reversible history. Source
changes leave records stale until explicit reconfirmation; missing/unsupported evidence
stays unknown. Saved checker1.4 reports add bounded source evidence and a separate
limited endpoint coverage row while retaining exact1.0–1.3 import compatibility.
The operation changes declarations only; geometry/labels remain unchanged. Rooms,
hosted doors/swings/clearance, physical survey and connected editing remain unmodeled.


## Group scaling handle — 2026-10-25, v0.21.0

HLS-107 adds a canvas handle for 2–100 eligible furniture/box overlays. It previews
uniform scale around the shared pivot from the original selection snapshot and uses
the existing explicit Apply/Cancel transaction. Whole-selection eligibility, pointer
identity, cancellation, stale context, numeric bounds and pending-input guards apply.
No new schema/domain operation or connected architectural editing is introduced.


## Source-edit impact preview — 2026-10-25, v0.22.0

HLS-107 adds diagnostic before/draft geometry and explicitly linked measurement/opening
impact review in the existing source editor. Saved source references are not rewritten;
missing or renumbered references remain unresolved and changed-source evidence stays
stale. Draft changes invalidate the preview. Existing source locks, protected labels,
reviewed Apply/Cancel and reversible history remain in force. Automatic connected
neighbor movement and broader architectural semantics are still incomplete.


## Stable native line edits — 2026-10-25, v0.22.1

Numeric edits of native source lines retain their SVG element, stable segment ID,
attributes and explicit measurement/opening references. Selection is bound to the
current project, state and source; missing or ambiguous selections reject. Existing
source review and reversible Apply protections remain. Saved source hashes still
become stale and require explicit reconfirmation; no historical orphan is remapped
and no neighbor is moved automatically. Nonlinear/multipart editing is unchanged.


## Native polyline vertex edits — 2026-10-26, v0.23.0

Numeric segment edits on native source polylines retain their element, point count,
segment identities and attributes. Editing an endpoint updates its shared vertex,
so adjacent segments stay connected and appear in source impact review. Explicit
measurement/opening references stay attached with stale verification after source
changes. Preview/Cancel do not save; Apply remains guarded and reversible. This
does not infer connections between separate shapes or alter general path/polygon
editing. Broader architectural editing remains partial.


## Native polygon vertex edits — 2026-10-26, v0.24.0

Numeric native-polygon edge edits preserve point count, attributes, edge identities
and implicit closure, including edits to the final edge between last and first vertices.
Changed adjacent edges appear in source impact review; saved measurement/opening
references remain attached but stale. Repeated closing vertices and consecutive
duplicates reject before and after edits; no normalization, merging or reordering
occurs. Ambiguous owner IDs reject. Existing reviewed Apply/Cancel/Undo remains.
This does not establish room boundaries, infer separate-shape connections or verify
physical geometry. HLS-107 remains partial.


## Absolute linear path edits — 2026-10-26, v0.25.0

Numeric edits of supported native paths preserve syntactic shared vertices, independent
subpaths, closing edges and globally ordered edge identities. Supported commands are
absolute M/L/H/V/Z; the editor fully validates the command stream and proves its model
against extracted endpoints before changing a vertex. Supported paths serialize as
M/L/Z with the same edge order/count and native attributes. Relative commands, curves,
unmatched text, degenerate edges and ambiguous owners reject rather than using the
previous disconnected-segment fallback. Saved references remain attached but stale.
This is a bounded editing subset; general path and cross-shape topology remain open.


## Legacy path input integrity — 2026-10-27, v0.25.1

The schematic path extractor now consumes its input lexically instead of skipping
unmatched prefix, interior or suffix characters. Malformed source paths become
unsupported evidence through existing review coverage. Valid absolute and relative
linear commands retain coordinates, ordering and zero-based identities. Saved
historical reports remain importable and are not rewritten. This fixes path-input
integrity; broader architectural and physical verification remains incomplete.

Checker1.4.1 identifies the corrected engine; saved1.0–1.4.0 reports retain their
exact import contracts and history but require rerun for current checks even when
source/state are unchanged. Saved-review UI and exported freshness reflect that
distinction. Nonempty extracted paths also require an initial M/m; this is a bounded
lexer/initial-command fix, not a claim of full SVG grammar validation.
