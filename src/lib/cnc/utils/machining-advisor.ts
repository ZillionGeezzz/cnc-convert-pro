import {
  ToolDefinition,
  WorkpieceMaterial,
  calculateRPM,
  calculateFeedRate,
  getSFMForMaterial,
  getChipLoadForMaterial
} from "../types";

export interface MachiningRecommendation {
  spindleSpeed: number; // RPM
  feedRate: number;    // mm/min
  sfmUsed: number;
  chipLoadUsed: number;
  message?: string;
}

/**
 * Provides machining recommendations based on tool and material.
 */
export function getMachiningRecommendation(
  tool: ToolDefinition,
  material: WorkpieceMaterial,
  targetFinish: "roughing" | "finishing" = "roughing"
): MachiningRecommendation {
  const sfmRange = getSFMForMaterial(material);
  const chipLoadRange = getChipLoadForMaterial(material);

  // Select target SFM and chip load based on finish
  let sfm = targetFinish === "finishing" ? sfmRange.max : (sfmRange.min + sfmRange.max) / 2;
  let chipLoad = targetFinish === "finishing" ? chipLoadRange.min : (chipLoadRange.min + chipLoadRange.max) / 2;

  // Tool specific adjustments
  if (tool.material === "hss" || tool.material === "coated-hss") {
    sfm *= 0.5; // HSS is much slower than carbide
  }

  if (tool.type === "drill-twist") {
    sfm *= 0.8; // Drills run a bit slower
  }

  let rpm = calculateRPM(sfm, tool.diameter);

  // Respect tool max RPM
  if (tool.maxRPM && rpm > tool.maxRPM) {
    rpm = tool.maxRPM;
    sfm = (rpm * (tool.diameter / 25.4)) / 3.82;
  }

  const feedRate = calculateFeedRate(rpm, tool.flutes || 2, chipLoad);

  return {
    spindleSpeed: rpm,
    feedRate: feedRate,
    sfmUsed: Math.round(sfm),
    chipLoadUsed: parseFloat(chipLoad.toFixed(4)),
    message: `Calculated for ${material} using ${tool.name}`,
  };
}
