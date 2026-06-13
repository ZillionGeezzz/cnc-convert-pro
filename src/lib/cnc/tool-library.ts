import {
  ToolDefinition,
  ToolType,
  ToolMaterial,
  OperationType,
  ToolParams,
  WorkpieceMaterial,
} from "./types";

/** Predefined tool library */
const TOOLS: ToolDefinition[] = [
  // END MILLS
  {
    id: "em-flat-6",
    number: 1,
    name: "6mm Flat End Mill",
    type: "endmill-flat",
    diameter: 6,
    flutes: 4,
    length: 50,
    material: "carbide",
    maxRPM: 18000,
    defaultParams: {
      roughing: { feedRate: 1200, spindleSpeed: 8000, depthOfCut: 1.5, stepover: 3, coolant: "flood" },
      finishing: { feedRate: 800, spindleSpeed: 10000, depthOfCut: 0.3, stepover: 0.3, coolant: "flood" },
      slotting: { feedRate: 600, spindleSpeed: 7000, depthOfCut: 0.8, coolant: "flood" },
    },
  },
  {
    id: "em-flat-10",
    number: 2,
    name: "10mm Flat End Mill",
    type: "endmill-flat",
    diameter: 10,
    flutes: 4,
    length: 60,
    material: "carbide",
    maxRPM: 16000,
    defaultParams: {
      roughing: { feedRate: 1500, spindleSpeed: 7000, depthOfCut: 2, stepover: 5, coolant: "flood" },
      finishing: { feedRate: 1000, spindleSpeed: 9000, depthOfCut: 0.4, stepover: 0.4, coolant: "flood" },
      slotting: { feedRate: 800, spindleSpeed: 6000, depthOfCut: 1, coolant: "flood" },
    },
  },
  {
    id: "em-ball-6",
    number: 3,
    name: "6mm Ball Nose End Mill",
    type: "endmill-ball",
    diameter: 6,
    flutes: 2,
    length: 50,
    material: "carbide",
    maxRPM: 20000,
    defaultParams: {
      roughing: { feedRate: 1000, spindleSpeed: 9000, depthOfCut: 0.8, stepover: 2, coolant: "flood" },
      finishing: { feedRate: 600, spindleSpeed: 12000, depthOfCut: 0.2, stepover: 0.2, coolant: "mist" },
    },
  },
  {
    id: "em-ball-3",
    number: 4,
    name: "3mm Ball Nose End Mill",
    type: "endmill-ball",
    diameter: 3,
    flutes: 2,
    length: 40,
    material: "carbide",
    maxRPM: 24000,
    defaultParams: {
      roughing: { feedRate: 800, spindleSpeed: 12000, depthOfCut: 0.5, stepover: 1.2, coolant: "flood" },
      finishing: { feedRate: 500, spindleSpeed: 15000, depthOfCut: 0.15, stepover: 0.15, coolant: "mist" },
    },
  },
  {
    id: "em-corner-10",
    number: 5,
    name: "10mm Corner Radius End Mill (R1)",
    type: "endmill-corner",
    diameter: 10,
    flutes: 4,
    length: 60,
    material: "carbide",
    maxRPM: 16000,
    defaultParams: {
      roughing: { feedRate: 1400, spindleSpeed: 7500, depthOfCut: 2, stepover: 4, coolant: "flood" },
      finishing: { feedRate: 900, spindleSpeed: 9500, depthOfCut: 0.35, stepover: 0.35, coolant: "flood" },
    },
  },

  // FACE MILLS
  {
    id: "fm-50",
    number: 6,
    name: "50mm Face Mill",
    type: "face-mill",
    diameter: 50,
    flutes: 6,
    length: 40,
    material: "coated-carbide",
    maxRPM: 12000,
    defaultParams: {
      "face-milling": { feedRate: 2000, spindleSpeed: 5000, depthOfCut: 1.5, stepover: 35, coolant: "flood" },
      roughing: { feedRate: 1800, spindleSpeed: 4500, depthOfCut: 2, stepover: 30, coolant: "flood" },
    },
  },
  {
    id: "fm-32",
    number: 7,
    name: "32mm Face Mill",
    type: "face-mill",
    diameter: 32,
    flutes: 5,
    length: 35,
    material: "coated-carbide",
    maxRPM: 14000,
    defaultParams: {
      "face-milling": { feedRate: 1600, spindleSpeed: 6000, depthOfCut: 1.2, stepover: 22, coolant: "flood" },
    },
  },

  // DRILLS
  {
    id: "drill-spot-3",
    number: 8,
    name: "3mm Spot Drill (90°)",
    type: "drill-spot",
    diameter: 3,
    length: 30,
    material: "carbide",
    maxRPM: 15000,
    defaultParams: {
      drilling: { feedRate: 150, spindleSpeed: 8000, depthOfCut: 1.5, coolant: "flood", description: "Spot drilling depth 1-2mm" },
    },
  },
  {
    id: "drill-5",
    number: 9,
    name: "5mm Twist Drill",
    type: "drill-twist",
    diameter: 5,
    length: 60,
    material: "hss",
    maxRPM: 6000,
    defaultParams: {
      drilling: { feedRate: 180, spindleSpeed: 3500, depthOfCut: 2.5, peckDepth: 2, coolant: "flood" },
    },
  },
  {
    id: "drill-8",
    number: 10,
    name: "8mm Twist Drill",
    type: "drill-twist",
    diameter: 8,
    length: 75,
    material: "hss",
    maxRPM: 5000,
    defaultParams: {
      drilling: { feedRate: 220, spindleSpeed: 2500, depthOfCut: 4, peckDepth: 3, coolant: "flood" },
    },
  },
  {
    id: "drill-10",
    number: 11,
    name: "10mm Twist Drill",
    type: "drill-twist",
    diameter: 10,
    length: 85,
    material: "coated-carbide",
    maxRPM: 8000,
    defaultParams: {
      drilling: { feedRate: 350, spindleSpeed: 4500, depthOfCut: 5, peckDepth: 3, coolant: "flood" },
    },
  },
  {
    id: "drill-center-2",
    number: 12,
    name: "2mm Center Drill (60°)",
    type: "drill-center",
    diameter: 2,
    length: 25,
    material: "hss",
    maxRPM: 8000,
    defaultParams: {
      drilling: { feedRate: 100, spindleSpeed: 4000, depthOfCut: 2, coolant: "flood", description: "Center drill depth 2-3mm" },
    },
  },

  // TAPS
  {
    id: "tap-m6",
    number: 13,
    name: "M6×1.0 Tap",
    type: "tap",
    diameter: 6,
    length: 45,
    material: "hss",
    maxRPM: 1000,
    defaultParams: {
      tapping: { feedRate: 500, spindleSpeed: 500, depthOfCut: 15, coolant: "flood", description: "M6×1.0 — feed = spindle speed × pitch" },
    },
  },
  {
    id: "tap-m8",
    number: 14,
    name: "M8×1.25 Tap",
    type: "tap",
    diameter: 8,
    length: 50,
    material: "hss",
    maxRPM: 800,
    defaultParams: {
      tapping: { feedRate: 625, spindleSpeed: 500, depthOfCut: 18, coolant: "flood", description: "M8×1.25 — feed = spindle speed × pitch" },
    },
  },

  // BORING BARS
  {
    id: "boring-20",
    number: 15,
    name: "20mm Boring Bar",
    type: "boring-bar",
    diameter: 20,
    length: 80,
    material: "carbide",
    maxRPM: 6000,
    defaultParams: {
      boring: { feedRate: 200, spindleSpeed: 3000, depthOfCut: 0.3, stepover: 0.15, coolant: "flood" },
      finishing: { feedRate: 150, spindleSpeed: 4000, depthOfCut: 0.15, stepover: 0.1, coolant: "flood" },
    },
  },

  // REAMERS
  {
    id: "ream-10h7",
    number: 16,
    name: "10mm H7 Reamer",
    type: "reamer",
    diameter: 10,
    flutes: 6,
    length: 70,
    material: "carbide",
    maxRPM: 6000,
    defaultParams: {
      reaming: { feedRate: 300, spindleSpeed: 2500, depthOfCut: 0.15, coolant: "flood", description: "Remove max 0.15mm for H7 finish" },
    },
  },

  // CHAMFER MILLS
  {
    id: "chamfer-6",
    number: 17,
    name: "6mm Chamfer Mill (90°)",
    type: "chamfer-mill",
    diameter: 6,
    flutes: 2,
    length: 40,
    material: "carbide",
    maxRPM: 15000,
    defaultParams: {
      chamfering: { feedRate: 800, spindleSpeed: 8000, depthOfCut: 0.5, coolant: "mist", description: "Chamfer width = depth × 2" },
    },
  },
  {
    id: "chamfer-12",
    number: 18,
    name: "12mm Chamfer Mill (90°)",
    type: "chamfer-mill",
    diameter: 12,
    flutes: 3,
    length: 50,
    material: "carbide",
    maxRPM: 12000,
    defaultParams: {
      chamfering: { feedRate: 1000, spindleSpeed: 7000, depthOfCut: 0.75, coolant: "flood" },
    },
  },

  // THREAD MILLS
  {
    id: "thread-m6",
    number: 19,
    name: "M6 Thread Mill",
    type: "thread-mill",
    diameter: 5,
    flutes: 3,
    length: 30,
    material: "carbide",
    maxRPM: 15000,
    defaultParams: {
      "thread-milling": { feedRate: 600, spindleSpeed: 8000, depthOfCut: 6, coolant: "mist", description: "M6×1.0 thread mill, single pass" },
    },
  },
  {
    id: "thread-m8",
    number: 20,
    name: "M8 Thread Mill",
    type: "thread-mill",
    diameter: 6.5,
    flutes: 3,
    length: 35,
    material: "carbide",
    maxRPM: 13000,
    defaultParams: {
      "thread-milling": { feedRate: 700, spindleSpeed: 7000, depthOfCut: 8, coolant: "mist", description: "M8×1.25 thread mill, single pass" },
    },
  },

  // SLOT DRILLS
  {
    id: "slot-6",
    number: 21,
    name: "6mm Slot Drill",
    type: "slot-drill",
    diameter: 6,
    flutes: 2,
    length: 45,
    material: "carbide",
    maxRPM: 16000,
    defaultParams: {
      slotting: { feedRate: 700, spindleSpeed: 8000, depthOfCut: 0.5, coolant: "flood" },
      roughing: { feedRate: 900, spindleSpeed: 7000, depthOfCut: 1, stepover: 3, coolant: "flood" },
    },
  },
];

export function getTools(): ToolDefinition[] {
  return [...TOOLS];
}

export function getToolById(id: string): ToolDefinition | undefined {
  return TOOLS.find((t) => t.id === id);
}

export function getToolByNumber(num: number): ToolDefinition | undefined {
  return TOOLS.find((t) => t.number === num);
}

export function getToolsByType(type: ToolType): ToolDefinition[] {
  return TOOLS.filter((t) => t.type === type);
}

/**
 * Generate a CNC program for a specific tool operation
 */
export function generateToolProgram(
  tool: ToolDefinition,
  operation: OperationType,
  params: ToolParams,
  targetFormat: "siemens-840d" | "mitsubishi-m80",
  options?: {
    programNumber?: number;
    x?: number;
    y?: number;
    z?: number;
    depth?: number;
  },
): string {
  const progNum = options?.programNumber || 1;
  const x = options?.x ?? 50;
  const y = options?.y ?? 50;
  const z = options?.z ?? 0;
  const depth = options?.depth ?? 10;
  const { feedRate, spindleSpeed, depthOfCut, peckDepth } = params;

  const lines: string[] = [];
  const isSiemens = targetFormat === "siemens-840d";
  const isMitsubishi = targetFormat === "mitsubishi-m80";

  // Program header
  if (isSiemens) {
    lines.push(`%_N_${tool.name.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}_MPF`);
    lines.push(`;${tool.name} — ${operation}`);
    lines.push(`;Tool: T${tool.number} D=${tool.diameter}mm`);
  } else {
    lines.push(`O${String(progNum).padStart(4, "0")}`);
    lines.push(`(${tool.name} — ${operation})`);
    lines.push(`(Tool: T${tool.number} D=${tool.diameter}mm)`);
  }

  // Safety block
  if (isSiemens) {
    lines.push("G90 G71 G17 G40 G94");
    lines.push(`T${tool.number}`);
    lines.push(`S=${Math.round(spindleSpeed)} M3 M8`);
    lines.push(`G0 X${x} Y${y}`);
    lines.push(`Z=${z + 2}`);
    lines.push(`F=${feedRate}`);
  } else {
    lines.push("G90 G21 G17 G40 G94");
    lines.push(`T${String(tool.number).padStart(2, "0")} M6`);
    lines.push(`S${Math.round(spindleSpeed)} M3 M8`);
    lines.push(`G00 X${x} Y${y}`);
    lines.push(`Z${z + 2}`);
    lines.push(`F${feedRate}`);
  }

  // Operation-specific code
  switch (operation) {
    case "drilling":
    case "tapping":
      if (isSiemens) {
        // Use Siemens cycles
        const peck = peckDepth || depthOfCut;
        if (operation === "tapping") {
          lines.push(`CYCLE84(${z + 2},${z},1,${Math.abs(depth)},0,,3,,${tool.diameter > 6 ? 1.5 : 1},,,)`);
        } else if (peck > 0 && peck < Math.abs(depth)) {
          lines.push(`CYCLE83(${z + 2},${z},1,${Math.abs(depth)},0,,${peck},,,,,)`);
        } else {
          lines.push(`CYCLE81(${z + 2},${z},1,${Math.abs(depth)})`);
        }
        lines.push(`G0 Z${z + 5}`);
      } else {
        const gCode = operation === "tapping" ? "G84" : (peckDepth && peckDepth < Math.abs(depth) ? "G83" : "G81");
        const feed = operation === "tapping" ? Math.round(spindleSpeed * (tool.diameter > 6 ? 1.25 : 1)) : feedRate;
        lines.push(`${gCode} X${x} Y${y} Z${z - depth} R${z + 2} ${peckDepth && peckDepth < Math.abs(depth) ? `Q${peckDepth}` : ""} F${feed}`);
        lines.push("G80");
      }
      break;

    case "roughing":
    case "face-milling":
    case "slotting":
      if (isSiemens) {
        lines.push(`G1 Z=${z - depthOfCut}`);
        lines.push(`X${x + 20}`);
        lines.push(`Y${y + 20}`);
        lines.push(`Z=${z + 2}`);
      } else {
        lines.push(`G01 Z${z - depthOfCut}`);
        lines.push(`X${x + 20}`);
        lines.push(`Y${y + 20}`);
        lines.push(`Z${z + 2}`);
      }
      break;

    case "finishing":
      if (isSiemens) {
        lines.push(`G1 Z=${z - depthOfCut}`);
        lines.push(`X${x + 10}`);
        lines.push(`Z=${z + 2}`);
      } else {
        lines.push(`G01 Z${z - depthOfCut}`);
        lines.push(`X${x + 10}`);
        lines.push(`Z${z + 2}`);
      }
      break;

    case "chamfering":
      if (isSiemens) {
        lines.push(`G1 Z=${z - depthOfCut}`);
        lines.push(`X${x + 5}`);
        lines.push(`Z=${z + 2}`);
      } else {
        lines.push(`G01 Z${z - depthOfCut}`);
        lines.push(`X${x + 5}`);
        lines.push(`Z${z + 2}`);
      }
      break;

    default:
      // Generic approach
      if (isSiemens) {
        lines.push(`G1 Z=${z - depthOfCut}`);
        lines.push(`X${x + 15} Y${y + 10}`);
        lines.push(`Z=${z + 2}`);
      } else {
        lines.push(`G01 Z${z - depthOfCut}`);
        lines.push(`X${x + 15} Y${y + 10}`);
        lines.push(`Z${z + 2}`);
      }
      break;
  }

  // Retract and end
  if (isSiemens) {
    lines.push("G0 Z100");
    lines.push("M5 M9");
    lines.push("M02");
    lines.push("%");
  } else {
    lines.push("G00 Z100");
    lines.push("M5 M9");
    lines.push("M02");
    lines.push("%");
  }

  return lines.join("\n");
}
