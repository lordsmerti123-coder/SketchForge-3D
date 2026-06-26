import type { WorkplaneShape } from "@/types/sketchforge";

// Where the running Next app (and its /api/scene bridge) lives. The route's same-origin
// guard passes a plain Node fetch from localhost with no extra headers (verified in Phase 1).
const BASE_URL = (process.env.SKETCHFORGE_BASE_URL ?? process.env.SCENE_BRIDGE_URL ?? "http://127.0.0.1:3000").replace(/\/$/, "");

export function bridgeBaseUrl() {
  return BASE_URL;
}

export type StagedScene = {
  shapes: WorkplaneShape[];
  stagingRevision: number | null;
  name?: string;
};

export async function postScene(projectId: string, shapes: WorkplaneShape[], name?: string): Promise<{ stagingRevision: number }> {
  const response = await fetch(`${BASE_URL}/api/scene`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ projectId, op: "upsertScene", name, shapes }),
  });
  if (!response.ok) {
    throw new Error(`POST /api/scene failed (${response.status}): ${await response.text().catch(() => response.statusText)}`);
  }
  return (await response.json()) as { stagingRevision: number };
}

export async function getScene(projectId: string): Promise<StagedScene> {
  const params = new URLSearchParams({ projectId, sinceStaging: "0" });
  const response = await fetch(`${BASE_URL}/api/scene?${params.toString()}`, {
    method: "GET",
    headers: { "Cache-Control": "no-store" },
  });
  if (response.status === 204) {
    return { shapes: [], stagingRevision: null };
  }
  if (!response.ok) {
    throw new Error(`GET /api/scene failed (${response.status}): ${await response.text().catch(() => response.statusText)}`);
  }
  const command = (await response.json()) as { shapes?: WorkplaneShape[]; stagingRevision?: number; name?: string };
  return { shapes: command.shapes ?? [], stagingRevision: command.stagingRevision ?? null, name: command.name };
}
