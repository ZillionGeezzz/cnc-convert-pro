import { describe, it, expect } from "vitest";
import { estimateCycleTime } from "./analysis";
import { createIRBlock } from "./types";

describe("Cycle Time Estimation", () => {
  it("should estimate time for linear moves", () => {
    const blocks = [
      createIRBlock("linear", "G1 X100 F600", { target: { x: 100 }, feedRate: 600 }),
    ];
    const estimate = estimateCycleTime(blocks, { initialPosition: { x: 0, y: 0, z: 0 } });

    // Distance 100mm, Feed 600mm/min = 10mm/sec. 100/10 = 10 seconds.
    expect(estimate.feedTimeSeconds).toBeCloseTo(10);
    expect(estimate.totalTimeSeconds).toBeCloseTo(10);
  });

  it("should estimate time for rapid moves", () => {
    const blocks = [
      createIRBlock("rapid", "G0 X100", { target: { x: 100 } }),
    ];
    const estimate = estimateCycleTime(blocks, {
      initialPosition: { x: 0, y: 0, z: 0 },
      rapidFeedRate: 10000
    });

    // Distance 100mm, Rapid 10000mm/min = 166.67mm/sec. 100/166.67 = 0.6 seconds.
    expect(estimate.rapidTimeSeconds).toBeCloseTo(0.6);
    expect(estimate.totalTimeSeconds).toBeCloseTo(0.6);
  });

  it("should include dwell time", () => {
    const blocks = [
      createIRBlock("dwell", "G4 P2.5", { dwell: 2.5 }),
    ];
    const estimate = estimateCycleTime(blocks);
    expect(estimate.dwellTimeSeconds).toBe(2.5);
    expect(estimate.totalTimeSeconds).toBe(2.5);
  });

  it("should include tool change time", () => {
    const blocks = [
      createIRBlock("tool-change", "T1 M6", { toolNumber: 1 }),
    ];
    const estimate = estimateCycleTime(blocks, { toolChangeTime: 8 });
    expect(estimate.toolChangeTimeSeconds).toBe(8);
  });

  it("should track position across multiple blocks", () => {
    const blocks = [
      createIRBlock("linear", "G1 X50 F600", { target: { x: 50 }, feedRate: 600 }),
      createIRBlock("linear", "G1 X100", { target: { x: 100 } }),
    ];
    const estimate = estimateCycleTime(blocks, { initialPosition: { x: 0, y: 0, z: 0 } });

    // 50mm + 50mm = 100mm total at 600mm/min = 10 seconds.
    expect(estimate.feedTimeSeconds).toBeCloseTo(10);
  });
});
