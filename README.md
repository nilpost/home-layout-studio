# Home Layout Studio

A local-first SVG floor-plan editor with annotation, comment pins, furniture placeholders, revision export and a ChatGPT handoff.

**This is the public, generic application. It does not contain any real residential floor plan, photograph, address, private project identifier, or conversation history.**

## Quick start

Open `index.html` in a browser. There is no build step, backend, account requirement, API key, dependency installation, or network request in the public standalone editor.

The initial plan is anonymous demonstration geometry. Use **Import architectural SVG** or **Import JSON** to load your private project **on your own device**.

## Features

- Editable architectural SVG with reviewed revisions and separate overlay layers
- Furniture placeholders: create, drag, resize through numerical inspector, label, delete
- Markup arrows and highlighted rectangles
- Numbered location comments
- Zoom, undo/redo, project name, revision counter
- Export SVG for review and a JSON project to preserve state
- Browser-local autosaving
- **Review corrections handoff**: previews exact payload before copying or sending through a supported ChatGPT host bridge; optional source inclusion
- Schematic geometry checks for semantic linear walls: open ends, duplicate spans, crossings, window/opening joins and fixture intersections; explicit scale calibration. Unsupported geometry is reported.

## Deployment

Static site: can be served through GitHub Pages or any static host. No private project data should ever be checked into this public repository.

For local development, `python3 -m http.server 8080` then open `http://localhost:8080`. The file can also be opened directly.

## Private workspace architecture

```text
ChatGPT Project (private): human instructions, chats, project context
           | explicitly requested handoff
           v
Generic editor (public source) <----> user-imported SVG/JSON (private device)
           | planned future integration
           v
Authenticated private application backend (NOT implemented)
```

Sign in with ChatGPT identifies a user, but does not provide automatic access to their chats or ChatGPT Projects. Production-grade persistence/sync requires authenticated private storage and a separately configured ChatGPT plugin/MCP server. None is included in this version.

## Security and privacy

Read [SECURITY.md](SECURITY.md). `localStorage` is used for convenience only and is **not encrypted**, backup-grade storage, or safe on shared/public devices. Export your own private JSON backup. Git history and GitHub Pages are public. If data is accidentally committed, deleting it in a subsequent commit does not remove it from history.

## File structure

- `index.html` — editor shell
- `src/styles.css` — UI
- `src/app.js` — editor, drawing, import/export, review flow
- `docs/ARCHITECTURE.md` — integration boundaries and planned workflow
- `tests/static-check.mjs` — privacy checks for tracked source

## Version

Prototype 0.2.0. Public application starter; not deployed or linked to an authenticated ChatGPT project.

## Architectural corrections

Choose a wall/window segment, edit its start/end coordinates and select **Review coordinate change**, or use **Edit architectural SVG** to revise the fixed source, check the proposal and apply it as an undoable revision. Original dimension labels in `#dimensions` or `.dtext` must be retained. SVG is rendered as a passive image and sanitized on every import/revision.

Walls use `class="wall"` or `class="partition"`; windows use `class="glass"`; door **opening spans** use `data-kind="opening"`. Door leaf/swing artwork is not an opening span. Rectangular fixed fixtures use `class="fixed"`, `class="kitchen"` or `data-kind="fixture"`. Supported geometry: linear M/L/H/V/Z paths, lines, polylines, polygons and rectangles. Curves and transformed semantic elements are reported as unsupported. Checks use a 0.01 SVG-unit tolerance; an open end can be intentional. The engine checks the supplied semantic elements, not every visible feature. Door-swing and wall-thickness clearance need further modeling.

Record one verified source span in SVG units and its measured length in millimetres. Scale is metadata; recording it does not move walls or prove the plan is accurate.

For a correction round trip, review/copy the handoff into a private ChatGPT chat and attach the private JSON export, or opt in to including the source. Ask for `{baseRevision,baseSourceHash,newBaseSvg}` as JSON. **Review ChatGPT correction** rejects a stale revision/source and opens the candidate for checking before application. The source hash is a change detector, not a cryptographic authentication guarantee. No incoming correction is automatically applied.

## Verify before publishing

Run `npm test`. Set `SENSITIVE_MARKERS` to comma-separated household names, addresses and project identifiers in your private shell when running the checks; never commit that marker list. `tests/history-privacy.mjs` scans reachable history and tracked working files, including old versions. Human review is still required for factual provenance of demo geometry and novel sensitive data. CI checks run after a push, so use the local pre-push hook too: `git config core.hooksPath .githooks`.

The development server must serve this repository folder only. Private resources must be kept outside it. The app has no analytics or application network requests; static hosting still receives ordinary page requests. There is no automatic private backend, ChatGPT login or Project API connection.

## Private photo references

Use **Add reference photos** to import JPEG, PNG or WebP images from your device. Images are resized to a maximum 1600 pixels, re-encoded as JPEG to strip file metadata, and stored in browser IndexedDB. Original files are untouched. Camera points start unassigned; no location or direction is inferred from the image.

Select a thumbnail, choose **Place / aim on plan**, then drag from the camera location towards the view. In Select mode, drag the purple point to move it, or its direction handle to rotate it. Set camera coordinates, direction (clockwise from plan-right), view width and view reach, then use **Apply view changes**. View cones are visual references in SVG units; they are not calibrated optical camera models. **Unplace** preserves the image; **Remove photo** removes its reference and can be undone in the current session.

The Layers controls independently show/hide photo references, comments, furniture, markups and the architectural base. Expand **Architectural layers** for individual imported SVG groups, including initially hidden review archives. Visibility is saved without altering the source master or its geometry checks. On narrow screens, switch between **Photos & comments** and **Tools & layers** while the plan stays visible above.

**Export JSON** includes embedded private photo copies and all camera/layer settings. Importing that backup restores images on another browser/device; a metadata-only copy without image data is rejected. Import accepts up to 80 MB and 200 photos. Export fails visibly if any image is missing. LocalStorage stores lightweight project metadata; IndexedDB stores photos. Neither is encrypted or a substitute for a private exported backup. Use a dedicated origin and retain original photographs separately. Private images and placement data never belong in this repository, screenshots, test fixtures or public issues.

Correction handoffs include photo-reference metadata, not image bytes. Review the payload before copying/sending; attach selected images privately only when needed.

## Development requirements

See [the backlog and deployment gates](docs/BACKLOG.md) for site-native workflows, private vault-linked asset management, an authenticated project portal and Codex/Claude interoperability. These are planned requirements that must inform development; they are not implemented integrations.

## Comment review and change history

Cancel closes a new-comment dialog immediately, including when the required text is empty. Save still requires text. Cancelled drafts create no comment, revision or change record.

Comments are **Open** (orange) or **Completed** (gray). Use the All/Open/Completed filter to show the review work you need. Completed comments remain in the project and can be reopened; prior resolutions remain in history.

When reviewing an architectural source revision, select the comments it addresses and enter a change summary. Applying the proposal links those comments to the resulting project revision and records the changed element IDs with before/after SVG. Completion is atomic with the source edit and participates in undo/redo. For work already performed or non-architectural changes, open a comment's Review button and record a resolution note. Such manual records are explicitly distinguished from architectural diffs.

**View change history** shows chronological change summaries, linked comments, timestamps and affected source elements. History and resolutions are included in private project JSON and survive export/import. Historical baselines should be imported with provenance; do not automatically mark old comments complete just because of their age or number. A completed comment means its documented drawing/task change is recorded, not that physical measurements are certified. Note approximate geometry and pending physical verification in its resolution.

Correction JSON may include `resolvedCommentIds` and `changeSummary` alongside `baseRevision`, `baseSourceHash` and `newBaseSvg`; these preselect a review proposal and never bypass review. Handoff previews include history metadata; before/after source fragments are included only when source inclusion is selected.

Freehand painting: choose **Paint**, pick a preset or custom color and brush width, then drag on the plan. Strokes belong to **Markups**; use Select to move/delete them and Undo/Redo to revise. Colors also apply to new arrows and rectangles. Paint points and brush settings travel in private JSON exports; visible strokes appear in SVG exports.

Original-plan comparison: **Add original PDF / image** loads a local PDF, SVG, PNG,
JPEG or WebP as a separate reference. Toggle **Original overlay**, adjust **Opacity**,
and use **Align original** to drag it. **Original plan alignment** supplies position,
aspect-preserving size, rotation, page selection, and download of the unchanged original.
Hide **Architectural base** and set opacity to 100% to inspect the original alone.
Alignment initially fits the page to the canvas; adjust it against shared landmarks
before comparing positions. Reference alignment never changes measured layout geometry.

PDF rendering uses bundled PDF.js, entirely in-browser, with no CDN. Serve the editor
on loopback to use PDF imports (module workers require HTTP); image/SVG references do
not need the PDF renderer. Files up to 20 MB and PDFs up to 1000 pages are accepted;
rendered pages are limited to 3000 pixels on their longest edge. Optional PDF font/CMap
and image-codec packs are not bundled, so unusual PDFs may be incomplete or fail to
render. Keep the original and inspect it independently if anything is missing.

Original files and rendered previews stay in private browser IndexedDB. Private JSON
backups include both, plus page/alignment/opacity/visibility. SVG exports include the
visible raster reference; correction handoffs include reference metadata only, without
automatically sending the PDF or preview. Removing a reference is reversible with Undo.

For accurate superposition, use **Match 3 landmarks** in Original plan alignment.
Click a corner on the original, then the same corner on the editable base; repeat for
three widely spaced corners. The editor alternates the two views, fits one uniform
scale/rotation/translation, and reports residual error. It preserves proportions and
never changes the architectural base. Cancel or Undo restores the previous alignment.
Whole-page fit includes paper margins and is only a starting view, not registration.
Use **Hide original / Show original** above the plan, or **Original plan / PDF** under
Layers; both controls share the same saved visibility setting.

Scale readouts show millimetres per drawing unit and calibration status. Semantic
dimension groups are compared against the nominal conversion; inferred units and
provisional calibration stay flagged. The initial comparison measures annotation spans,
not full architectural constraints. HLS-106 in the canonical backlog defines the broader
architectural consistency run, including anchored measurements, room enclosure and doors.

**Layers → Layer items** lists individual walls, windows, doors, fixtures, dimensions,
labels/source shapes, furniture, boxes, arrows, paint, comments, photos and the original
reference. Expand a category or search. Click a name for one item, Shift-click a range,
or Command/Ctrl-click (or use checkboxes) for separate selections. Shift+Up/Down also
extends a range. Clicking an object on the plan opens its category and highlights its row;
spatial Shift/Command/Ctrl-click toggles separate map items. List selection highlights the
visible objects on the plan.

Use row actions or the selection toolbar to Show/Hide, Lock/Unlock or Delete. Parent
layer visibility still applies. Locks prevent movement, property edits, source revisions
that alter locked shapes, and deletion; visibility remains adjustable. Source dimension
labels are protected from deletion. Deletion and setting changes support Undo/Redo and
change history. Locks are editing guards, not account/project access permissions.

Private JSON exports preserve per-item visibility/locks and stable source object IDs.
Existing source shapes without IDs receive identities once, without moving geometry;
that migration is recorded. Selection highlights and invisible hit targets are excluded
from SVG exports. Correction authors should preserve all unmodified element IDs.


## Version 0.9.0

Saved consistency reviews now retain findings and coverage, compare runs and identify
stale state. Private backups preserve the latest 50 runs. Furniture and markups support
exact numeric Preview / Apply / Cancel controls, with reversible history and fresh checks.
Manual correction files use a [provider-neutral contract](docs/AGENT_CONTRACT.md) bound
to project/state identity, preventing same-revision undo branches from accepting stale
changes. Older correction files require a fresh handoff; old project backups remain
supported. Export/import concurrency and source-lock integrity have regression coverage.
See [workflow inventory](docs/WORKFLOWS.md) and the [canonical backlog](docs/BACKLOG.md)
for partial deliveries and deployment gates. No authenticated service is deployed.


## Version 0.10.0

Project assets now stores private records linked to selected layout items, with
manufacturer/model notes, field provenance and read-only knowledge-source references.
Import private asset JSON through a findings preview; edits/deletions/imports support
undo and full project backups retain the records. No source is fetched automatically.
See [asset format](docs/ASSET_RECORDS.md) for deliberate imports, maintenance/issues,
foreign-project rejection and current limits.

Consistency review now explains unsupported CSS/coordinate contexts and handles large
finding sets with explicit incomplete coverage. Existing plans and checker records remain
compatible. All authenticated hosting, connector and collaboration gates remain open.
