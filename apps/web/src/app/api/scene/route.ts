import { promises as fs } from "fs";
import path from "path";
import { NextResponse } from "next/server";
import type { WorkplaneShape } from "@/types/sketchforge";

export const revalidate = false;

// Scene bridge: stages MCP-pushed commands on disk for the client poller (Phase 2)
// to apply via the editor's existing updateProjectShapes() path. The Node side never
// touches IndexedDB/localStorage — see CLAUDE.md. This route only writes/reads a file.
const PENDING_SCENES_DIR = path.join(process.cwd(), ".codex", "pending-scenes");
const LOCAL_HOSTS = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);
const MAX_SCENE_BYTES = 16 * 1024 * 1024;
const SUPPORTED_OPS = new Set(["upsertScene"]);

type SceneOp = "upsertScene";

type StagedSceneCommand = {
  stagingRevision: number;
  op: SceneOp;
  projectId: string;
  name?: string;
  shapes: WorkplaneShape[];
  updatedAt: number;
};

// Copied from the sibling api/project-thumbnail route — keep the bridge in lockstep
// with the app's existing same-origin policy rather than inventing a new one.
function safeProjectId(projectId: string) {
  const clean = projectId.replace(/[^a-zA-Z0-9_-]/g, "");
  return clean || null;
}

function pendingScenePath(projectId: string) {
  const safeId = safeProjectId(projectId);
  if (!safeId) {
    return null;
  }
  return path.join(PENDING_SCENES_DIR, `${safeId}.json`);
}

function isLocalSameOriginRequest(request: Request) {
  const requestUrl = new URL(request.url);
  if (!LOCAL_HOSTS.has(requestUrl.hostname)) {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      const originUrl = new URL(origin);
      if (!LOCAL_HOSTS.has(originUrl.hostname) || originUrl.port !== requestUrl.port || originUrl.protocol !== requestUrl.protocol) {
        return false;
      }
    } catch {
      return false;
    }
  }

  const fetchSite = request.headers.get("sec-fetch-site");
  return !fetchSite || fetchSite === "same-origin" || fetchSite === "same-site" || fetchSite === "none";
}

async function readStagedCommand(filePath: string): Promise<StagedSceneCommand | null> {
  try {
    const raw = await fs.readFile(filePath, "utf8");
    return JSON.parse(raw) as StagedSceneCommand;
  } catch {
    return null;
  }
}

// The bridge's OWN counter — separate from the app's project revision. Monotonic per
// project and survives a server restart by stepping past whatever the staged file holds.
function nextStagingRevision(previous: StagedSceneCommand | null) {
  const prior = typeof previous?.stagingRevision === "number" ? previous.stagingRevision : 0;
  return Math.max(Date.now(), prior + 1);
}

export async function GET(request: Request) {
  if (!isLocalSameOriginRequest(request)) {
    return NextResponse.json({ error: "Scene bridge is only available from this localhost app" }, { status: 403 });
  }

  const params = new URL(request.url).searchParams;
  const filePath = pendingScenePath(params.get("projectId") ?? "");
  if (!filePath) {
    return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
  }

  const sinceRaw = Number(params.get("sinceStaging"));
  const sinceStaging = Number.isFinite(sinceRaw) ? sinceRaw : 0;

  const command = await readStagedCommand(filePath);
  if (!command || command.stagingRevision <= sinceStaging) {
    return new NextResponse(null, { status: 204 });
  }

  return NextResponse.json(command, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  if (!isLocalSameOriginRequest(request)) {
    return NextResponse.json({ error: "Scene bridge is only available from this localhost app" }, { status: 403 });
  }

  const contentLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(contentLength) && contentLength > MAX_SCENE_BYTES) {
    return NextResponse.json({ error: "Scene is too large" }, { status: 413 });
  }

  const rawBody = await request.text();
  if (Buffer.byteLength(rawBody, "utf8") > MAX_SCENE_BYTES) {
    return NextResponse.json({ error: "Scene is too large" }, { status: 413 });
  }

  let body: { projectId?: unknown; shapes?: unknown; op?: unknown; name?: unknown };
  try {
    body = JSON.parse(rawBody) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid scene request" }, { status: 400 });
  }

  try {
    if (typeof body.projectId !== "string" || !Array.isArray(body.shapes)) {
      return NextResponse.json({ error: "Invalid scene request" }, { status: 400 });
    }

    const filePath = pendingScenePath(body.projectId);
    if (!filePath) {
      return NextResponse.json({ error: "Invalid project id" }, { status: 400 });
    }

    const op = body.op === undefined ? "upsertScene" : body.op;
    if (typeof op !== "string" || !SUPPORTED_OPS.has(op)) {
      return NextResponse.json({ error: `Unsupported op: ${String(body.op)}` }, { status: 400 });
    }

    if (body.name !== undefined && typeof body.name !== "string") {
      return NextResponse.json({ error: "Invalid scene name" }, { status: 400 });
    }

    const previous = await readStagedCommand(filePath);
    const command: StagedSceneCommand = {
      stagingRevision: nextStagingRevision(previous),
      op: op as SceneOp,
      projectId: body.projectId,
      shapes: body.shapes as WorkplaneShape[],
      updatedAt: Date.now(),
    };
    if (typeof body.name === "string") {
      command.name = body.name;
    }

    await fs.mkdir(PENDING_SCENES_DIR, { recursive: true });
    await fs.writeFile(filePath, JSON.stringify(command, null, 2), "utf8");

    return NextResponse.json({ stagingRevision: command.stagingRevision });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not stage scene" }, { status: 500 });
  }
}
