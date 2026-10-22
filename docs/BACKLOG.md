# Development backlog and deployment gates

These requirements were accepted on 2026-10-22. They must inform development now and
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

## Deployment review

Before deployment, review HLS-101 through HLS-104 and record evidence or an explicit
user-approved deferral for every acceptance criterion. Begin with the shared data model,
private storage/authorization design and agent contracts because all four requirements
rely on them. This backlog does not authorize a deployment, DNS change or new access grant.
