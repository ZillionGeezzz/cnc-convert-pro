import { describe, it, expect } from "vitest";
import { getMachiningRecommendation } from "./machining-advisor";
import { ToolDefinition } from "../types";

describe("Machining Advisor", () => {
  const carbideEndMill: Partial<ToolDefinition> = {
    name: "6mm Carbide End Mill",
    diameter: 6,
    flutes: 4,
    material: "carbide",
    type: "endmill-flat",
  };

  it("should provide recommendations for aluminum", () => {
    const rec = getMachiningRecommendation(carbideEndMill as ToolDefinition, "aluminum");
    expect(rec.spindleSpeed).toBeGreaterThan(5000);
    expect(rec.feedRate).toBeGreaterThan(1000);
    expect(rec.sfmUsed).toBeGreaterThan(500);
  });

  it("should provide slower recommendations for alloy steel", () => {
    const rec = getMachiningRecommendation(carbideEndMill as ToolDefinition, "steel-alloy");
    expect(rec.spindleSpeed).toBeLessThan(10000);
    expect(rec.sfmUsed).toBeLessThan(600);
  });

  it("should adjust for HSS material", () => {
    const hssTool: Partial<ToolDefinition> = { ...carbideEndMill, material: "hss" };
    const carbideRec = getMachiningRecommendation(carbideEndMill as ToolDefinition, "aluminum");
    const hssRec = getMachiningRecommendation(hssTool as ToolDefinition, "aluminum");

    expect(hssRec.spindleSpeed).toBeLessThan(carbideRec.spindleSpeed);
  });

  it("should respect tool maxRPM", () => {
    const smallTool: Partial<ToolDefinition> = {
      ...carbideEndMill,
      diameter: 1,
      maxRPM: 20000
    };
    const rec = getMachiningRecommendation(smallTool as ToolDefinition, "aluminum");
    expect(rec.spindleSpeed).toBeLessThanOrEqual(20000);
  });
});
