# Security policy — public repository

This codebase is public. Do **not** commit or upload personal residence plans, imagery, account information, chat exports, annotations, location data, credentials, or comments from a private home project.

## Protection strategy

1. All public code is generic and uses a fabricated demonstration layout.
2. The `private/`, `data/`, `user-data/`, `backups/`, `photos/`, `*.pdf`, `*.jpg`, `*.jpeg`, `*.png`, `*.svg`, and `*.json` patterns are ignored by Git except explicitly reviewed example files. Do not `git add -f` private material.
3. A preflight test rejects binary assets and any location-specific markers supplied through `SENSITIVE_MARKERS` (comma-separated environment variable).
4. The browser stores local edits in `localStorage` with no cloud sync. This is convenience persistence, not encrypted secure storage.
5. Exported JSON contains imported floor-plan SVG and notes. Treat it as sensitive.
6. Any future backend must authenticate users, enforce per-project ACLs, version changes, and never use raw ChatGPT identity scopes to imply access to conversations.
7. Do not rely on private URLs as an authorization mechanism. Do not transmit layout state without explicit user action.
8. Gitignore does not protect files already committed. In case of accidental publication, revoke secrets and rewrite history as necessary; assume exposed images/floor plans may have been copied.

## MVP limitations

This is a non-survey editor. Automated checks cover semantic linear centreline connectivity, duplicate/intersecting walls, window/opening junctions, rectangular fixture intersections and overlay bounds. Curves, transforms, wall thickness and door swings are not certified. An uncalibrated drawing is flagged; scale metadata alone does not verify as-built measurements.

SVG is sanitized using a browser DOM parser and a passive element allowlist with removal of event handlers and external URLs, including root attributes. This is a prototype safeguard, not a security certification. The imported SVG is embedded as an image rather than executed as application code.

A restrictive CSP disables connections, external resources, objects and form submission in the standalone app. A future hosted widget may require a separately reviewed CSP. Local storage is readable by other scripts on the same origin: use a dedicated local origin and export private backups.

Photo references are stored in private browser IndexedDB and embedded only in user-requested private JSON exports. Imported raster images are re-encoded to remove metadata; original photos stay external. IndexedDB is same-origin storage, not encryption. Browser resets can lose it. Public privacy gates reject long raster data-URL embeddings as well as image files.
