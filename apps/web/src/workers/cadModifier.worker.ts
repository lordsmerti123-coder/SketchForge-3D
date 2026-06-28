/// <reference lib="webworker" />

import { OcctKernel, type ShapeHandle } from "occt-wasm";
import type { CadModifierDisplayEdge, CadModifierEdge, CadModifierMeshPart, CadModifierQuality, CadModifierWorkerRequest, CadModifierWorkerResponse } from "@/lib/cadModifierTypes";

const HASH_UPPER_BOUND = 2_147_483_647;
const CAD_EDGE_WIREFRAME_DEFLECTION = 0.035;
const CAD_DISPLAY_EDGE_MIN_ANGLE = 0.75;
const CURVED_SURFACE_TYPES = new Set(["cylinder", "cone", "sphere", "torus", "bspline", "bezier", "offset", "revolution", "extrusion"]);
let kernelPromise: Promise<OcctKernel> | null = null;
let baseShape: ShapeHandle | null = null;
let baseSolids: ShapeHandle[] = [];
let edgeHandles: ShapeHandle[] = [];
let edgeOwners: number[] = [];

type CollectedCadEdge = CadModifierEdge & {
  curveType: string;
  surfaceTypes: string[];
};

function post(message: CadModifierWorkerResponse, transfer: Transferable[] = []) {
  self.postMessage(message, { transfer });
}

function kernel() {
  const moduleUrl = "/assets/occt/occt-wasm.js";
  kernelPromise ??= import(/* webpackIgnore: true */ moduleUrl).then((imported: { default: (options?: { locateFile?: (path: string) => string }) => Promise<unknown> }) => imported.default({
    locateFile: (path) => path.endsWith(".wasm") ? "/assets/occt/occt-wasm.wasm" : path,
  })).then((module) => {
    const KernelConstructor = OcctKernel as unknown as new (rawModule: unknown) => OcctKernel;
    return new KernelConstructor(module);
  });
  return kernelPromise;
}

function releaseSession(cad: OcctKernel) {
  try {
    cad.releaseAll();
  } catch {
    // The arena may already be empty after an operation failure.
  }
  baseShape = null;
  baseSolids = [];
  edgeHandles = [];
  edgeOwners = [];
}

function orientedFaceNormal(cad: OcctKernel, face: ShapeHandle, point: { x: number; y: number; z: number }) {
  const uv = cad.uvFromPoint(face, point);
  const normal = cad.surfaceNormal(face, uv.u, uv.v);
  if (cad.shapeOrientation(face) === "reversed") {
    normal.x *= -1;
    normal.y *= -1;
    normal.z *= -1;
  }
  const length = Math.hypot(normal.x, normal.y, normal.z) || 1;
  return { x: normal.x / length, y: normal.y / length, z: normal.z / length };
}

function parseEdgeFaceMap(values: number[]) {
  const map = new Map<number, number[]>();
  for (let index = 0; index + 1 < values.length; ) {
    const edgeHash = values[index++];
    const count = values[index++];
    const faces = values.slice(index, index + count);
    index += count;
    const current = map.get(edgeHash) ?? [];
    faces.forEach((hash) => {
      if (!current.includes(hash)) current.push(hash);
    });
    map.set(edgeHash, current);
  }
  return map;
}

function edgeAngle(cad: OcctKernel, points: number[], faceHashes: number[], faceByHash: Map<number, ShapeHandle>) {
  if (faceHashes.length !== 2 || points.length < 6) return { angle: 0, boundary: faceHashes.length < 2, manifold: false };
  const offset = Math.max(0, Math.floor(points.length / 6) * 3);
  const point = { x: points[offset], y: points[offset + 1], z: points[offset + 2] };
  const faceA = faceByHash.get(faceHashes[0]);
  const faceB = faceByHash.get(faceHashes[1]);
  if (faceA === undefined || faceB === undefined) return { angle: 0, boundary: false, manifold: false };
  try {
    const a = orientedFaceNormal(cad, faceA, point);
    const b = orientedFaceNormal(cad, faceB, point);
    const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
    const rawAngle = (Math.acos(dot) * 180) / Math.PI;
    return { angle: Math.min(rawAngle, 180 - rawAngle), boundary: false, manifold: true };
  } catch {
    return { angle: 0, boundary: false, manifold: false };
  }
}

function meshPartToAsciiStl(part: CadModifierMeshPart) {
  if (!part.positions || !part.indices) throw new Error("The selected object has no mesh data");
  const lines = new Array<string>(part.indices.length / 3 + 2);
  lines[0] = "solid sketchforge";
  const { positions, indices } = part;
  for (let offset = 0, face = 1; offset + 2 < indices.length; offset += 3, face += 1) {
    const ai = indices[offset] * 3;
    const bi = indices[offset + 1] * 3;
    const ci = indices[offset + 2] * 3;
    const ax = positions[ai];
    const ay = positions[ai + 1];
    const az = positions[ai + 2];
    const bx = positions[bi];
    const by = positions[bi + 1];
    const bz = positions[bi + 2];
    const cx = positions[ci];
    const cy = positions[ci + 1];
    const cz = positions[ci + 2];
    const abx = bx - ax;
    const aby = by - ay;
    const abz = bz - az;
    const acx = cx - ax;
    const acy = cy - ay;
    const acz = cz - az;
    let nx = aby * acz - abz * acy;
    let ny = abz * acx - abx * acz;
    let nz = abx * acy - aby * acx;
    const length = Math.hypot(nx, ny, nz) || 1;
    nx /= length;
    ny /= length;
    nz /= length;
    lines[face] = `facet normal ${nx} ${ny} ${nz}\n outer loop\n  vertex ${ax} ${ay} ${az}\n  vertex ${bx} ${by} ${bz}\n  vertex ${cx} ${cy} ${cz}\n endloop\nendfacet`;
  }
  lines[lines.length - 1] = "endsolid sketchforge";
  return lines.join("\n");
}

function reconstructSolid(cad: OcctKernel, part: CadModifierMeshPart) {
  if (part.brep) {
    let exact = cad.fromBREP(part.brep);
    if (part.brepTransform?.length === 12) exact = cad.generalTransform(exact, part.brepTransform);
    const restoredSolids = cad.getSubShapes(exact, "solid");
    if (cad.isValid(exact) && (cad.isSolid(exact) || restoredSolids.length > 0)) {
      return restoredSolids.length === 1 ? restoredSolids[0] : exact;
    }
    exact = cad.fixShape(exact);
    exact = cad.fixFaceOrientations(exact);
    if (cad.isSolid(exact)) exact = cad.healSolid(exact, 1e-5);
    const healedSolids = cad.getSubShapes(exact, "solid");
    if (cad.isValid(exact) && (cad.isSolid(exact) || healedSolids.length > 0)) {
      return healedSolids.length === 1 ? healedSolids[0] : exact;
    }
    throw new Error("The stored CAD feature could not be restored as a valid solid");
  }
  const imported = cad.importStl(meshPartToAsciiStl(part));
  let shape = cad.fixShape(imported);
  if (cad.isSolid(shape)) {
    try {
      shape = cad.healSolid(shape, 1e-4);
      shape = cad.fixFaceOrientations(shape);
      shape = cad.removeDegenerateEdges(shape);
      shape = cad.unifySameDomain(shape);
    } catch {
      // Fall through to face sewing when the imported solid cannot be healed directly.
    }
    if (cad.isSolid(shape) && cad.isValid(shape)) return shape;
  }

  const faces = cad.getSubShapes(imported, "face");
  if (faces.length === 0) throw new Error("The selected object has no closed faces");
  for (const tolerance of [1e-5, 1e-4, 1e-3, 1e-2]) {
    try {
      let candidate = cad.sewAndSolidify(faces, tolerance);
      candidate = cad.fixShape(candidate);
      if (cad.isSolid(candidate)) candidate = cad.healSolid(candidate, tolerance);
      candidate = cad.fixFaceOrientations(candidate);
      candidate = cad.removeDegenerateEdges(candidate);
      candidate = cad.unifySameDomain(candidate);
      if (cad.isSolid(candidate) && cad.isValid(candidate)) return candidate;
    } catch {
      // Try the next tolerance. Curved tessellations can need looser vertex sewing.
    }
  }
  throw new Error("The selected mesh is open or non-manifold. Repair it before adding edge treatments.");
}

function reconstructParts(cad: OcctKernel, parts: CadModifierMeshPart[]) {
  const solids = parts.filter((part) => !part.hole).map((part) => reconstructSolid(cad, part));
  const holes = parts.filter((part) => part.hole).map((part) => reconstructSolid(cad, part));
  if (solids.length === 0) throw new Error("The group has no solid body to modify");
  let result = solids[0];
  for (let index = 1; index < solids.length; index += 1) {
    result = cad.fuse(result, solids[index]);
    result = cad.simplify(result);
    result = cad.unifySameDomain(result);
  }
  for (const hole of holes) {
    result = cad.cut(result, hole);
    result = cad.simplify(result);
    result = cad.unifySameDomain(result);
  }
  result = cad.fixShape(result);
  result = cad.simplify(result);
  result = cad.unifySameDomain(result);
  if (!cad.isValid(result)) throw new Error("The grouped solid could not be repaired into valid topology");
  return result;
}

function collectEdges(cad: OcctKernel, shape: ShapeHandle, sharpAngle: number) {
  const handles = cad.getSubShapes(shape, "edge");
  const faces = cad.getSubShapes(shape, "face");
  const faceByHash = new Map(faces.map((face) => [cad.hashCode(face, HASH_UPPER_BOUND), face]));
  const adjacentFaces = parseEdgeFaceMap(cad.edgeToFaceMap(shape, HASH_UPPER_BOUND));
  const wire = cad.wireframe(shape, CAD_EDGE_WIREFRAME_DEFLECTION);
  const pointsByHash = new Map<number, number[]>();
  for (let index = 0; index + 2 < wire.edgeGroups.length; index += 3) {
    const start = wire.edgeGroups[index];
    const count = wire.edgeGroups[index + 1];
    const hash = wire.edgeGroups[index + 2];
    if (!pointsByHash.has(hash)) pointsByHash.set(hash, Array.from(wire.points.slice(start, start + count)));
  }

  const edges: CollectedCadEdge[] = handles.map((handle, id) => {
    const hash = cad.hashCode(handle, HASH_UPPER_BOUND);
    const faceHashes = adjacentFaces.get(hash) ?? [];
    const points = pointsByHash.get(hash) ?? [];
    const classification = edgeAngle(cad, points, faceHashes, faceByHash);
    const surfaceTypes = faceHashes
      .map((faceHash) => faceByHash.get(faceHash))
      .filter((face): face is ShapeHandle => face !== undefined)
      .map((face) => {
        try {
          return cad.surfaceType(face);
        } catch {
          return "unknown";
        }
      });
    let curveType = "line";
    try {
      curveType = cad.curveType(handle);
    } catch {
      curveType = "unknown";
    }
    return { id, points, ...classification, curveType, surfaceTypes };
  }).filter((edge) => edge.points.length >= 6);
  const selectableEdgeIds = edges.filter((edge) => edge.manifold && !edge.boundary && edge.angle + 1e-3 >= sharpAngle).map((edge) => edge.id);
  const displayEdges = cadDisplayEdgesFromCollected(edges);
  return { handles, edges: edges.map(({ curveType: _curveType, surfaceTypes: _surfaceTypes, ...edge }) => edge), selectableEdgeIds, displayEdges };
}

function cadDisplayEdgesFromCollected(edges: CollectedCadEdge[]): CadModifierDisplayEdge[] {
  return edges
    .filter((edge) => {
      if (!edge.manifold || edge.boundary || edge.points.length < 6) return false;
      const effectiveAngle = Math.min(edge.angle, 180 - edge.angle);
      const touchesCurvedSurface = edge.surfaceTypes.some((surfaceType) => CURVED_SURFACE_TYPES.has(surfaceType));
      const isCurvedEdge = edge.curveType !== "line";
      return effectiveAngle + 1e-3 >= CAD_DISPLAY_EDGE_MIN_ANGLE || touchesCurvedSurface || isCurvedEdge;
    })
    .map((edge) => ({ points: edge.points }));
}

function tessellationOptions(quality: CadModifierQuality, amount: number) {
  if (quality === "draft") return { linearDeflection: Math.max(0.12, amount / 3), angularDeflection: 0.42 };
  if (quality === "fine") return { linearDeflection: Math.max(0.025, amount / 12), angularDeflection: 0.1 };
  return { linearDeflection: Math.max(0.055, amount / 7), angularDeflection: 0.2 };
}

self.onmessage = async (event: MessageEvent<CadModifierWorkerRequest>) => {
  const request = event.data;
  try {
    const cad = await kernel();
    if (request.type === "dispose") {
      releaseSession(cad);
      post({ type: "disposed", requestId: request.requestId });
      return;
    }
    if (request.type === "prepare") {
      releaseSession(cad);
      baseShape = reconstructParts(cad, request.parts);
      const collected = collectEdges(cad, baseShape, request.sharpAngle);
      edgeHandles = collected.handles;
      baseSolids = cad.isSolid(baseShape) ? [baseShape] : cad.getSubShapes(baseShape, "solid");
      if (baseSolids.length === 0) throw new Error("The selected group contains no closed solid components");
      const ownerHashes = baseSolids.map((solid) => new Set(cad.getSubShapes(solid, "edge").map((edge) => cad.hashCode(edge, HASH_UPPER_BOUND))));
      edgeOwners = edgeHandles.map((edge) => {
        const hash = cad.hashCode(edge, HASH_UPPER_BOUND);
        return Math.max(0, ownerHashes.findIndex((hashes) => hashes.has(hash)));
      });
      post({
        type: "ready",
        requestId: request.requestId,
        edges: collected.edges,
        selectableEdgeIds: collected.selectableEdgeIds,
        sourceType: cad.getShapeType(baseShape),
      });
      return;
    }
    if (baseShape === null) throw new Error("Prepare an object before previewing the modifier");
    const selected = request.edgeIds.map((id) => ({ edge: edgeHandles[id], owner: edgeOwners[id] })).filter((entry): entry is { edge: ShapeHandle; owner: number } => entry.edge !== undefined);
    if (selected.length === 0) throw new Error("Select at least one highlighted edge");
    const componentResults = baseSolids.map((solid, owner) => {
      const componentEdges = selected.filter((entry) => entry.owner === owner).map((entry) => entry.edge);
      if (componentEdges.length === 0) return cad.copy(solid);
      return request.kind === "fillet"
        ? cad.fillet(solid, componentEdges, request.amount)
        : Math.abs(request.chamferAngle - 45) < 0.001
          ? cad.chamfer(solid, componentEdges, request.amount)
          : cad.chamferDistAngle(solid, componentEdges, request.amount, request.chamferAngle);
    });
    const result = componentResults.length === 1 ? componentResults[0] : cad.makeCompound(componentResults);
    if (!cad.isValid(result)) throw new Error("The chosen size creates invalid or overlapping edge geometry");
    const mesh = cad.tessellate(result, tessellationOptions(request.quality, request.amount));
    const displayEdges = collectEdges(cad, result, request.chamferAngle).displayEdges;
    const brep = cad.toBREP(result);
    componentResults.forEach((component) => cad.release(component));
    if (componentResults.length > 1) cad.release(result);
    post(
      { type: "preview", requestId: request.requestId, positions: mesh.positions, normals: mesh.normals, indices: mesh.indices, triangleCount: mesh.triangleCount, brep, displayEdges },
      [mesh.positions.buffer, mesh.normals.buffer, mesh.indices.buffer],
    );
  } catch (error) {
    const rawMessage = error instanceof Error ? error.message : "";
    const message = request.type === "preview" && (rawMessage.includes("WebAssembly.Exception") || rawMessage.includes("fillet:") || rawMessage.includes("chamfer:"))
      ? `The selected edges cannot be ${request.kind === "fillet" ? "filleted" : "chamfered"} together at this size. Reduce the size or select fewer connected edges.`
      : rawMessage || "The CAD kernel could not complete this edge treatment";
    post({ type: "error", requestId: request.requestId, message });
  }
};

export {};
