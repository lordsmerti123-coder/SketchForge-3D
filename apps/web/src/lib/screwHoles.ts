import { createLocalId } from "@/lib/localIds";
import type { MetricScrewSize, ScrewHeadType, ScrewHoleFeature, ScrewHoleFit, ScrewHoleMount, WorkplaneShape } from "@/types/sketchforge";

export type ScrewHoleConfig = ScrewHoleFeature;

type MetricScrewSpec = {
  clearance: Record<ScrewHoleFit, number>;
  socketHead: { diameter: number; depth: number };
  countersunkHead: { diameter: number; depth: number };
  buttonHead: { diameter: number; depth: number };
  panHead: { diameter: number; depth: number };
  hexHead: { flats: number; depth: number };
  heatSet: { diameter: number; depth: number };
  nut: { flats: number; depth: number };
};

export const METRIC_SCREW_SIZES: MetricScrewSize[] = ["M2", "M2.5", "M3", "M4", "M5", "M6"];

export const SCREW_HEAD_OPTIONS: Array<{ value: ScrewHeadType; label: string }> = [
  { value: "socket", label: "Socket / Allen" },
  { value: "countersunk", label: "Countersunk" },
  { value: "button", label: "Button" },
  { value: "pan", label: "Pan" },
  { value: "hex", label: "Hex" },
];

export const SCREW_HOLE_MOUNT_OPTIONS: Array<{ value: ScrewHoleMount; label: string }> = [
  { value: "clearance", label: "Clearance hole" },
  { value: "heatSet", label: "Heat-set insert" },
  { value: "nutTrap", label: "Nut trap" },
];

const SCREW_SPECS: Record<MetricScrewSize, MetricScrewSpec> = {
  M2: {
    clearance: { precise: 2.2, standard: 2.4, loose: 2.6 },
    socketHead: { diameter: 4, depth: 2.2 },
    countersunkHead: { diameter: 4.2, depth: 1.3 },
    buttonHead: { diameter: 4.2, depth: 1.5 },
    panHead: { diameter: 4.4, depth: 1.6 },
    hexHead: { flats: 4, depth: 1.8 },
    heatSet: { diameter: 3.2, depth: 3 },
    nut: { flats: 4, depth: 1.8 },
  },
  "M2.5": {
    clearance: { precise: 2.7, standard: 2.9, loose: 3.1 },
    socketHead: { diameter: 4.8, depth: 2.5 },
    countersunkHead: { diameter: 5, depth: 1.5 },
    buttonHead: { diameter: 5, depth: 1.8 },
    panHead: { diameter: 5.2, depth: 2 },
    hexHead: { flats: 5, depth: 2.2 },
    heatSet: { diameter: 3.8, depth: 3.8 },
    nut: { flats: 5, depth: 2.2 },
  },
  M3: {
    clearance: { precise: 3.2, standard: 3.4, loose: 3.6 },
    socketHead: { diameter: 5.7, depth: 3.1 },
    countersunkHead: { diameter: 6, depth: 1.8 },
    buttonHead: { diameter: 5.7, depth: 2 },
    panHead: { diameter: 6, depth: 2.2 },
    hexHead: { flats: 5.5, depth: 2.4 },
    heatSet: { diameter: 4.6, depth: 5 },
    nut: { flats: 5.5, depth: 2.4 },
  },
  M4: {
    clearance: { precise: 4.3, standard: 4.5, loose: 4.8 },
    socketHead: { diameter: 7.2, depth: 4.2 },
    countersunkHead: { diameter: 8, depth: 2.4 },
    buttonHead: { diameter: 7.6, depth: 2.8 },
    panHead: { diameter: 8, depth: 3 },
    hexHead: { flats: 7, depth: 3.2 },
    heatSet: { diameter: 5.6, depth: 6 },
    nut: { flats: 7, depth: 3.2 },
  },
  M5: {
    clearance: { precise: 5.3, standard: 5.5, loose: 5.8 },
    socketHead: { diameter: 8.7, depth: 5.2 },
    countersunkHead: { diameter: 10, depth: 3 },
    buttonHead: { diameter: 9.5, depth: 3.5 },
    panHead: { diameter: 10, depth: 3.8 },
    hexHead: { flats: 8, depth: 4 },
    heatSet: { diameter: 6.7, depth: 7 },
    nut: { flats: 8, depth: 4 },
  },
  M6: {
    clearance: { precise: 6.4, standard: 6.6, loose: 7 },
    socketHead: { diameter: 10.5, depth: 6.2 },
    countersunkHead: { diameter: 12, depth: 3.6 },
    buttonHead: { diameter: 11.5, depth: 4.2 },
    panHead: { diameter: 12, depth: 4.5 },
    hexHead: { flats: 10, depth: 5 },
    heatSet: { diameter: 8, depth: 8 },
    nut: { flats: 10, depth: 5 },
  },
};

export const DEFAULT_SCREW_HOLE_CONFIG: ScrewHoleConfig = {
  metric: "M3",
  screwLength: 8,
  head: "socket",
  fit: "standard",
  mount: "clearance",
  depthMode: "through",
  depth: 10,
};

export type ScrewHoleDimensions = {
  shaftDiameter: number;
  headDiameter: number;
  recessDepth: number;
  totalDepth: number;
  sides: number;
  countersunk: boolean;
};

function hexCircumscribedDiameter(acrossFlats: number) {
  return (acrossFlats * 2) / Math.sqrt(3);
}

export function screwHoleDimensions(config: ScrewHoleConfig): ScrewHoleDimensions {
  const spec = SCREW_SPECS[config.metric];
  const shaftDiameter = spec.clearance[config.fit];
  const totalDepth = Math.max(0.5, config.depth);

  if (config.mount === "heatSet") {
    return { shaftDiameter: spec.heatSet.diameter, headDiameter: spec.heatSet.diameter, recessDepth: Math.min(totalDepth, spec.heatSet.depth), totalDepth, sides: 64, countersunk: false };
  }
  if (config.mount === "nutTrap") {
    return { shaftDiameter, headDiameter: hexCircumscribedDiameter(spec.nut.flats), recessDepth: Math.min(totalDepth, spec.nut.depth), totalDepth, sides: 6, countersunk: false };
  }

  const head = config.head === "socket" ? spec.socketHead : config.head === "countersunk" ? spec.countersunkHead : config.head === "button" ? spec.buttonHead : config.head === "pan" ? spec.panHead : { diameter: hexCircumscribedDiameter(spec.hexHead.flats), depth: spec.hexHead.depth };
  return { shaftDiameter, headDiameter: head.diameter, recessDepth: Math.min(totalDepth, head.depth), totalDepth, sides: config.head === "hex" ? 6 : 64, countersunk: config.head === "countersunk" };
}

export function screwHoleLabel(config: ScrewHoleConfig) {
  const mount = config.mount === "heatSet" ? "heat-set insert" : config.mount === "nutTrap" ? "nut trap" : `${config.head} head`;
  return `${config.metric} × ${config.screwLength} ${mount}`;
}

function holePrimitive(id: string, name: string, kind: "cylinder" | "cone", diameter: number, height: number, elevation: number, sides: number, topDiameter?: number): WorkplaneShape {
  const baseRadius = diameter / 2;
  return { id, name, kind, color: "#b8c2cc", hole: true, x: 0, z: 0, elevation, size: diameter, width: diameter, depth: diameter, height, rotation: 0, rotationX: 0, rotationZ: 0, sides, topRadius: kind === "cone" ? (topDiameter ?? diameter) / 2 : undefined, baseRadius: kind === "cone" ? baseRadius : undefined, locked: false, hidden: false };
}

export function createScrewHoleShape(config: ScrewHoleConfig, point: { x: number; z: number; elevation: number }, id = createLocalId("screw-hole")): WorkplaneShape {
  const dimensions = screwHoleDimensions(config);
  const shaftTop = Math.max(0, dimensions.totalDepth - dimensions.recessDepth);
  const diameter = Math.max(dimensions.shaftDiameter, dimensions.headDiameter);
  const children: WorkplaneShape[] = [];
  const radialSides = dimensions.sides === 6 ? 6 : 96;

  if (config.mount === "heatSet") {
    children.push(holePrimitive(`${id}-insert`, "Heat-set insert pocket", "cylinder", dimensions.shaftDiameter, dimensions.totalDepth, 0, radialSides));
  } else {
    if (shaftTop > 0.0001) children.push(holePrimitive(`${id}-shaft`, "Screw clearance", "cylinder", dimensions.shaftDiameter, shaftTop, 0, 96));
    if (dimensions.recessDepth > 0.0001) {
      children.push(dimensions.countersunk
        ? holePrimitive(`${id}-countersink`, "Countersink", "cone", dimensions.shaftDiameter, dimensions.recessDepth, shaftTop, radialSides, dimensions.headDiameter)
        : holePrimitive(`${id}-recess`, config.mount === "nutTrap" ? "Hex nut trap" : "Head recess", "cylinder", dimensions.headDiameter, dimensions.recessDepth, shaftTop, radialSides));
    }
    if (children.length === 0) children.push(holePrimitive(`${id}-shaft`, "Screw clearance", "cylinder", dimensions.shaftDiameter, dimensions.totalDepth, 0, 96));
  }

  return {
    id,
    name: `Screw hole: ${screwHoleLabel(config)}`,
    kind: "mesh",
    color: "#b8c2cc",
    hole: true,
    x: point.x,
    z: point.z,
    elevation: point.elevation,
    size: diameter,
    width: diameter,
    depth: diameter,
    height: dimensions.totalDepth,
    rotation: 0,
    rotationX: 0,
    rotationZ: 0,
    groupedBaseWidth: diameter,
    groupedBaseDepth: diameter,
    groupedBaseHeight: dimensions.totalDepth,
    groupedShapes: children,
    screwHole: { ...config, depth: dimensions.totalDepth },
    locked: false,
    hidden: false,
  };
}
