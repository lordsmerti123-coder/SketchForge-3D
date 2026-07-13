import type { WorkplaneShape, WorkplaneWorkspaceSettings } from "@/types/sketchforge";

const MIN_VISIBLE_GRID_STEP = 1;
const MAX_VISIBLE_GRID_STEP = 200;

export type GridFootprintBounds = {
  minX: number;
  minZ: number;
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function cleanCoordinate(value: number) {
  const rounded = Number(value.toFixed(6));
  return Math.abs(rounded) < 1e-6 ? 0 : rounded;
}

export function visibleGridStep(workspace: WorkplaneWorkspaceSettings) {
  return clamp(workspace.gridBlockSize, MIN_VISIBLE_GRID_STEP, MAX_VISIBLE_GRID_STEP);
}

function nearestVisibleGridLine(value: number, workspaceSize: number, step: number) {
  const gridOrigin = -workspaceSize / 2;
  return gridOrigin + Math.round((value - gridOrigin) / step) * step;
}

export function snapShapeFootprintToVisibleGrid(
  shape: WorkplaneShape,
  bounds: GridFootprintBounds,
  workspace: WorkplaneWorkspaceSettings,
) {
  const step = visibleGridStep(workspace);
  const snappedMinX = nearestVisibleGridLine(bounds.minX, workspace.width, step);
  const snappedMinZ = nearestVisibleGridLine(bounds.minZ, workspace.depth, step);
  return {
    ...shape,
    x: cleanCoordinate(shape.x + snappedMinX - bounds.minX),
    z: cleanCoordinate(shape.z + snappedMinZ - bounds.minZ),
  };
}
