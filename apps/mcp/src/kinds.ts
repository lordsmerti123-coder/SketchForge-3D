import { sceneShape } from "@/lib/shapeCatalog";
import { fallbackSolidColor } from "@/lib/workplaneShapes";
import type { ShapeKind, WorkplaneShape } from "@/types/sketchforge";
import { SHAPE_KINDS } from "./shapes";

// Per-kind guidance for the model. This is NOT the validation enum (that's SHAPE_KINDS /
// the ShapeKind union) — it's hints about which optional fields matter and which kinds need
// payloads a model can't author by hand. "requires" lists fields beyond width/depth/height.
const KIND_GUIDANCE: Record<ShapeKind, { requires?: string[]; useful?: string[]; note?: string; generatable: boolean }> = {
  box: { useful: ["radius (corner fillet)"], generatable: true },
  cylinder: { useful: ["radius", "sides"], generatable: true },
  sphere: { useful: ["steps"], generatable: true },
  cone: { useful: ["baseRadius", "topRadius", "sides"], generatable: true },
  pyramid: { useful: ["sides"], generatable: true },
  wedge: { generatable: true },
  roundRoof: { useful: ["sides"], generatable: true },
  halfSphere: { useful: ["steps"], generatable: true },
  torus: { useful: ["radius", "bevel"], generatable: true },
  tube: { useful: ["radius", "bevel"], generatable: true },
  ring: { useful: ["radius", "bevel"], generatable: true },
  polygon: { useful: ["sides"], generatable: true },
  icosahedron: { generatable: true },
  roof: { generatable: true },
  text: { requires: ["text", "font"], note: "Set text to the string and font to a font name.", generatable: true },
  sketch: { note: "Free-form sketch; not directly generatable from numeric params.", generatable: false },
  scribble: { note: "Free-form scribble; not directly generatable from numeric params.", generatable: false },
  mesh: { requires: ["importedMesh"], note: "Needs imported geometry (positions/normals) — produced by STL import, not authored.", generatable: false },
};

export type KindInfo = {
  kind: ShapeKind;
  generatable: boolean;
  defaults: { width: number; depth: number; height: number; size: number; rotation: number };
  requires: string[];
  useful: string[];
  note?: string;
};

export function describeKinds(): KindInfo[] {
  return SHAPE_KINDS.map((kind) => {
    // Derive defaults from the app's own defaulter rather than hard-coding them.
    const d = sceneShape({ name: kind, kind, color: fallbackSolidColor({ kind } as WorkplaneShape) });
    const guidance = KIND_GUIDANCE[kind];
    return {
      kind,
      generatable: guidance.generatable,
      defaults: { width: d.width, depth: d.depth, height: d.height, size: d.size, rotation: d.rotation },
      requires: guidance.requires ?? [],
      useful: guidance.useful ?? [],
      note: guidance.note,
    };
  });
}
