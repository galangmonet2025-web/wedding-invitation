# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A multi-tenant SaaS for digital Indonesian wedding invitations. **Frontend**: React 18 + Vite + TypeScript (strict). **Backend**: a single Google Apps Script file (`backend/Code.gs`) backed by Google Sheets as the database. There is no Node backend — all server logic is the `.gs` file deployed as a Web App.

Domain language is **Indonesian** (variable names, comments, UI copy, theme template vars like `tanggal_akad`, `nama_lokasi_resepsi`). Keep new code consistent with that.

## Commands

```bash
npm run dev        # Vite dev server on :5173 (auto-opens browser)
npm run build      # tsc -b && vite build  — type-check is part of the build
npm run lint       # eslint .
npm run preview    # serve the production build
npm run deploy     # gh-pages -d dist  (predeploy runs build)
```

There is **no test runner configured** — do not assume `npm test` exists. The repo also auto-deploys via GitHub Actions (`gh-pages` branch) and is configured for Vercel (`vercel.json` rewrites all routes to `index.html`).

`.env` requires `VITE_API_URL` = the deployed Apps Script Web App `/exec` URL. Path alias `@/*` → `src/*` (configured in both `tsconfig.json` and Vite via `vite-tsconfig-paths`).

## Architecture

### Routing & auth
- **HashRouter** (`createHashRouter`) — all URLs are `/#/...`. Public invitations are `/#/:slug?guestid=<invitation_code>`; theme preview override is `/#/preview/:themeCode/:slug`. Admin/tenant app lives under `/#/private/*`.
- `src/core/router/index.tsx` is the single route table. `ProtectedRoute` enforces RBAC via `allowedRoles?: Role[]`.
- Roles: `superadmin`, `tenant_admin`, `staff`. Auth state in `src/features/auth/store/authStore.ts` (Zustand). Superadmin can impersonate a tenant.

### API layer
- `src/core/api/endpoints.ts` is the **single source of all API calls**, grouped by domain object (`authApi`, `guestApi`, `tenantApi`, `themeApi`, `invitationContentApi`, `publicApi`, `additionalFeatureApi`, etc.). Add new endpoints to the matching group here.
- `src/core/api/apiClient.ts` (Axios) **injects `token` and `tenant_id` into BOTH the query params and the JSON body** on every request, and toggles a global loading counter (`apiStore`). `Content-Type` is `text/plain` (required to avoid CORS preflight against Apps Script).
- The backend dispatches by an `action` string in `Code.gs` (`doGet`/`doPost` → big `switch`). Frontend endpoint names map 1:1 to those `case` labels. When adding an endpoint, you must edit **both** `endpoints.ts` and `Code.gs`.
- **Multi-tenancy is enforced server-side**: `tenant_id` is always taken from the auth token in `Code.gs`, never trusted from the request. Only `superadmin` reads cross-tenant data. Honor this when touching backend queries.

### State
Zustand stores, colocated per feature under `src/features/<feature>/store/`. Cross-cutting stores live in `src/shared/store` and `src/core/api/apiStore.ts`.

### Feature structure
`src/features/<feature>/{pages,components,store}`. Notable: `admin/` (theme editor, plans, coupons, reviews, master quotes, archive/restore, transaction monitoring), `invitation/` (the public-facing rendered invitation), `guest/` (CRUD + WhatsApp blast + CSV/Contacts import), `scanner/` (QR check-in). Shared primitives in `src/shared/components`. All app TypeScript interfaces are in `src/types/index.ts`.

## Theme system (the core differentiator — read carefully before touching)

Tenants pick a "theme" that renders their public invitation. Custom themes are **self-contained `index.html` + `index.css` + `index.js` bundles** living in `src/sample-theme/<name>/` (e.g. `retromario`, `retrocontra`, `game-phaser`, `lake-como`, `netflix`).

Two pieces make a theme work:

1. **`src/utils/templateParser.ts`** resolves binding *before* theme JS runs: `{{var}}` → plain text/url (unknown → empty string), `{{#if}}`/`{{#unless}}`/`{{else}}`, `{{#each list}}...{{this.field}}...{{/each}}`. There is **no runtime `data-var` substitution** — read rendered text, not attributes. The authoritative variable-name list is the "Variabel Tema" tab of `src/features/admin/components/ThemeGuideModal.tsx`.

2. **`src/features/invitation/components/ThemeWrapper.tsx`** injects HTML (`dangerouslySetInnerHTML`), CSS (`<style>`), and JS (IIFE in `<script id="theme-custom-js">`). The JS script is **removed and re-executed** whenever its inputs change, so **every theme JS must register a global cleanup hook and call it on entry** (e.g. `window.__rmCleanup`) or RAF loops and listeners stack.

**Host-hardcoded element IDs the theme must keep verbatim** (host queries/intercepts them): `btn-show-qr`, `btn-show-menu`, `btn-toggle-music`/`btn-music`, `bg-music`/`play-icon`/`pause-icon`, `btn-submit-ucapan`+`wish-name`+`wish-message`, RSVP `btn-submit-kehadiran`+`rsvp-status`/`rsvp-guests`/`rsvp-code`.

**Music**: the theme can NOT play audio itself. The host (`InvitationPage.tsx`) owns the real `Audio`/YouTube player and only plays when `isPlaying && isOpened`. The theme's only lever is clicking `#btn-toggle-music`; it must mirror state, never call `audio.play()`. See the memory notes below.

**Verifying game themes**: headless Chrome screenshots do **not** work on this machine (always blank). Verify by pasting the 3 files into the host Theme Editor (`ThemeEditorPage.tsx`) and opening the preview, or ask the user. Canvas game logic can be checked with a headless Node harness driving the real `loop()` via a stubbed RAF (not by calling step functions directly).

## Persistent memory

Non-obvious, hard-won context lives in `~/.claude/projects/.../memory/` and is summarized into context each session. Before doing theme/game work, the relevant notes are: `theme-host-contract`, `retromario-debugging`, `retromario-host-music`, `game-phaser-theme`, `landing-sellable-features` (don't invent marketing features not in the codebase).

## Conventions

- TypeScript strict mode is on, but `noUnusedLocals`/`noUnusedParameters` are off. The build type-checks (`tsc -b`), so a type error fails the build.
- Stale top-level artifacts exist (`build_error.txt`, `ts_errors.txt`, `scratch/`, various `*.md` prompt files, `SECURITY_FINDINGS.md`) — these are scratchpads/audits, not authoritative. Trust the code.
