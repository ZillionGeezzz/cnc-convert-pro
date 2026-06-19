import { describe, it, expect } from "vitest";
import { getToolById, getThreadPitch } from "./tool-library";
import { ToolDefinition } from "./types";

describe("Tool Library - BSPT and Pitch Logic", () => {
  it("should return the correct pitch for standard metric tools", () => {
    const m6: Partial<ToolDefinition> = { name: "M6x1.0 Cutting Tap" };
    expect(getThreadPitch(m6 as ToolDefinition)).toBeCloseTo(1.0);

    const m8: Partial<ToolDefinition> = { name: "M8x1.25 Cutting Tap" };
    expect(getThreadPitch(m8 as ToolDefinition)).toBeCloseTo(1.25);

    const m12: Partial<ToolDefinition> = { name: "M12x1.75 Cutting Tap" };
    expect(getThreadPitch(m12 as ToolDefinition)).toBeCloseTo(1.75);
  });

  it("should return the correct pitch for BSPT tools", () => {
    const bspt18: Partial<ToolDefinition> = { name: "1/8-28 BSPT Pipe Tap" };
    expect(getThreadPitch(bspt18 as ToolDefinition)).toBeCloseTo(25.4 / 28);

    const bspt14: Partial<ToolDefinition> = { name: "1/4-19 BSPT Pipe Tap" };
    expect(getThreadPitch(bspt14 as ToolDefinition)).toBeCloseTo(25.4 / 19);

    const bspt12: Partial<ToolDefinition> = { name: "1/2-14 BSPT Pipe Tap" };
    expect(getThreadPitch(bspt12 as ToolDefinition)).toBeCloseTo(25.4 / 14);

    const bspt1: Partial<ToolDefinition> = { name: "1-11 BSPT Pipe Tap" };
    expect(getThreadPitch(bspt1 as ToolDefinition)).toBeCloseTo(25.4 / 11);
  });

  it("should return the correct pitch for UNC tools", () => {
    const unc14: Partial<ToolDefinition> = { name: "1/4-20 UNC Cutting Tap" };
    expect(getThreadPitch(unc14 as ToolDefinition)).toBeCloseTo(25.4 / 20);

    const unc38: Partial<ToolDefinition> = { name: "3/8-16 UNC Cutting Tap" };
    expect(getThreadPitch(unc38 as ToolDefinition)).toBeCloseTo(25.4 / 16);
  });

  it("should extract pitch from M<N>x<P> pattern", () => {
    const custom: Partial<ToolDefinition> = { name: "M24x3.0 Custom Tap" };
    expect(getThreadPitch(custom as ToolDefinition)).toBeCloseTo(3.0);
  });

  it("should find the new BSPT tools in the library", () => {
    const tool = getToolById("tap-bspt-1-8");
    expect(tool).toBeDefined();
    expect(tool?.name).toBe("1/8-28 BSPT Pipe Tap");
    expect(tool?.diameter).toBe(9.728);
  });
});
