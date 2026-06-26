import type { ShapeInput } from "./shapes";

// In-context reference scenes the model can copy from. Plain WorkplaneShape inputs:
// dimensions in millimetres, x/z on the workplane, elevation = height above it, a cutter
// is any shape with hole: true. These are intentionally simple and valid.

export const PHONE_STAND_EXAMPLE: { name: string; shapes: ShapeInput[] } = {
  name: "Phone stand",
  shapes: [
    { name: "Base", kind: "box", color: "#0098c7", x: 0, z: 0, elevation: 0, width: 80, depth: 70, height: 8 },
    // Backrest tilted back ~20° so a phone leans against it.
    { name: "Backrest", kind: "box", color: "#0098c7", x: 0, z: -22, elevation: 4, width: 80, depth: 8, height: 70, rotationX: 20 },
    // Lip at the front to stop the phone sliding off.
    { name: "Lip", kind: "box", color: "#0098c7", x: 0, z: 28, elevation: 8, width: 80, depth: 8, height: 14 },
    // Cable slot cut through the base.
    { name: "Cable slot", kind: "cylinder", color: "#d41721", hole: true, x: 0, z: 6, elevation: 0, width: 16, depth: 16, height: 24, radius: 8, sides: 64 },
  ],
};

export const BRACKET_EXAMPLE: { name: string; shapes: ShapeInput[] } = {
  name: "L-bracket with bolt holes",
  shapes: [
    { name: "Base flange", kind: "box", color: "#33983d", x: 0, z: 0, elevation: 0, width: 60, depth: 40, height: 6 },
    { name: "Upright flange", kind: "box", color: "#33983d", x: 0, z: -17, elevation: 6, width: 60, depth: 6, height: 40 },
    { name: "Bolt hole L", kind: "cylinder", color: "#d41721", hole: true, x: -18, z: 8, elevation: 0, width: 8, depth: 8, height: 12, radius: 4, sides: 48 },
    { name: "Bolt hole R", kind: "cylinder", color: "#d41721", hole: true, x: 18, z: 8, elevation: 0, width: 8, depth: 8, height: 12, radius: 4, sides: 48 },
  ],
};

export const EXAMPLE_SCENES = [PHONE_STAND_EXAMPLE, BRACKET_EXAMPLE];
