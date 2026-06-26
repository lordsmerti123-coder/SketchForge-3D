import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { bridgeBaseUrl, getScene, postScene } from "./bridgeClient";
import { shapeInputSchema, toWorkplaneShapes, type ShapeInput } from "./shapes";
import { describeKinds } from "./kinds";
import { EXAMPLE_SCENES } from "./examples";

const projectIdSchema = z
  .string()
  .min(1)
  .describe("Editor project id. Open the app at /?bridge=1&project=<id> to watch it live; unknown ids are created automatically.");

function viewUrl(projectId: string) {
  return `${bridgeBaseUrl()}/?bridge=1&project=${encodeURIComponent(projectId)}`;
}

function jsonResult(summary: string, data: unknown) {
  return {
    content: [
      { type: "text" as const, text: summary },
      { type: "text" as const, text: JSON.stringify(data, null, 2) },
    ],
  };
}

function errorResult(message: string) {
  return { isError: true, content: [{ type: "text" as const, text: message }] };
}

const server = new McpServer(
  { name: "sketchforge-scene-bridge", version: "0.1.0" },
  {
    instructions:
      "Push parametric 3D scenes into the SketchForge editor. Scenes are arrays of WorkplaneShape " +
      "objects (millimetres; x/z on the workplane, elevation = height above it; a cutter is any shape " +
      "with hole:true; a boolean result carries its parts in groupedShapes). The user must have the app " +
      "open at /?bridge=1&project=<id> to see updates live. Call list_kinds first to learn the shape " +
      "kinds, their default sizes, and example scenes. Use set_scene to replace a scene, add_shapes to " +
      "append, and get_scene to read the current scene back before iterating.",
  },
);

server.registerTool(
  "list_kinds",
  {
    title: "List shape kinds",
    description:
      "List every valid shape kind with its default dimensions and which optional fields matter, plus " +
      "ready-to-use example scenes. Call this before generating shapes so you self-correct on kind names " +
      "and required fields.",
    inputSchema: {},
  },
  async () => {
    return jsonResult("Valid shape kinds, defaults, and example scenes.", {
      note: "Every shape needs kind, width, depth, height. color/name are auto-filled if omitted. Positions default to the origin. Sizes are clamped/canonicalised by the editor, not by this server.",
      kinds: describeKinds(),
      examples: EXAMPLE_SCENES,
    });
  },
);

server.registerTool(
  "get_scene",
  {
    title: "Get current scene",
    description: "Read back the shapes currently staged for a project, so you can iterate on an existing scene.",
    inputSchema: { projectId: projectIdSchema },
  },
  async ({ projectId }) => {
    try {
      const scene = await getScene(projectId);
      return jsonResult(
        `Project ${projectId} has ${scene.shapes.length} staged shape(s)` +
          (scene.stagingRevision === null ? " (nothing staged yet)." : `.`),
        scene,
      );
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Could not read scene");
    }
  },
);

server.registerTool(
  "set_scene",
  {
    title: "Set (replace) scene",
    description:
      "Replace the project's scene with the given shapes. Unknown project ids are created automatically. " +
      "Shapes are validated against the shape-kind contract, then defaulted/canonicalised by the editor.",
    inputSchema: {
      projectId: projectIdSchema,
      shapes: z.array(shapeInputSchema).min(1).describe("The full scene as an array of WorkplaneShape inputs."),
      name: z.string().optional().describe("Optional project name used only when the project is first created."),
    },
  },
  async ({ projectId, shapes, name }) => {
    try {
      const workplaneShapes = toWorkplaneShapes(shapes as ShapeInput[]);
      const { stagingRevision } = await postScene(projectId, workplaneShapes, name);
      return jsonResult(`Staged ${workplaneShapes.length} shape(s) for ${projectId}. View: ${viewUrl(projectId)}`, {
        projectId,
        stagingRevision,
        shapeCount: workplaneShapes.length,
        viewUrl: viewUrl(projectId),
      });
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Could not stage scene");
    }
  },
);

server.registerTool(
  "add_shapes",
  {
    title: "Add shapes to scene",
    description: "Append shapes to the project's current staged scene (merge, then re-stage the whole scene).",
    inputSchema: {
      projectId: projectIdSchema,
      shapes: z.array(shapeInputSchema).min(1).describe("Shapes to append to the existing scene."),
    },
  },
  async ({ projectId, shapes }) => {
    try {
      const current = await getScene(projectId);
      const added = toWorkplaneShapes(shapes as ShapeInput[]);
      const merged = [...current.shapes, ...added];
      const { stagingRevision } = await postScene(projectId, merged);
      return jsonResult(
        `Added ${added.length} shape(s) to ${projectId} (now ${merged.length} total). View: ${viewUrl(projectId)}`,
        { projectId, stagingRevision, added: added.length, total: merged.length, viewUrl: viewUrl(projectId) },
      );
    } catch (error) {
      return errorResult(error instanceof Error ? error.message : "Could not add shapes");
    }
  },
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  // stderr only — stdout is the MCP JSON-RPC channel.
  console.error(`sketchforge-scene-bridge MCP server ready (bridge: ${bridgeBaseUrl()})`);
}

main().catch((error) => {
  console.error("Fatal MCP server error:", error);
  process.exit(1);
});
