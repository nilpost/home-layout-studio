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
- Phase 1: precision geometry engine and coordinate scale metadata; collision and wall topology checks with tests.
- Phase 2: authenticated private object storage, revision history, encrypted backups.
- Phase 3: ChatGPT plugin/MCP integration, explicit user-initiated state handoff; verified project mapping via app-owned authorization.

## 6. Non-goals

No automatic read access to entire ChatGPT conversation backlog, no automatic project detection based solely on ChatGPT login, and no claim of a deployed or installed ChatGPT app.
