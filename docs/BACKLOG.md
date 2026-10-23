# Development backlog and deployment gates

These requirements were accepted on 2026-10-22, with collaboration and architectural review added on 2026-10-23. They must inform development now and
be reviewed before production deployment. They are planned work, not delivered features.
This document is the canonical requirements backlog; private deployment configuration
and household datasets remain outside this repository. Repository issues, if introduced,
should reference these IDs rather than establish a competing backlog.

## HLS-101 — Complete workflows directly in the site

Status: planned · Priority: required before deployment

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

Status: planned · Priority: design now; required before deployment

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

Status: planned · Priority: design now; required before deployment

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

Status: planned · Priority: core development; required before deployment

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

## Deployment review

Before deployment, review HLS-101 through HLS-106 and record evidence or an explicit
user-approved deferral for every acceptance criterion. Begin with the shared data model,
private storage/authorization design and agent contracts because these requirements
rely on them. This backlog does not authorize a deployment, DNS change or new access grant.
