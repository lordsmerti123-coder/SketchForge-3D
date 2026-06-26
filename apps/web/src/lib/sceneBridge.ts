import type { WorkplaneShape } from "@/types/sketchforge";

// Client-side contract for the scene bridge. Mirrors the record written by
// apps/web/src/app/api/scene/route.ts. `stagingRevision` is the bridge's OWN
// monotonic counter — distinct from the app's per-project revision.
export type SceneCommandOp = "upsertScene";

export type StagedSceneCommand = {
  stagingRevision: number;
  op: SceneCommandOp;
  projectId: string;
  name?: string;
  shapes: WorkplaneShape[];
  updatedAt: number;
};

// The seam V2 swaps out: today a poller, later a WebSocket `subscribe()`.
// Keeping the route and the MCP tools untouched when that happens.
export interface SceneTransport {
  // Returns the staged command if its stagingRevision is newer than `sinceStaging`,
  // otherwise null (the route answers 204 when nothing newer is staged).
  poll(sinceStaging: number): Promise<StagedSceneCommand | null>;
  // subscribe?(onCommand): () => void;  // reserved for V2 (live push)
}

export function createPollingSceneTransport(projectId: string): SceneTransport {
  return {
    async poll(sinceStaging: number) {
      const params = new URLSearchParams({ projectId, sinceStaging: String(sinceStaging) });
      const response = await fetch(`/api/scene?${params.toString()}`, {
        method: "GET",
        headers: { "Cache-Control": "no-store" },
      });
      if (response.status === 204 || !response.ok) {
        return null;
      }
      return (await response.json()) as StagedSceneCommand;
    },
  };
}

// Pure config resolver so the enable/target logic is testable without a DOM.
// Enabled by `?bridge=1` (any value except 0/false) or the env flag; the target
// project id comes from the existing `project` query param.
export function resolveSceneBridgeTarget(search: string, envEnabled = false): { enabled: boolean; projectId: string | null } {
  const params = new URLSearchParams(search);
  const flag = params.get("bridge");
  const flagEnabled = flag !== null && flag !== "0" && flag !== "false";
  const projectId = params.get("project");
  return { enabled: (envEnabled || flagEnabled) && Boolean(projectId), projectId: projectId || null };
}
