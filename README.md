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
