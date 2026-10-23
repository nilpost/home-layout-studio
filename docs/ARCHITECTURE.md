# Architecture and data boundaries

## 1. Public frontend

This repository is deliberately generic. The editor owns its anonymous starting canvas, annotation UI and export formats. It contains no actual apartment datasets.

## 2. Private apartment data

Store externally, e.g. local encrypted drive or an authenticated private backend. Authoritative project format: `{schemaVersion,name,revision,baseSvg,viewBox,items,comments,nextId,note}`.

The source PDF, site survey photos, dimensioned fixed-wall SVG, and annotated exports must not be added to this public codebase. One-time transfer to the ChatGPT Project can be done via user-uploaded files, subject to normal ChatGPT project/file limits.

## 3. ChatGPT Project

Create a project privately in your ChatGPT account. Name and project membership are ChatGPT features, not something the public editor can infer from an OpenID token.

Choose Work within that project for repo and architecture tasks. In ChatGPT-hosted apps, `window.openai.sendFollowUpMessage` can submit a follow-up message. Full cross-session synchronization requires an independently deployed backend and supported integration.

## 4. Authentication, future phase

Use Sign in with ChatGPT (OIDC + PKCE), or supported connector OAuth, to map a verified user to a server-side project ID. OpenAI identity scopes do not grant access to chats or Projects. Server-owned data access and ACLs are mandatory. Do not hardcode usernames, emails, addresses, bearer tokens, project IDs, or API keys into frontend bundles.

## 5. Roadmap

- Phase 0 (in archive): generic static frontend, local private import/export, annotation and manual handoff.
- Phase 1 (implemented): schematic linear geometry engine and scale metadata; topology, intersections and rectangular fixture checks with regression tests. Source editing and revision-bound correction imports require explicit review.
- Phase 2: authenticated private object storage, revision history, encrypted backups.
- Phase 3: ChatGPT plugin/MCP integration, explicit user-initiated state handoff; verified project mapping via app-owned authorization.

## 6. Non-goals

No automatic read access to entire ChatGPT conversation backlog, no automatic project detection based solely on ChatGPT login, and no claim of a deployed or installed ChatGPT app.

Host bridge reference: https://developers.openai.com/plugins/reference. Project context: https://learn.chatgpt.com/docs/projects. A bridge function detected in a standalone browser is not evidence of an installed or authorized integration. No MCP server or authentication service is deployed by this repository.

## Development requirements and deployment gates

[docs/BACKLOG.md](BACKLOG.md) is the canonical requirements backlog. HLS-101 through HLS-107 require site-native workflows, private vault-linked assets, an authenticated multi-project portal, Codex/Claude interoperability, email-invited project collaboration, a versioned architectural consistency review and contextual item adjustment controls. Account/project/asset identities, versioned operations and provider-neutral correction contracts must be considered before further feature development. Owner-specific domain settings remain private.

## Original reference layer

Optional `original` metadata contains stable source/preview asset keys, filename/type,
PDF page/pageCount, x/y/w/h/rotation and opacity. `layers.original` controls visibility.
Raster previews sit above the architectural base and below annotations; they never
enter structural checks. The initial page fit is not a measured registration.

Source bytes and rendered page previews use the existing private IndexedDB asset store;
only metadata goes in localStorage. Export includes `dataUrl` and `rasterDataUrl` inside
the original reference. Import validates embedded media and alignment, allocates new
asset keys, and preserves earlier assets for undo. Existing projects without an original
reference remain compatible. Correction handoffs include descriptive reference metadata
only. Visible SVG exports embed the preview, not a live PDF or active SVG.

PDF.js is pinned and bundled under `vendor/pdfjs/`, with Apache-2.0 attribution.
Only same-origin module/worker requests are allowed by CSP; no CDN or external origin
is permitted. PDF data is passed as bytes, not a URL. Scripting/eval, XFA, WASM and
external font/CMap resources are disabled. Image/SVG references are rasterized before
canvas use; SVG is sanitized before rendering. Rendering/import limits are explicit.

Landmark registration uses a least-squares similarity transform (uniform scale,
rotation and translation). Optional registration metadata records paired points,
residual error and the base source hash. It does not deform the reference or rewrite
base geometry. The six-click workflow temporarily isolates source/target views without
persisting those temporary layer overrides; cancellation and undo restore the view.
Whole-page fitting is explicitly separate because PDF margins are not plan landmarks.

Dimension groups can declare `data-dimension-value`, `data-unit` and `data-unit-status`.
The current audit measures the longest dimension-line span and compares it with the
nominal calibrated conversion, using a 1% review threshold. It reports inferred units
and provisional calibration separately. These annotation spans are not yet associated
with wall/room endpoints; HLS-106 requires anchored geometry, full room/door semantics,
project-specific tolerances and saved revision-bound reports. Source paper scale can be
derived conditionally, but is distinct from screen zoom and reconstruction accuracy.

## Item inventory and selection

`objectSettings` maps provider-neutral references (`base:<svg-id>`, `item:<id>`,
`comment:<id>`, `photo:<id>`, `original:reference`) to boolean `hidden`/`locked` flags.
Flags are validated on import and kept in private project metadata. SVG primitives receive
stable IDs in the editable working source; original uploaded files remain unchanged.
Dimension groups are single protected inventory items. Selection/anchor/category-open
state is transient. Hidden items remain in the structural model and checks.

The base stays isolated in an SVG image; a separate transparent hit layer maps pointer
selection to source IDs. The hit layer contains no styles/defs and does not affect export.
A separate highlight layer renders visible selections; range/disjoint selection shares a
pure helper with regression tests. Export removes both layers.

Mutations enforce existing item locks transactionally, including source-element and
ancestor changes. Drag and legacy inspector controls also honor locks. Hiding and lock
changes do not rewrite source geometry; deletion of unlocked base shapes records a source
change and is undoable. Immutable original dimension labels remain protected. Full project
imports replace a document and its settings, rather than treating locks as authorization.

## Comment and markup review handoffs

Comments describe intent; pins, boxes, arrows and paint provide spatial references.
Adding them stores private project state locally; it does not notify an agent or apply
architectural changes. The standalone Review corrections handoff copies revision text
for deliberate transfer. A supported host bridge is conditional, not automatic sync.

For a local agent review, explicitly request review of the current saved project. Export
a fresh private JSON backup through the UI before reloads or edits. For another device,
transfer that backup privately; revision text alone does not carry the full layout or
embedded reference media. Compare requested corrections against the original source,
measurements and current revision, then propose/apply validated reversible operations.

Record the actual changes and affected comments in revision history. Mark a comment
completed only when its requested correction is implemented and checked; retain unclear
or unresolved comments as open. Completed pins are gray. Existing completion history
must survive backup/restore. Site-native review initiation and provider-neutral handoffs
remain governed by HLS-101 and HLS-104; no notification service is deployed.
