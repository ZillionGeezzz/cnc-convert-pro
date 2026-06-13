import { describe, it, expect } from "vitest";
import { resolveCoordinates } from "./resolver";
import { createIRBlock } from "./types";
import type { NeutralIRBlock } from "./types";

function block(overrides: Partial<NeutralIRBlock> = {}): NeutralIRBlock {
  return createIRBlock("rapid", "G00 X10.0", overrides);
}

describe("resolveCoordinates", () => {
  describe("absolute mode (G90) — passthrough", () => {
    it("passes through blocks in absolute mode without modification", () => {
      const blocks = [
        createIRBlock("absolute-mode", "G90"),
        createIRBlock("linear", "G01 X10.0 Y20.0", {
          target: { x: 10, y: 20 },
        }),
        createIRBlock("linear", "G01 X30.0 Y40.0", {
          target: { x: 30, y: 40 },
        }),
      ];

      const result = resolveCoordinates(blocks, {});
      expect(result.resolvedCount).toBe(0);
      expect(result.blocks[1].target).toEqual({ x: 10, y: 20 });
      expect(result.blocks[2].target).toEqual({ x: 30, y: 40 });
    });
  });

  describe("incremental mode (G91) — resolution", () => {
    it("resolves incremental moves to absolute positions", () => {
      const blocks = [
        createIRBlock("incremental-mode", "G91"),
        createIRBlock("linear", "G91 G01 X10.0", {
          target: { x: 10 },
        }),
        createIRBlock("linear", "G91 G01 X5.0 Y10.0", {
          target: { x: 5, y: 10 },
        }),
      ];

      const result = resolveCoordinates(blocks);
      expect(result.resolvedCount).toBe(2);
      expect(result.blocks[1].target).toEqual({ x: 10 });
      expect(result.blocks[2].target).toEqual({ x: 15, y: 10 });
    });

    it("accumulates position across multiple incremental moves", () => {
      const blocks = [
        createIRBlock("incremental-mode", "G91"),
        createIRBlock("linear", "G91 G01 X1.0", { target: { x: 1 } }),
        createIRBlock("linear", "G91 G01 X2.0", { target: { x: 2 } }),
        createIRBlock("linear", "G91 G01 X3.0", { target: { x: 3 } }),
        createIRBlock("linear", "G91 G01 X4.0", { target: { x: 4 } }),
      ];

      const result = resolveCoordinates(blocks);
      expect(result.resolvedCount).toBe(4);
      // Cumulative: 0+1=1, 1+2=3, 3+3=6, 6+4=10
      expect(result.blocks[1].target).toEqual({ x: 1 });
      expect(result.blocks[2].target).toEqual({ x: 3 });
      expect(result.blocks[3].target).toEqual({ x: 6 });
      expect(result.blocks[4].target).toEqual({ x: 10 });
    });

    it("supports initial position parameter", () => {
      const blocks = [
        createIRBlock("incremental-mode", "G91"),
        createIRBlock("linear", "G91 G01 X10.0 Y10.0", {
          target: { x: 10, y: 10 },
        }),
      ];

      const result = resolveCoordinates(blocks, { X: 50, Y: 50 });
      expect(result.blocks[1].target).toEqual({ x: 60, y: 60 });
    });
  });

  describe("mode switching", () => {
    it("handles switching between G90 and G91", () => {
      const blocks = [
        createIRBlock("absolute-mode", "G90"),
        createIRBlock("linear", "G90 G01 X100.0", { target: { x: 100 } }),
        createIRBlock("incremental-mode", "G91"),
        createIRBlock("linear", "G91 G01 X10.0", { target: { x: 10 } }),
        createIRBlock("absolute-mode", "G90"),
        createIRBlock("linear", "G90 G01 X200.0", { target: { x: 200 } }),
      ];

      const result = resolveCoordinates(blocks, { X: 0 });
      // Block 1: G90, absolute → X=100, no resolution
      expect(result.blocks[1].target).toEqual({ x: 100 });
      // Block 2: G91, incremental → X=100+10=110
      expect(result.blocks[3].target).toEqual({ x: 110 });
      expect(result.resolvedCount).toBe(1);
      // Block 5: G90 again → direct absolute
      expect(result.blocks[5].target).toEqual({ x: 200 });
    });
  });

  describe("reference return and program start", () => {
    it("resets position on reference-return", () => {
      const blocks = [
        createIRBlock("incremental-mode", "G91"),
        createIRBlock("linear", "G91 G01 X100.0", { target: { x: 100 } }),
        createIRBlock("reference-return", "G28"),
        createIRBlock("incremental-mode", "G91"),
        createIRBlock("linear", "G91 G01 X10.0", { target: { x: 10 } }),
      ];

      const result = resolveCoordinates(blocks);
      // After reference return, position is cleared → next incremental starts from 0
      expect(result.blocks[4].target).toEqual({ x: 10 });
    });

    it("resets position on program-start", () => {
      const blocks = [
        createIRBlock("incremental-mode", "G91"),
        createIRBlock("linear", "G91 G01 X50.0", { target: { x: 50 } }),
        createIRBlock("program-start", "%"),
        createIRBlock("incremental-mode", "G91"),
        createIRBlock("linear", "G91 G01 X25.0", { target: { x: 25 } }),
      ];

      const result = resolveCoordinates(blocks);
      expect(result.blocks[4].target).toEqual({ x: 25 });
    });
  });

  describe("non-motion blocks", () => {
    it("passes through non-motion blocks unchanged", () => {
      const blocks = [
        createIRBlock("incremental-mode", "G91"),
        createIRBlock("spindle-forward", "M3 S1000", { spindleSpeed: 1000 }),
        createIRBlock("coolant-flood", "M8"),
        createIRBlock("tool-change", "T1 M6", { toolNumber: 1 }),
        createIRBlock("comment", "(some comment)", { comment: "some comment" }),
      ];

      const result = resolveCoordinates(blocks);
      expect(result.resolvedCount).toBe(0);
      expect(result.blocks[1].type).toBe("spindle-forward");
      expect(result.blocks[2].type).toBe("coolant-flood");
      expect(result.blocks[3].type).toBe("tool-change");
      expect(result.blocks[4].type).toBe("comment");
    });
  });

  describe("audit trail", () => {
    it("adds audit entries to resolved blocks", () => {
      const blocks = [
        createIRBlock("incremental-mode", "G91"),
        createIRBlock("linear", "G91 G01 X10.0", { target: { x: 10 } }),
      ];

      const result = resolveCoordinates(blocks);
      const resolved = result.blocks[1];
      expect(resolved.audit.length).toBe(1);
      expect(resolved.audit[0].ruleId).toBe("G91_TO_G90");
      expect(resolved.audit[0].confidence).toBe("exact");
    });

    it("adds transformation entry to incremental-mode blocks", () => {
      const blocks = [
        createIRBlock("incremental-mode", "G91"),
      ];

      const result = resolveCoordinates(blocks);
      expect(result.blocks[0].transformations.length).toBeGreaterThan(0);
      expect(result.blocks[0].transformations[0].ruleId).toBe("G91_MODE");
    });
  });

  describe("helical and arc blocks", () => {
    it("resolves incremental arcs to absolute", () => {
      const blocks = [
        createIRBlock("incremental-mode", "G91"),
        createIRBlock("clockwise-arc", "G91 G02 X10.0 Y5.0", {
          target: { x: 10, y: 5 },
        }),
        createIRBlock("counterclockwise-arc", "G91 G03 X5.0 Y5.0", {
          target: { x: 5, y: 5 },
        }),
        createIRBlock("helical", "G91 G02 X10.0 Z-5.0", {
          target: { x: 10, z: -5 },
        }),
      ];

      const result = resolveCoordinates(blocks);
      expect(result.resolvedCount).toBe(3);
      expect(result.blocks[1].target).toEqual({ x: 10, y: 5 });
      expect(result.blocks[2].target).toEqual({ x: 15, y: 10 });
      expect(result.blocks[3].target).toEqual({ x: 25, z: -5 });
    });
  });

  describe("edge cases", () => {
    it("handles empty blocks array", () => {
      const result = resolveCoordinates([]);
      expect(result.blocks).toEqual([]);
      expect(result.resolvedCount).toBe(0);
    });

    it("handles blocks without targets", () => {
      const blocks = [
        createIRBlock("incremental-mode", "G91"),
        createIRBlock("linear", "G01", {}),
      ];

      const result = resolveCoordinates(blocks);
      expect(result.resolvedCount).toBe(0);
    });

    it("handles negative incremental values correctly", () => {
      const blocks = [
        createIRBlock("incremental-mode", "G91"),
        createIRBlock("linear", "G91 G01 X-10.0", { target: { x: -10 } }),
        createIRBlock("linear", "G91 G01 X-5.0", { target: { x: -5 } }),
      ];

      const result = resolveCoordinates(blocks, { X: 100 });
      expect(result.blocks[1].target).toEqual({ x: 90 });
      expect(result.blocks[2].target).toEqual({ x: 85 });
    });
  });
});
