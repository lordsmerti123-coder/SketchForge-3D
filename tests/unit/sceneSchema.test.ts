import { describe, expect, it } from "vitest";
import { SHAPE_KINDS, shapesArraySchema, toWorkplaneShapes, type ShapeInput } from "../../apps/mcp/src/shapes";

describe("MCP scene schema + normalisation", () => {
  it("exposes all 18 shape kinds", () => {
    expect(SHAPE_KINDS).toHaveLength(18);
    expect(SHAPE_KINDS).toContain("box");
    expect(SHAPE_KINDS).toContain("mesh");
  });

  it("accepts a minimal valid shape and fills defaults via the app's defaulter", () => {
    const parsed = shapesArraySchema.parse([{ kind: "box", width: 40, depth: 40, height: 10 }]);
    const [shape] = toWorkplaneShapes(parsed as ShapeInput[]);
    expect(shape.kind).toBe("box");
    expect(typeof shape.color).toBe("string"); // auto-filled
    expect(shape.color.length).toBeGreaterThan(0);
    expect(typeof shape.size).toBe("number"); // derived by sceneShape
    expect(typeof shape.id).toBe("string");
    expect(shape.name).toBeTruthy();
  });

  it("preserves a cutter (hole: true) and grouped parts", () => {
    const [shape] = toWorkplaneShapes(
      shapesArraySchema.parse([
        {
          kind: "box",
          width: 40,
          depth: 40,
          height: 10,
          groupedShapes: [{ kind: "cylinder", hole: true, width: 8, depth: 8, height: 12 }],
        },
      ]) as ShapeInput[],
    );
    expect(shape.groupedShapes).toHaveLength(1);
    expect(shape.groupedShapes?.[0]?.hole).toBe(true);
  });

  it("rejects an invalid ShapeKind", () => {
    const result = shapesArraySchema.safeParse([{ kind: "banana", width: 1, depth: 1, height: 1 }]);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(JSON.stringify(result.error.issues)).toContain("invalid_enum_value");
    }
  });

  it("rejects a malformed numeric field", () => {
    const result = shapesArraySchema.safeParse([{ kind: "box", width: "wide", depth: 10, height: 10 }]);
    expect(result.success).toBe(false);
  });

  it("accepts an extreme shape and canonicalises rotation instead of rejecting", () => {
    const parsed = shapesArraySchema.parse([{ kind: "box", width: 100000, depth: 100000, height: 100000, rotation: 725 }]);
    const [shape] = toWorkplaneShapes(parsed as ShapeInput[]);
    expect(shape.rotation).toBe(5); // 725 mod 360 via canonicalizeShape, not rejected
    expect(shape.width).toBe(100000); // magnitude not range-rejected
  });
});
