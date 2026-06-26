# SketchForge-3D — AI Scene Bridge (fork)

## What this fork adds

Upstream SketchForge is a local-first, browser-based CAD editor. This fork adds an
**AI scene bridge** so an MCP server (driven by Claude) can push parametric 3D scenes
into the running editor. A later V2 flips the MCP into the source of truth over a live
connection (see `docs/scene-bridge/PLAN.md` → V2).

We are **not** rewriting the editor. All work in this fork is **additive**.

## The one fact that governs the whole design

The editor's source of truth is **browser-origin storage**, not the server:

- **Project shapes → IndexedDB.** DB `sketchForge.projectShapes`, store `projectShapes`,
  `keyPath: "id"`, record shape `{ id, revision, shapes: WorkplaneShape[], updatedAt }`.
  (See the persistence block in `apps/web/src/app/page.tsx`, ~lines 44–135.)
- **Dashboard / project metadata → localStorage.** See the projects-storage key and the
  `readStoredProjects` / merge helpers in `page.tsx`. Confirm the exact key from source —
  do not hardcode a guessed string.
- **The editor opens a project via URL:** `/?editor=1&project=<projectId>`. There is also
  a `codexBooleanCase` test param.

An MCP server is a Node process and **cannot write browser IndexedDB/localStorage
directly** — that storage is sandboxed to the page origin. Therefore the bridge is always:

```
MCP (Node) → local HTTP route (Next server) → staged command file on disk
           → poller inside Home (page.tsx) calls the EXISTING updateProjectShapes()
             handler (writes IndexedDB + localStorage + a winning project revision)
           → the editor's initialShapes/projectRevision props change → its existing
             rehydration effect (~line 4354) re-renders the scene
```

Never attempt to have the Node side write the scene store. If a design idea requires that,
it is wrong — re-read this section.

## Data contract

`WorkplaneShape` in `apps/web/src/types/sketchforge.ts` is THE contract. Key semantics:

- A cutter is an ordinary shape with `hole: true`.
- A boolean/combined result carries its parts in `groupedShapes: WorkplaneShape[]`.
- The `ShapeKind` union (18 kinds) is the validation source of truth — wider than the
  toolbar catalog (11). `shapeCatalog.ts` / `workplaneShapes.ts` hold per-kind **defaults +
  canonicalisation**, NOT ranges. Do not hand-author ranges: import and reuse
  `canonicalizeShape` + the per-kind defaults as the validator (the monorepo makes this a
  direct import). Some kinds need extra data (`text` → text/font, `mesh` → importedMesh);
  the *generatable* subset is smaller than the union and is model guidance, not the enum.

Claude's job is emitting **valid `WorkplaneShape[]` JSON**. Manifold WASM (client-side)
does the actual CSG/meshing. Do **not** do mesh maths on the server.

## Hard rules

- **Additive only.** Do not refactor, rename, or reformat existing files. Do not load
  `SketchForgeEditor.tsx` (~5,700 lines) whole — grep for the one hook you need.
- **Reuse, don't reimplement.**
  - Copy the `isLocalSameOriginRequest` guard from an existing route
    (`apps/web/src/app/api/local-download/route.ts`) into the new route.
  - The IndexedDB/localStorage helpers in `page.tsx` (`saveProjectShapes`, etc.) are
    **module-private** — do not import them. Drive persistence through the editor's
    existing `onProjectShapesChange` handler, `updateProjectShapes` (in `Home`), which
    already writes IndexedDB + localStorage + a winning revision in one place. The bridge
    never calls `saveProjectShapes` or sets a project revision itself — `saveProjectShapes`
    silently drops any revision not greater than the current one.
- **Pin upstream.** This is an alpha repo; internal shapes churn. Forked from upstream
  commit: `<FILL IN>`. Do not chase `main`.
- **Keep transport swappable.** Put the scene-delivery mechanism behind a small
  `SceneTransport` interface so V2 can replace the poller with a WebSocket without
  touching the route or the MCP tools.

## Where new things go

- Bridge route: `apps/web/src/app/api/scene/route.ts`
- Client poller: a hook called from `Home` in `apps/web/src/app/page.tsx` (it needs
  `updateProjectShapes` + project state). NOT a new `components/` module — those can't
  reach the private helpers, and `Home` is where project lifecycle lives.
- MCP server: `apps/mcp/` (new workspace; imports `WorkplaneShape` from `apps/web/src/types`)
- Staged scenes: `.codex/pending-scenes/<projectId>.json` (mirror the existing `.codex/` convention)

## Commands

- `npm run dev` — app at http://127.0.0.1:3000
- `npm run typecheck`
- vitest tests live in `tests/`

## Working agreement

Read `docs/scene-bridge/PLAN.md` before each phase and do its orientation step.
Work **one phase per session**. Confirm your understanding and the plan before writing code.
End each session with a short handoff note (what changed, what's next, open questions).
