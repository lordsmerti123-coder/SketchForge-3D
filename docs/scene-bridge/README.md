# AI Scene Bridge

Push parametric 3D scenes from Claude (via an MCP server) into the running SketchForge
editor. Claude emits `WorkplaneShape[]` JSON; the editor's existing save path hydrates it
into the viewport. Manifold WASM (client-side) does all the actual CSG/meshing — the bridge
never does mesh maths.

## The loop

```
Claude ──(MCP tool call)──▶ apps/mcp  ──POST /api/scene──▶  Next route (server)
                                                              │ stages a command file:
                                                              │ .codex/pending-scenes/<id>.json
                                                              ▼
   editor viewport ◀── rehydration effect ◀── updateProjectShapes() ◀── poller in Home (page.tsx)
   (renders shapes)     (initialShapes/            (writes IndexedDB +     GET /api/scene?sinceStaging=
                         projectRevision)           localStorage + revision)
```

An MCP server is a Node process and **cannot** write the browser's IndexedDB/localStorage —
that storage is sandboxed to the page origin. So the bridge always goes through the HTTP
route + an in-page poller that reuses the app's own save path.

### Two independent counters

- **`stagingRevision`** — the bridge's own monotonic counter (per project, in the staged
  file). The poller polls `GET /api/scene?sinceStaging=<last applied>` and only applies
  newer commands.
- **project `revision`** — the app's existing per-project revision, owned entirely by
  `updateProjectShapes()`. The bridge never sets it.

These are kept separate on purpose: the bridge can re-deliver without fighting the app's
own revisioning, and the editor defers an incoming push while the user is mid-drag.

## Running it

1. Start the app:
   ```
   npm run dev            # http://127.0.0.1:3000
   ```
2. Open the editor in **bridge mode**, choosing any project id you like:
   ```
   http://127.0.0.1:3000/?bridge=1&project=my-first-scene
   ```
   The id need not exist yet — the first `set_scene` creates and opens it.
3. The MCP server is registered for Claude Code in [`.mcp.json`](../../.mcp.json) at the repo
   root (`sketchforge-scene-bridge`). It launches via `npm run start --prefix apps/mcp` and
   talks to the app at `SKETCHFORGE_BASE_URL` (default `http://127.0.0.1:3000`). Claude Code
   picks up `.mcp.json` on startup — restart it once after first checkout and approve the
   server.

You can also run the server standalone for an MCP inspector:
```
SKETCHFORGE_BASE_URL=http://127.0.0.1:3000 npm run start --prefix apps/mcp
```

## Tools

| Tool | Args | What it does |
|------|------|--------------|
| `list_kinds` | — | Lists every shape kind, its default dimensions, which optional fields matter, and example scenes. **Call this first.** |
| `set_scene` | `projectId, shapes[], name?` | Replaces the project's scene. Unknown ids are created automatically. |
| `add_shapes` | `projectId, shapes[]` | Appends shapes to the current scene (merge + re-stage). |
| `get_scene` | `projectId` | Reads the current staged shapes back, so you can iterate. |

## The data contract

`WorkplaneShape` (`apps/web/src/types/sketchforge.ts`) is THE contract. For authoring:

- Units are **millimetres**. `x`/`z` position on the workplane; `elevation` is height above it.
- Every shape needs `kind` + `width` + `depth` + `height`. `color`/`name` auto-fill if omitted;
  position defaults to the origin.
- A **cutter** is any shape with `hole: true`.
- A **boolean/combined result** carries its parts in `groupedShapes: WorkplaneShape[]`.
- `kind` must be one of the 18 `ShapeKind` values (`list_kinds`). Some kinds need extra data
  (`text` → `text`/`font`; `mesh` → imported geometry) and aren't directly generatable.

### Validation

The MCP validates with zod against the `ShapeKind` **union enum** + the base numerics only,
then runs the app's own `sceneShape`/`canonicalizeShape` to fill defaults and canonicalise.
There are **no hand-authored parameter ranges** — the app's canonicaliser is the single
source of truth. So:

- a bad kind or malformed (non-numeric) field is **rejected** with a useful message, nothing
  is staged;
- a valid-but-extreme shape (e.g. `rotation: 725`) is **canonicalised** (→ `5`), not rejected.

## Example prompts → scenes

- *"a 40 mm phone stand with a cable slot"* → base box + tilted backrest + front lip +
  a `hole: true` cylinder for the cable slot.
- *"a pen holder, a 50 mm cylinder hollowed from the top"* → outer cylinder + inner
  `hole: true` cylinder.
- *"a little toy house"* → a box body + a `roof` on top.

## Iterating on a scene

```
get_scene(projectId)            # read the current shapes
# edit the shape you want, e.g. widen the cable slot by 5 mm
set_scene(projectId, shapes)    # re-stage; the editor updates in place
```

Because the scene lives in IndexedDB, it persists across reloads. While the user is dragging
a shape, an incoming push is deferred (not fought) and applied when the drag ends.

## Tests

```
npm run test
```

- `tests/unit/sceneRoute.test.ts` — the `/api/scene` route handler (stage/poll, monotonic
  `stagingRevision`, same-origin 403, validation 400, 204 semantics).
- `tests/unit/sceneSchema.test.ts` — the MCP schema validator (defaults via the app's
  defaulter, cutter/grouped preserved, bad kind / malformed rejected, extreme canonicalised).

## File map

| Path | Role |
|------|------|
| `apps/web/src/app/api/scene/route.ts` | Bridge route (stages/serves commands). |
| `apps/web/src/lib/sceneBridge.ts` | `SceneTransport` interface + polling transport (V2 swap point). |
| `apps/web/src/app/page.tsx` | `useSceneBridge` poller hook + `applyBridgeCommand` (in `Home`). |
| `apps/mcp/` | MCP server: tools, zod schema, app-reused defaulter, example scenes. |
| `.codex/pending-scenes/<id>.json` | Staged command (gitignored). |

## V2 (later)

The `SceneTransport` interface in `sceneBridge.ts` is the only forward-compatibility seam:
V2 replaces the polling transport with a WebSocket (`subscribe()`) so the MCP becomes the
live source of truth, while the route stays as a fallback and the `WorkplaneShape` contract
is unchanged. See `PLAN.md` → V2.
