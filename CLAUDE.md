# SQUADLY Engineering Guidance

## Working Agreement

Apply these rules before every change:

1. Think before coding: state assumptions, identify ambiguity, and ask when a decision affects product behavior or data safety.
2. Prefer the smallest implementation that satisfies the request. Do not add speculative abstractions or unrelated features.
3. Make surgical changes. Preserve existing APIs, styles, and user changes outside the requested slice.
4. Define executable success criteria and run the narrowest useful check after each edit.

## Project Context

- `backend/`: CommonJS Node.js + Express API.
- `backend/src/db/schema.js`: SQLite schema using `better-sqlite3`; schema changes must include additive migration handling for existing development databases.
- `frontend/`: React + TypeScript + Vite application.
- Use existing response helpers in `backend/src/utils/response.js`.
- Use parameterized SQLite queries. Never interpolate user values into SQL.
- Keep national IDs private: store only a secure hash, masked suffix, and verification state. Never return the full ID.
- Payment gateways are mock adapters in development. Mark production integration points clearly.
- Run `npm.cmd run build` in `frontend/` for frontend validation.
- Run `node --check` on changed backend JavaScript files and use the backend health endpoint when runtime behavior changes.

## Product Boundaries

SQUADLY is a sports marketplace and community for players, captains, venues, activities, gatherings, gaming, payments, trust, and social discovery. Preserve the current React/Express architecture. Do not convert the app into a standalone vanilla HTML landing page.

## UI Direction

Use the supplied SQUADLY brand direction: deep navy, arena green, mint, white, and restrained warm accents. Keep mobile layouts usable, controls accessible, and public/private profile data explicit.

## Collaboration

When multiple agents or tools work on the repository:

- Inspect current files before editing.
- Announce the files and behavior being changed.
- Avoid overlapping edits to the same file.
- Verify the changed slice before starting another slice.
- Do not commit, reset, or remove user work without explicit permission.
