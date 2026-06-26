import { promises as fs } from "node:fs";
import path from "node:path";
import { afterAll, describe, expect, it } from "vitest";
import { GET, POST } from "@/app/api/scene/route";

const PENDING_DIR = path.join(process.cwd(), ".codex", "pending-scenes");
const projectId = `project-vitest-${Date.now()}`;
const stagedFile = path.join(PENDING_DIR, `${projectId}.json`);

function sceneRequest(body: unknown, headers: Record<string, string> = {}) {
  return new Request("http://127.0.0.1:3000/api/scene", {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });
}

function getRequest(query: string, headers: Record<string, string> = {}) {
  return new Request(`http://127.0.0.1:3000/api/scene?${query}`, { method: "GET", headers });
}

const oneBox = {
  projectId,
  shapes: [{ id: "s1", name: "Box", kind: "box", color: "#d41721", x: 0, z: 0, size: 20, width: 20, depth: 20, height: 20, rotation: 0 }],
};

afterAll(async () => {
  await fs.rm(stagedFile, { force: true });
});

describe("/api/scene route", () => {
  it("POSTs a scene, stages it, and GET returns it then 204 when caught up", async () => {
    const postRes = await POST(sceneRequest(oneBox));
    expect(postRes.status).toBe(200);
    const { stagingRevision } = (await postRes.json()) as { stagingRevision: number };
    expect(typeof stagingRevision).toBe("number");

    // GET with sinceStaging=0 -> returns the staged command
    const getNew = await GET(getRequest(`projectId=${projectId}&sinceStaging=0`));
    expect(getNew.status).toBe(200);
    const command = (await getNew.json()) as { stagingRevision: number; op: string; shapes: unknown[] };
    expect(command.op).toBe("upsertScene");
    expect(command.shapes).toHaveLength(1);
    expect(command.stagingRevision).toBe(stagingRevision);

    // GET with sinceStaging=current -> nothing newer -> 204
    const getCaughtUp = await GET(getRequest(`projectId=${projectId}&sinceStaging=${stagingRevision}`));
    expect(getCaughtUp.status).toBe(204);
  });

  it("assigns a strictly increasing stagingRevision on re-POST", async () => {
    const first = (await (await POST(sceneRequest(oneBox))).json()) as { stagingRevision: number };
    const second = (await (await POST(sceneRequest(oneBox))).json()) as { stagingRevision: number };
    expect(second.stagingRevision).toBeGreaterThan(first.stagingRevision);
  });

  it("rejects a cross-origin request with 403", async () => {
    const res = await POST(sceneRequest(oneBox, { Origin: "http://evil.example" }));
    expect(res.status).toBe(403);
  });

  it("rejects a structurally invalid body with 400", async () => {
    const res = await POST(sceneRequest({ projectId, shapes: "not-an-array" }));
    expect(res.status).toBe(400);
  });

  it("returns 204 for an unknown project", async () => {
    const res = await GET(getRequest(`projectId=project-does-not-exist-${Date.now()}&sinceStaging=0`));
    expect(res.status).toBe(204);
  });
});
