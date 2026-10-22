# Home Layout Studio

A local-first SVG floor-plan editor with annotation, comment pins, furniture placeholders, revision export and a ChatGPT handoff.

**This is the public, generic application. It does not contain any real residential floor plan, photograph, address, private project identifier, or conversation history.**

## Quick start

Open `index.html` in a browser. There is no build step, backend, account requirement, API key, dependency installation, or network request in the public standalone editor.

The initial plan is anonymous demonstration geometry. Use **Import architectural SVG** or **Import JSON** to load your private project **on your own device**.

## Features

- Locked source SVG and separate editable overlay layers
- Furniture placeholders: create, drag, resize through numerical inspector, label, delete
- Markup arrows and highlighted rectangles
- Numbered location comments
- Zoom, undo/redo, project name, revision counter
- Export SVG for review and a JSON project to preserve state
- Browser-local autosaving
- **Send / copy corrections**: in a supported ChatGPT app surface uses `window.openai.sendFollowUpMessage`; standalone copies a structured request to paste in ChatGPT
- Basic overlay validation; *no claim of survey-grade geometric or structural validation*

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

Prototype 0.1.0. Public application starter; not deployed or linked to an authenticated ChatGPT project.
