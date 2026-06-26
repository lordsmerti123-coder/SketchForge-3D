import { z } from "zod";
import { sceneShape } from "@/lib/shapeCatalog";
import { fallbackSolidColor } from "@/lib/workplaneShapes";
import type { ShapeKind, WorkplaneShape } from "@/types/sketchforge";

// The ShapeKind union is the validation source of truth (CLAUDE.md). The type is
// compile-time only, so we mirror it here as a runtime list for the zod enum, with a
// two-way compile-time guard so the list can never silently drift from the union.
export const SHAPE_KINDS = [
  "box",
  "cylinder",
  "sphere",
  "sketch",
  "scribble",
  "cone",
  "pyramid",
  "roof",
  "text",
  "roundRoof",
  "halfSphere",
  "torus",
  "tube",
  "ring",
  "wedge",
  "polygon",
  "icosahedron",
  "mesh",
] as const;

type MissingFromList = Exclude<ShapeKind, (typeof SHAPE_KINDS)[number]>;
type ExtraInList = Exclude<(typeof SHAPE_KINDS)[number], ShapeKind>;
// If either of these errors, SHAPE_KINDS and the ShapeKind union have drifted — fix the list.
const _assertNoneMissing: MissingFromList extends never ? true : false = true;
const _assertNoneExtra: ExtraInList extends never ? true : false = true;
void _assertNoneMissing;
void _assertNoneExtra;

// Structural input contract for a model-authored shape. We require only the base
// numerics every kind needs (width/depth/height) plus a valid kind; everything else is
// optional and gets filled + canonicalised by the app's own sceneShape(). We deliberately
// do NOT encode parameter ranges here — the app's canonicaliser owns that.
export interface ShapeInput {
  id?: string;
  name?: string;
  kind: ShapeKind;
  color?: string;
  hole?: boolean;
  x?: number;
  z?: number;
  elevation?: number;
  width: number;
  depth: number;
  height: number;
  size?: number;
  rotation?: number;
  rotationX?: number;
  rotationZ?: number;
  mirrorX?: boolean;
  mirrorY?: boolean;
  mirrorZ?: boolean;
  radius?: number;
  steps?: number;
  sides?: number;
  bevel?: number;
  segments?: number;
  topRadius?: number;
  baseRadius?: number;
  text?: string;
  font?: string;
  importedMesh?: unknown;
  imagePlate?: unknown;
  groupedShapes?: ShapeInput[];
  groupedBaseWidth?: number;
  groupedBaseDepth?: number;
  groupedBaseHeight?: number;
  locked?: boolean;
  hidden?: boolean;
}

const finiteNumber = z.number().finite();

// z.lazy for the groupedShapes recursion (a boolean result carries its parts).
export const shapeInputSchema: z.ZodType<ShapeInput> = z.lazy(() =>
  z.object({
    id: z.string().optional(),
    name: z.string().optional(),
    kind: z.enum(SHAPE_KINDS),
    color: z.string().optional(),
    hole: z.boolean().optional(),
    x: finiteNumber.optional(),
    z: finiteNumber.optional(),
    elevation: finiteNumber.optional(),
    width: finiteNumber,
    depth: finiteNumber,
    height: finiteNumber,
    size: finiteNumber.optional(),
    rotation: finiteNumber.optional(),
    rotationX: finiteNumber.optional(),
    rotationZ: finiteNumber.optional(),
    mirrorX: z.boolean().optional(),
    mirrorY: z.boolean().optional(),
    mirrorZ: z.boolean().optional(),
    radius: finiteNumber.optional(),
    steps: finiteNumber.optional(),
    sides: finiteNumber.optional(),
    bevel: finiteNumber.optional(),
    segments: finiteNumber.optional(),
    topRadius: finiteNumber.optional(),
    baseRadius: finiteNumber.optional(),
    text: z.string().optional(),
    font: z.string().optional(),
    importedMesh: z.unknown().optional(),
    imagePlate: z.unknown().optional(),
    groupedShapes: z.array(shapeInputSchema).optional(),
    groupedBaseWidth: finiteNumber.optional(),
    groupedBaseDepth: finiteNumber.optional(),
    groupedBaseHeight: finiteNumber.optional(),
    locked: z.boolean().optional(),
    hidden: z.boolean().optional(),
  }),
);

export const shapesArraySchema = z.array(shapeInputSchema);

function prettifyKind(kind: ShapeKind) {
  const spaced = kind.replace(/([a-z])([A-Z])/g, "$1 $2");
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

// Validate-then-defaults pipeline: the zod layer only rejects structurally broken shapes;
// sceneShape() (which calls canonicalizeShape) is the single source of truth for defaults
// + canonicalisation. Grouped parts are normalised depth-first so children get defaults too.
export function toWorkplaneShape(input: ShapeInput): WorkplaneShape {
  const kind = input.kind;
  const color = input.color ?? fallbackSolidColor({ kind } as WorkplaneShape);
  const name = input.name ?? prettifyKind(kind);
  const groupedShapes = input.groupedShapes?.map(toWorkplaneShape);
  return sceneShape({
    ...(input as Partial<WorkplaneShape>),
    name,
    kind,
    color,
    groupedShapes,
  });
}

export function toWorkplaneShapes(inputs: ShapeInput[]): WorkplaneShape[] {
  return inputs.map(toWorkplaneShape);
}
