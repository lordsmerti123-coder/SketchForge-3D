import { describe, expect, it } from "vitest";
import { createScrewHoleShape, screwHoleDimensions, type ScrewHoleConfig } from "@/lib/screwHoles";

const m3Socket: ScrewHoleConfig = { metric: "M3", screwLength: 8, head: "socket", fit: "standard", mount: "clearance", depthMode: "through", depth: 20.4 };

describe("screw hole generator", () => {
  it("uses the expected M3 clearance and socket recess dimensions", () => {
    expect(screwHoleDimensions(m3Socket)).toMatchObject({ shaftDiameter: 3.4, headDiameter: 5.7, recessDepth: 3.1, totalDepth: 20.4, countersunk: false });
  });

  it("creates an editable native Hole cutter made from watertight primitives", () => {
    const hole = createScrewHoleShape(m3Socket, { x: 12, z: -8, elevation: -0.4 }, "test-screw-hole");
    expect(hole).toMatchObject({ id: "test-screw-hole", kind: "mesh", hole: true, x: 12, z: -8, elevation: -0.4, height: 20.4, screwHole: m3Socket });
    expect(hole.importedMesh).toBeUndefined();
    expect(hole.groupedShapes).toHaveLength(2);
    expect(hole.groupedShapes?.[0]).toMatchObject({ kind: "cylinder", hole: true, elevation: 0, width: 3.4 });
    expect(hole.groupedShapes?.[0]?.height).toBeCloseTo(17.3);
    expect(hole.groupedShapes?.[1]).toMatchObject({ kind: "cylinder", hole: true, width: 5.7, height: 3.1 });
    expect(hole.groupedShapes?.[1]?.elevation).toBeCloseTo(17.3);
  });

  it("supports a six-sided nut-trap cutter and a countersunk clearance cutter", () => {
    const nutTrap = screwHoleDimensions({ ...m3Socket, mount: "nutTrap" });
    const countersunk = screwHoleDimensions({ ...m3Socket, head: "countersunk" });
    expect(nutTrap.sides).toBe(6);
    expect(nutTrap.headDiameter).toBeGreaterThan(nutTrap.shaftDiameter);
    expect(countersunk.countersunk).toBe(true);
    const countersunkCutter = createScrewHoleShape({ ...m3Socket, head: "countersunk" }, { x: 0, z: 0, elevation: 0 }, "countersink");
    expect(countersunkCutter.groupedShapes).toEqual(expect.arrayContaining([expect.objectContaining({ kind: "cone", hole: true, baseRadius: countersunk.shaftDiameter / 2, topRadius: countersunk.headDiameter / 2 })]));
  });
});
