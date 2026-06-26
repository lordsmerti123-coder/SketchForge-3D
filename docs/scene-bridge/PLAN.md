# Scene Bridge — Build Plan

Work one phase per session. Each phase is a vertical slice that is independently
testable. Do not start a phase until the previous one meets its acceptance criteria.

---

## Phase 0 — Orientation (NO CODE)

**Goal:** Prove you understand the architecture before touching anything.

Read only these:
- `CLAUDE.md` (root)
- `apps/web/src/types/sketchforge.ts`
- The persistence block in `apps/web/src/app/page.tsx` (IndexedDB + localStorage helpers, ~44–135)
- `apps/web/src/app/api/local-download/route.ts` (route + same-origin guard template)
- `apps/web/src/lib/shapeCatalog.ts` and `apps/web/src/lib/workplaneShapes.ts`

**Deliverable:** a short note (`docs/scene-bridge/NOTES.md`) stating, in your own words:
the IndexedDB record shape, the exact localStorage key, the existing read/write helper
names you will reuse, the URL the editor opens with, and the data flow diagram from
`CLAUDE.md`. List anything that contradicts `CLAUDE.md` — alpha drift is expected.

**Acceptance:** the note is correct against source. No code written.

---

## Phase 1 — Bridge route (server only)

**Goal:** A local HTTP endpoint that stages and returns a scene.

- Create `apps/web/src/app/api/scene/route.ts`.
- `POST` body `{ projectId: string, shapes: WorkplaneShape[], op?: "upsertScene", name?: string }`.
  Validate with the existing routes' style (size cap, `isLocalSameOriginRequest`, `safeProjectId`).
  Assign a monotonic `stagingRevision` and write `.codex/pending-scenes/<safeId>.json` =
  `{ stagingRevision, op, projectId, name, shapes, updatedAt }`. This `stagingRevision` is the
  bridge's OWN counter — it is NOT the app's project revision (keep them separate).
- `GET ?projectId=&sinceStaging=<n>` returns the staged command if its stagingRevision is
  newer, else 204/empty.
- Do **not** import or validate full geometry here — just the JSON shape.

**Acceptance (curl, app running):**
- `curl -X POST .../api/scene` with a 1-box scene → 200, file appears under `.codex/pending-scenes/`.
- `GET` returns it; `GET` with `since` equal to current revision returns empty.
- Non-local / wrong-origin request → 403 (verify a plain Node `fetch` from localhost passes;
  if it does not, document the exact header the MCP must send).

---

## Phase 2 — Client hydrator (browser side)

**Goal:** The running app picks up a staged command and shows the scene.

- Add a `SceneTransport` interface (`poll()` now; `subscribe()` reserved for V2) and a
  polling implementation that hits `GET /api/scene?...&sinceStaging=` for the target project.
- Add the poller as a **hook called from `Home`** (`page.tsx`) — NOT a `components/` module.
  On a command whose `stagingRevision` exceeds the last one applied:
  - if `op === "upsertScene"` and the project id is unknown, create it via the existing
    create-project path, then make it the active/open project;
  - call the existing `updateProjectShapes({ projectId, shapes })` — it writes IndexedDB +
    localStorage + a winning project revision, and the editor's existing rehydration effect
    (keyed on `initialShapes`/`projectRevision`) re-renders the viewport for free.
  - record the applied `stagingRevision` to avoid re-applying.
- Gate behind a flag (e.g. `?bridge=1` or an env var) so normal use is untouched.
- Do NOT write IndexedDB directly and do NOT set a project revision yourself.

**Acceptance:**
- From the dashboard, `POST` an `upsertScene` for a NEW project id (2 shapes, one with
  `hole: true`, grouped) → project is created, opened, and the geometry renders, no console
  errors. `POST` again with a higher `stagingRevision` → scene updates. Reload → it persists
  (it's in IndexedDB). While dragging a shape, an incoming push is deferred, not fought.

---

## Phase 3 — MCP server (`apps/mcp/`)

**Goal:** Claude-callable tools that drive the bridge.

- New workspace `apps/mcp/`. Import `WorkplaneShape`, `canonicalizeShape`, and the per-kind
  defaults from `apps/web` (shared in the monorepo).
- Tools:
  - `get_scene(projectId)` → current staged shapes.
  - `set_scene(projectId, shapes, name?)` → validate, then `POST /api/scene` as `upsertScene`
    (unknown ids are fine — the client creates the project in Phase 2).
  - `add_shapes(projectId, shapes)` → merge with current, re-`POST`.
  - `list_kinds()` → kinds + required/optional fields + defaults derived from the catalog,
    so the model self-corrects.
- Validation: zod checks the `ShapeKind` **union enum** + base required numerics ONLY, then
  run the imported `canonicalizeShape` to clamp/default. Do NOT hand-author parameter ranges —
  the app's canonicaliser is the single source of truth. Reject only structurally-broken shapes.
- Ship a few example scenes (phone stand, bracket with bolt holes) as in-context references.

**Acceptance:**
- From Claude Code (or an MCP inspector): `set_scene` with a hand-written 3-shape scene for a
  fresh project id → project is created and the scene appears. Invalid shape (bad kind /
  malformed) → rejected by zod with a useful message, nothing staged. A valid-but-extreme shape
  is clamped by `canonicalizeShape`, not rejected.

---

## Phase 4 — End-to-end + polish

**Goal:** Prompt → scene in the editor.

- Driving Claude through the MCP: "a 40 mm phone stand with a cable slot" → valid
  `WorkplaneShape[]` → renders.
- Add `get_scene` round-trip so the model can read back and iterate ("make the slot 5 mm wider").
- Document the loop in `docs/scene-bridge/README.md`. Add 1–2 vitest cases for the schema
  validator and the route handler.

**Acceptance:** three different natural-language prompts each produce a sensible,
error-free scene; iteration on an existing scene works.

---

## V2 — MCP as source of truth (separate effort)

Only after V1 is solid. The seams are already in place:

- Replace the polling `SceneTransport` with a WebSocket implementation (`subscribe()`);
  route stays as a fallback.
- MCP holds the canonical scene; pushes diffs; the editor reflects them live and
  round-trips user edits back over the socket.
- Keep the `WorkplaneShape` contract identical so V1 tools keep working.

Do not build V2 abstractions early. The `SceneTransport` interface from Phase 2 is the
only forward-compatibility you need now.
