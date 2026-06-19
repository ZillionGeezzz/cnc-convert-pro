import { describe, it, expect } from "vitest";
import { createGeometryTransformer } from "./geometry";
import { createIRBlock } from "../types";
import { TransformerContext } from "./index";

describe("Geometry Transformer", () => {
  const ctx: TransformerContext = {
    sourceFormat: "fanuc-0i",
    targetFormat: "fanuc-0i",
    sourceFamily: "fanuc",
    targetFamily: "fanuc",
  };

  it("should scale coordinates", () => {
    const transformer = createGeometryTransformer({ scale: { all: 2 } });
    const blocks = [
      createIRBlock("linear", "G1 X10 Y20 Z-5", { target: { x: 10, y: 20, z: -5 } }),
    ];

    const result = transformer(blocks, ctx);
    expect(result[0].target?.x).toBe(20);
    expect(result[0].target?.y).toBe(40);
    expect(result[0].target?.z).toBe(-10);
  });

  it("should mirror coordinates", () => {
    const transformer = createGeometryTransformer({ mirror: { x: true } });
    const blocks = [
      createIRBlock("linear", "G1 X10 Y20", { target: { x: 10, y: 20 } }),
    ];

    const result = transformer(blocks, ctx);
    expect(result[0].target?.x).toBe(-10);
    expect(result[0].target?.y).toBe(20);
  });

  it("should offset coordinates", () => {
    const transformer = createGeometryTransformer({ offset: { x: 5, y: -5 } });
    const blocks = [
      createIRBlock("linear", "G1 X10 Y20", { target: { x: 10, y: 20 } }),
    ];

    const result = transformer(blocks, ctx);
    expect(result[0].target?.x).toBe(15);
    expect(result[0].target?.y).toBe(15);
  });

  it("should transform arc centers (I, J) without offset", () => {
    const transformer = createGeometryTransformer({ scale: { all: 2 }, offset: { x: 100, y: 100 } });
    const blocks = [
      createIRBlock("clockwise-arc", "G2 X20 Y20 I5 J0", { target: { x: 20, y: 20, i: 5, j: 0 } }),
    ];

    const result = transformer(blocks, ctx);
    expect(result[0].target?.x).toBe(140); // (20 * 2) + 100
    expect(result[0].target?.i).toBe(10);  // 5 * 2 (no offset)
  });

  it("should transform cycle parameters", () => {
    const transformer = createGeometryTransformer({ scale: { z: 2 } });
    const blocks = [
      createIRBlock("cycle-drill", "G81 Z-10 R2", {
        cycle: { type: "drill", depth: 10, retractPlane: 2, originalCycleId: "G81" }
      }),
    ];

    const result = transformer(blocks, ctx);
    expect(result[0].cycle?.depth).toBe(20);
    expect(result[0].cycle?.retractPlane).toBe(4);
  });
});
