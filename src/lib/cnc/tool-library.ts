import {
  ToolDefinition,
  ToolType,
  ToolMaterial,
  OperationType,
  ToolParams,
  WorkpieceMaterial,
} from "./types";

/**
 * Expanded tool library with 50+ tools covering all 26 tool types.
 * Tools are organized by category with real-world recommended parameters.
 */

const TOOLS: ToolDefinition[] = [
  // ==========================================
  // FLAT END MILLS
  // ==========================================
  {
    id: "em-flat-3",
    number: 1,
    name: "3mm Flat End Mill",
    type: "endmill-flat",
    diameter: 3,
    flutes: 2,
    length: 38,
    lengthOfCut: 8,
    shankDiameter: 3,
    material: "carbide",
    coating: "altin",
    maxRPM: 30000,
    maxDOC: 1.5,
    defaultParams: {
      roughing: { feedRate: 600, spindleSpeed: 18000, depthOfCut: 0.5, stepover: 1.5, coolant: "mist" },
      finishing: { feedRate: 400, spindleSpeed: 22000, depthOfCut: 0.15, stepover: 0.15, coolant: "mist" },
      slotting: { feedRate: 350, spindleSpeed: 16000, depthOfCut: 0.3, coolant: "mist" },
      "trochoidal-milling": { feedRate: 800, spindleSpeed: 20000, depthOfCut: 0.5, stepover: 0.5, coolant: "mist" },
    },
    notes: "Small end mill for detail work and small pockets.",
  },
  {
    id: "em-flat-6",
    number: 2,
    name: "6mm Flat End Mill",
    type: "endmill-flat",
    diameter: 6,
    flutes: 4,
    length: 50,
    lengthOfCut: 13,
    shankDiameter: 6,
    material: "carbide",
    coating: "tialn",
    maxRPM: 20000,
    maxDOC: 3,
    defaultParams: {
      roughing: { feedRate: 1200, spindleSpeed: 8000, depthOfCut: 1.5, stepover: 3, coolant: "flood" },
      finishing: { feedRate: 800, spindleSpeed: 10000, depthOfCut: 0.3, stepover: 0.3, coolant: "flood" },
      slotting: { feedRate: 600, spindleSpeed: 7000, depthOfCut: 0.8, coolant: "flood" },
      "trochoidal-milling": { feedRate: 1800, spindleSpeed: 9000, depthOfCut: 1.5, stepover: 0.8, coolant: "flood" },
    },
    notes: "General purpose 6mm end mill. Most common size for job shops.",
    brand: "Niagara Cutter",
    series: "Stable Carbide",
  },
  {
    id: "em-flat-8",
    number: 3,
    name: "8mm Flat End Mill",
    type: "endmill-flat",
    diameter: 8,
    flutes: 4,
    length: 60,
    lengthOfCut: 19,
    shankDiameter: 8,
    material: "coated-carbide",
    coating: "altin",
    maxRPM: 16000,
    maxDOC: 4,
    defaultParams: {
      roughing: { feedRate: 1600, spindleSpeed: 7000, depthOfCut: 2, stepover: 4, coolant: "flood" },
      finishing: { feedRate: 1000, spindleSpeed: 8500, depthOfCut: 0.4, stepover: 0.4, coolant: "flood" },
      slotting: { feedRate: 800, spindleSpeed: 6000, depthOfCut: 1, coolant: "flood" },
    },
  },
  {
    id: "em-flat-10",
    number: 4,
    name: "10mm Flat End Mill",
    type: "endmill-flat",
    diameter: 10,
    flutes: 4,
    length: 72,
    lengthOfCut: 22,
    shankDiameter: 10,
    material: "coated-carbide",
    coating: "altin",
    maxRPM: 14000,
    maxDOC: 5,
    defaultParams: {
      roughing: { feedRate: 2000, spindleSpeed: 6000, depthOfCut: 2.5, stepover: 5, coolant: "flood" },
      finishing: { feedRate: 1200, spindleSpeed: 7500, depthOfCut: 0.5, stepover: 0.5, coolant: "flood" },
      slotting: { feedRate: 1000, spindleSpeed: 5000, depthOfCut: 1.2, coolant: "flood" },
    },
  },
  {
    id: "em-flat-12",
    number: 5,
    name: "12mm Flat End Mill",
    type: "endmill-flat",
    diameter: 12,
    flutes: 4,
    length: 75,
    lengthOfCut: 26,
    shankDiameter: 12,
    material: "coated-carbide",
    coating: "tialn",
    maxRPM: 12000,
    maxDOC: 6,
    defaultParams: {
      roughing: { feedRate: 2400, spindleSpeed: 5000, depthOfCut: 3, stepover: 6, coolant: "flood" },
      finishing: { feedRate: 1400, spindleSpeed: 6500, depthOfCut: 0.5, stepover: 0.5, coolant: "flood" },
      slotting: { feedRate: 1200, spindleSpeed: 4500, depthOfCut: 1.5, coolant: "flood" },
    },
  },
  {
    id: "em-flat-20",
    number: 6,
    name: "20mm Flat End Mill",
    type: "endmill-flat",
    diameter: 20,
    flutes: 4,
    length: 100,
    lengthOfCut: 38,
    shankDiameter: 20,
    material: "coated-carbide",
    coating: "tialn",
    maxRPM: 10000,
    maxDOC: 10,
    defaultParams: {
      roughing: { feedRate: 3000, spindleSpeed: 4000, depthOfCut: 4, stepover: 10, coolant: "flood" },
      finishing: { feedRate: 1800, spindleSpeed: 5500, depthOfCut: 0.6, stepover: 0.6, coolant: "flood" },
      slotting: { feedRate: 1500, spindleSpeed: 3500, depthOfCut: 2, coolant: "flood" },
    },
  },

  // ==========================================
  // BALL NOSE END MILLS
  // ==========================================
  {
    id: "em-ball-3",
    number: 7,
    name: "3mm Ball Nose End Mill",
    type: "endmill-ball",
    diameter: 3,
    flutes: 2,
    length: 40,
    lengthOfCut: 8,
    shankDiameter: 3,
    material: "carbide",
    coating: "tialn",
    maxRPM: 30000,
    maxDOC: 1.5,
    defaultParams: {
      roughing: { feedRate: 600, spindleSpeed: 15000, depthOfCut: 0.4, stepover: 1.2, coolant: "mist" },
      finishing: { feedRate: 400, spindleSpeed: 20000, depthOfCut: 0.12, stepover: 0.12, coolant: "mist" },
    },
  },
  {
    id: "em-ball-6",
    number: 8,
    name: "6mm Ball Nose End Mill",
    type: "endmill-ball",
    diameter: 6,
    flutes: 2,
    length: 50,
    lengthOfCut: 13,
    shankDiameter: 6,
    material: "carbide",
    coating: "tialn",
    maxRPM: 24000,
    maxDOC: 3,
    defaultParams: {
      roughing: { feedRate: 1000, spindleSpeed: 9000, depthOfCut: 0.8, stepover: 2, coolant: "flood" },
      finishing: { feedRate: 600, spindleSpeed: 12000, depthOfCut: 0.2, stepover: 0.2, coolant: "mist" },
    },
  },
  {
    id: "em-ball-10",
    number: 9,
    name: "10mm Ball Nose End Mill",
    type: "endmill-ball",
    diameter: 10,
    flutes: 2,
    length: 72,
    lengthOfCut: 22,
    shankDiameter: 10,
    material: "coated-carbide",
    coating: "altin",
    maxRPM: 18000,
    maxDOC: 5,
    defaultParams: {
      roughing: { feedRate: 1400, spindleSpeed: 7000, depthOfCut: 1.2, stepover: 3, coolant: "flood" },
      finishing: { feedRate: 800, spindleSpeed: 10000, depthOfCut: 0.25, stepover: 0.25, coolant: "flood" },
    },
  },
  {
    id: "em-ball-12",
    number: 10,
    name: "12mm Ball Nose End Mill",
    type: "endmill-ball",
    diameter: 12,
    flutes: 2,
    length: 75,
    lengthOfCut: 26,
    shankDiameter: 12,
    material: "coated-carbide",
    coating: "tialn",
    maxRPM: 14000,
    maxDOC: 6,
    defaultParams: {
      roughing: { feedRate: 1600, spindleSpeed: 6000, depthOfCut: 1.5, stepover: 4, coolant: "flood" },
      finishing: { feedRate: 1000, spindleSpeed: 8500, depthOfCut: 0.3, stepover: 0.3, coolant: "flood" },
    },
  },

  // ==========================================
  // CORNER RADIUS END MILLS
  // ==========================================
  {
    id: "em-corner-6r05",
    number: 11,
    name: "6mm Corner Radius End Mill (R0.5)",
    type: "endmill-corner",
    subType: "bullnose",
    diameter: 6,
    flutes: 4,
    length: 50,
    lengthOfCut: 13,
    shankDiameter: 6,
    material: "carbide",
    coating: "tialn",
    maxRPM: 20000,
    maxDOC: 3,
    defaultParams: {
      roughing: { feedRate: 1300, spindleSpeed: 8500, depthOfCut: 1.5, stepover: 3.5, coolant: "flood" },
      finishing: { feedRate: 850, spindleSpeed: 10500, depthOfCut: 0.3, stepover: 0.3, coolant: "flood" },
    },
  },
  {
    id: "em-corner-10r1",
    number: 12,
    name: "10mm Corner Radius End Mill (R1.0)",
    type: "endmill-corner",
    subType: "bullnose",
    diameter: 10,
    flutes: 4,
    length: 72,
    lengthOfCut: 22,
    shankDiameter: 10,
    material: "coated-carbide",
    coating: "altin",
    maxRPM: 15000,
    maxDOC: 5,
    defaultParams: {
      roughing: { feedRate: 1800, spindleSpeed: 6500, depthOfCut: 2, stepover: 5, coolant: "flood" },
      finishing: { feedRate: 1100, spindleSpeed: 8000, depthOfCut: 0.4, stepover: 0.4, coolant: "flood" },
    },
  },
  {
    id: "em-corner-12r2",
    number: 13,
    name: "12mm Corner Radius End Mill (R2.0)",
    type: "endmill-corner",
    subType: "bullnose",
    diameter: 12,
    flutes: 4,
    length: 75,
    lengthOfCut: 26,
    shankDiameter: 12,
    material: "coated-carbide",
    coating: "tialn",
    maxRPM: 12000,
    maxDOC: 6,
    defaultParams: {
      roughing: { feedRate: 2200, spindleSpeed: 5500, depthOfCut: 2.5, stepover: 6, coolant: "flood" },
      finishing: { feedRate: 1300, spindleSpeed: 7000, depthOfCut: 0.5, stepover: 0.5, coolant: "flood" },
    },
  },

  // ==========================================
  // TAPERED END MILLS
  // ==========================================
  {
    id: "em-tapered-6",
    number: 14,
    name: "6mm Tapered End Mill (3°)",
    type: "endmill-tapered",
    subType: "3deg",
    diameter: 6,
    diameterMax: 7.2,
    flutes: 2,
    length: 50,
    lengthOfCut: 12,
    shankDiameter: 6,
    material: "carbide",
    coating: "tialn",
    maxRPM: 20000,
    maxDOC: 3,
    defaultParams: {
      finishing: { feedRate: 600, spindleSpeed: 12000, depthOfCut: 0.2, stepover: 0.2, coolant: "mist" },
    },
    notes: "3° taper per side. For mold work and draft angle cutting.",
  },

  // ==========================================
  // ROUGHING END MILLS
  // ==========================================
  {
    id: "em-roughing-12",
    number: 15,
    name: "12mm Roughing End Mill (Corn Cob)",
    type: "endmill-roughing",
    subType: "corn-cob",
    diameter: 12,
    flutes: 4,
    length: 80,
    lengthOfCut: 26,
    shankDiameter: 12,
    material: "coated-carbide",
    coating: "tialn",
    maxRPM: 10000,
    maxDOC: 6,
    defaultParams: {
      roughing: { feedRate: 2800, spindleSpeed: 4500, depthOfCut: 3, stepover: 8, coolant: "flood" },
      "plunge-roughing": { feedRate: 800, spindleSpeed: 3500, depthOfCut: 2, coolant: "flood" },
    },
    notes: "Serrated edge for chip-breaking. Excellent for heavy roughing.",
    brand: "M.A. Ford",
    series: "RoughMax",
  },
  {
    id: "em-roughing-20",
    number: 16,
    name: "20mm Roughing End Mill (Corn Cob)",
    type: "endmill-roughing",
    subType: "corn-cob",
    diameter: 20,
    flutes: 4,
    length: 100,
    lengthOfCut: 38,
    shankDiameter: 20,
    material: "coated-carbide",
    coating: "tialn",
    maxRPM: 8000,
    maxDOC: 10,
    defaultParams: {
      roughing: { feedRate: 3500, spindleSpeed: 3500, depthOfCut: 4, stepover: 12, coolant: "flood" },
    },
  },

  // ==========================================
  // FACE MILLS
  // ==========================================
  {
    id: "fm-32",
    number: 17,
    name: "32mm Face Mill",
    type: "face-mill",
    diameter: 32,
    flutes: 5,
    length: 35,
    shankDiameter: 22,
    material: "coated-carbide",
    coating: "altin",
    maxRPM: 15000,
    maxDOC: 3,
    defaultParams: {
      "face-milling": { feedRate: 1600, spindleSpeed: 6000, depthOfCut: 1.2, stepover: 22, coolant: "flood" },
      roughing: { feedRate: 2000, spindleSpeed: 5000, depthOfCut: 2, stepover: 25, coolant: "flood" },
    },
  },
  {
    id: "fm-50",
    number: 18,
    name: "50mm Face Mill",
    type: "face-mill",
    diameter: 50,
    flutes: 6,
    length: 40,
    shankDiameter: 22,
    material: "coated-carbide",
    coating: "altin",
    maxRPM: 12000,
    maxDOC: 5,
    defaultParams: {
      "face-milling": { feedRate: 2200, spindleSpeed: 4500, depthOfCut: 1.5, stepover: 35, coolant: "flood" },
      roughing: { feedRate: 2800, spindleSpeed: 4000, depthOfCut: 2.5, stepover: 35, coolant: "flood" },
    },
  },
  {
    id: "fm-80",
    number: 19,
    name: "80mm Face Mill",
    type: "face-mill",
    diameter: 80,
    flutes: 8,
    length: 50,
    shankDiameter: 27,
    material: "coated-carbide",
    coating: "tialn",
    maxRPM: 8000,
    maxDOC: 6,
    defaultParams: {
      "face-milling": { feedRate: 3000, spindleSpeed: 3000, depthOfCut: 2, stepover: 55, coolant: "flood" },
      roughing: { feedRate: 4000, spindleSpeed: 2500, depthOfCut: 3, stepover: 55, coolant: "flood" },
    },
    notes: "Large face mill for high material removal rates.",
  },

  // ==========================================
  // SPOT DRILLS
  // ==========================================
  {
    id: "drill-spot-3",
    number: 20,
    name: "3mm Spot Drill (90°)",
    type: "drill-spot",
    diameter: 3,
    length: 30,
    shankDiameter: 3,
    material: "carbide",
    coating: "tialn",
    maxRPM: 20000,
    maxDOC: 3,
    defaultParams: {
      drilling: { feedRate: 150, spindleSpeed: 8000, depthOfCut: 1.5, coolant: "flood", description: "Spot depth 1-2mm. Center tip precisely marks hole location." },
    },
  },
  {
    id: "drill-spot-6",
    number: 21,
    name: "6mm Spot Drill (90°)",
    type: "drill-spot",
    diameter: 6,
    length: 40,
    shankDiameter: 6,
    material: "carbide",
    coating: "tialn",
    maxRPM: 15000,
    maxDOC: 6,
    defaultParams: {
      drilling: { feedRate: 200, spindleSpeed: 6000, depthOfCut: 3, coolant: "flood" },
    },
  },
  {
    id: "drill-spot-10-120",
    number: 22,
    name: "10mm Spot Drill (120°)",
    type: "drill-spot",
    diameter: 10,
    length: 50,
    shankDiameter: 10,
    material: "coated-carbide",
    coating: "altin",
    maxRPM: 10000,
    maxDOC: 5,
    defaultParams: {
      drilling: { feedRate: 250, spindleSpeed: 4500, depthOfCut: 2.5, coolant: "flood", description: "120° for harder materials. Better edge strength." },
    },
  },

  // ==========================================
  // TWIST DRILLS
  // ==========================================
  {
    id: "drill-twist-3",
    number: 23,
    name: "3mm Twist Drill",
    type: "drill-twist",
    diameter: 3,
    length: 40,
    lengthOfCut: 20,
    shankDiameter: 3,
    material: "hss",
    coating: "tin",
    maxRPM: 10000,
    maxDOC: 15,
    defaultParams: {
      drilling: { feedRate: 120, spindleSpeed: 5000, depthOfCut: 1.5, peckDepth: 1, coolant: "mist" },
    },
  },
  {
    id: "drill-twist-5",
    number: 24,
    name: "5mm Twist Drill",
    type: "drill-twist",
    diameter: 5,
    length: 60,
    lengthOfCut: 30,
    shankDiameter: 5,
    material: "hss",
    coating: "tin",
    maxRPM: 8000,
    maxDOC: 25,
    defaultParams: {
      drilling: { feedRate: 180, spindleSpeed: 3500, depthOfCut: 2.5, peckDepth: 2, coolant: "flood" },
    },
  },
  {
    id: "drill-twist-8",
    number: 25,
    name: "8mm Twist Drill",
    type: "drill-twist",
    diameter: 8,
    length: 75,
    lengthOfCut: 40,
    shankDiameter: 8,
    material: "hss",
    coating: "tin",
    maxRPM: 6000,
    maxDOC: 30,
    defaultParams: {
      drilling: { feedRate: 220, spindleSpeed: 2500, depthOfCut: 4, peckDepth: 3, coolant: "flood" },
    },
  },
  {
    id: "drill-twist-10",
    number: 26,
    name: "10mm Twist Drill",
    type: "drill-twist",
    diameter: 10,
    length: 85,
    lengthOfCut: 45,
    shankDiameter: 10,
    material: "hss-cobalt",
    coating: "tin",
    maxRPM: 5000,
    maxDOC: 35,
    defaultParams: {
      drilling: { feedRate: 280, spindleSpeed: 2000, depthOfCut: 5, peckDepth: 3, coolant: "flood" },
    },
  },
  {
    id: "drill-twist-16",
    number: 27,
    name: "16mm Twist Drill",
    type: "drill-twist",
    diameter: 16,
    length: 110,
    lengthOfCut: 60,
    shankDiameter: 16,
    material: "hss-cobalt",
    coating: "tialn",
    maxRPM: 3500,
    maxDOC: 40,
    defaultParams: {
      drilling: { feedRate: 350, spindleSpeed: 1200, depthOfCut: 8, peckDepth: 4, coolant: "flood" },
    },
  },
  {
    id: "drill-twist-carbide-6",
    number: 28,
    name: "6mm Carbide Twist Drill",
    type: "drill-twist",
    diameter: 6,
    length: 55,
    lengthOfCut: 28,
    shankDiameter: 6,
    material: "carbide-micrograin",
    coating: "tialn",
    maxRPM: 15000,
    maxDOC: 20,
    defaultParams: {
      drilling: { feedRate: 400, spindleSpeed: 8000, depthOfCut: 3, coolant: "through-spindle", description: "High-performance carbide drill. Use TSC." },
    },
    brand: "Guhring",
    series: "RT 150",
  },

  // ==========================================
  // CENTER DRILLS
  // ==========================================
  {
    id: "drill-center-2",
    number: 29,
    name: "2mm Center Drill (60°)",
    type: "drill-center",
    diameter: 2,
    length: 25,
    shankDiameter: 2,
    material: "hss",
    coating: "uncoated",
    maxRPM: 10000,
    maxDOC: 5,
    defaultParams: {
      drilling: { feedRate: 80, spindleSpeed: 4000, depthOfCut: 2, coolant: "mist", description: "Center drill 2-3mm depth. For lathe center holes." },
    },
  },
  {
    id: "drill-center-5",
    number: 30,
    name: "5mm Center Drill (60°)",
    type: "drill-center",
    diameter: 5,
    length: 35,
    shankDiameter: 5,
    material: "hss",
    coating: "uncoated",
    maxRPM: 7000,
    maxDOC: 8,
    defaultParams: {
      drilling: { feedRate: 120, spindleSpeed: 3000, depthOfCut: 4, coolant: "flood" },
    },
  },

  // ==========================================
  // GUN DRILLS
  // ==========================================
  {
    id: "drill-gun-8",
    number: 31,
    name: "8mm Gun Drill",
    type: "drill-gun",
    diameter: 8,
    length: 300,
    shankDiameter: 8,
    material: "carbide",
    coating: "tin",
    maxRPM: 6000,
    maxDOC: 250,
    defaultParams: {
      drilling: { feedRate: 100, spindleSpeed: 3500, depthOfCut: 4, coolant: "through-spindle", description: "Deep hole drilling. Requires high-pressure TSC." },
    },
    notes: "Deep hole drilling up to 250mm depth. Requires pilot hole and TSC.",
  },

  // ==========================================
  // INDEXABLE DRILLS
  // ==========================================
  {
    id: "drill-indexable-20",
    number: 32,
    name: "20mm Indexable Drill",
    type: "drill-indexable",
    diameter: 20,
    length: 100,
    lengthOfCut: 60,
    shankDiameter: 20,
    material: "coated-carbide",
    coating: "tialn",
    maxRPM: 6000,
    maxDOC: 60,
    defaultParams: {
      drilling: { feedRate: 250, spindleSpeed: 3000, depthOfCut: 10, coolant: "through-spindle", description: "2-insert indexable drill. For production drilling." },
    },
    brand: "Iscar",
    series: "SUMCHAM",
  },

  // ==========================================
  // TAPS
  // ==========================================
  {
    id: "tap-cut-m3",
    number: 33,
    name: "M3×0.5 Cutting Tap",
    type: "tap-cutting",
    diameter: 3,
    length: 35,
    shankDiameter: 3,
    material: "hss",
    coating: "tin",
    maxRPM: 2000,
    defaultParams: {
      tapping: { feedRate: 250, spindleSpeed: 500, depthOfCut: 8, coolant: "flood", description: "M3×0.5 — feed = spindle speed × 0.5" },
    },
  },
  {
    id: "tap-cut-m6",
    number: 34,
    name: "M6×1.0 Cutting Tap",
    type: "tap-cutting",
    diameter: 6,
    length: 45,
    shankDiameter: 6,
    material: "hss",
    coating: "tin",
    maxRPM: 1500,
    defaultParams: {
      tapping: { feedRate: 500, spindleSpeed: 500, depthOfCut: 15, coolant: "flood", description: "M6×1.0 — feed = spindle speed × 1.0" },
    },
  },
  {
    id: "tap-cut-m8",
    number: 35,
    name: "M8×1.25 Cutting Tap",
    type: "tap-cutting",
    diameter: 8,
    length: 50,
    shankDiameter: 8,
    material: "hss",
    coating: "tin",
    maxRPM: 1000,
    defaultParams: {
      tapping: { feedRate: 625, spindleSpeed: 500, depthOfCut: 18, coolant: "flood", description: "M8×1.25 — feed = spindle speed × 1.25" },
    },
  },
  {
    id: "tap-cut-m12",
    number: 36,
    name: "M12×1.75 Cutting Tap",
    type: "tap-cutting",
    diameter: 12,
    length: 60,
    shankDiameter: 12,
    material: "hss-cobalt",
    coating: "tin",
    maxRPM: 600,
    defaultParams: {
      tapping: { feedRate: 437, spindleSpeed: 250, depthOfCut: 24, coolant: "flood", description: "M12×1.75 — feed = spindle speed × 1.75" },
    },
  },
  {
    id: "tap-form-m6",
    number: 37,
    name: "M6×1.0 Forming Tap",
    type: "tap-forming",
    diameter: 6,
    length: 45,
    shankDiameter: 6,
    material: "hss",
    coating: "tin",
    maxRPM: 2000,
    defaultParams: {
      tapping: { feedRate: 1000, spindleSpeed: 1000, depthOfCut: 15, coolant: "flood", description: "M6×1.0 forming. Requires 5.4mm drill (75% thread)." },
    },
    notes: "Forming tap — cold forms threads. Requires larger pre-tap hole.",
  },

  // ==========================================
  // THREAD MILLS
  // ==========================================
  {
    id: "thread-mill-m6",
    number: 38,
    name: "M6 Thread Mill",
    type: "thread-mill",
    diameter: 5,
    flutes: 3,
    length: 30,
    lengthOfCut: 12,
    shankDiameter: 6,
    material: "carbide",
    coating: "tialn",
    maxRPM: 20000,
    maxDOC: 12,
    defaultParams: {
      "thread-milling": { feedRate: 600, spindleSpeed: 10000, depthOfCut: 6, coolant: "mist", description: "M6×1.0 single pass thread milling." },
    },
  },
  {
    id: "thread-mill-m8",
    number: 39,
    name: "M8 Thread Mill",
    type: "thread-mill",
    diameter: 6.8,
    flutes: 3,
    length: 35,
    lengthOfCut: 14,
    shankDiameter: 8,
    material: "carbide",
    coating: "tialn",
    maxRPM: 15000,
    maxDOC: 14,
    defaultParams: {
      "thread-milling": { feedRate: 700, spindleSpeed: 8000, depthOfCut: 8, coolant: "mist", description: "M8×1.25 single pass." },
    },
  },
  {
    id: "thread-mill-m12",
    number: 40,
    name: "M12 Thread Mill",
    type: "thread-mill",
    diameter: 10,
    flutes: 3,
    length: 50,
    lengthOfCut: 20,
    shankDiameter: 10,
    material: "carbide",
    coating: "altin",
    maxRPM: 12000,
    maxDOC: 20,
    defaultParams: {
      "thread-milling": { feedRate: 800, spindleSpeed: 6000, depthOfCut: 18, coolant: "mist", description: "M12×1.75 single or multi-pass." },
    },
  },
  {
    id: "thread-mill-uniform",
    number: 41,
    name: "UN 1/4-20 Thread Mill",
    type: "thread-mill",
    diameter: 5.5,
    flutes: 3,
    length: 30,
    lengthOfCut: 12,
    shankDiameter: 6,
    material: "carbide",
    coating: "tialn",
    maxRPM: 18000,
    maxDOC: 12,
    defaultParams: {
      "thread-milling": { feedRate: 500, spindleSpeed: 9000, depthOfCut: 6, coolant: "mist", description: "UN 1/4-20 thread mill." },
    },
  },

  // ==========================================
  // BORING BARS
  // ==========================================
  {
    id: "boring-bar-16",
    number: 42,
    name: "16mm Boring Bar",
    type: "boring-bar",
    diameter: 16,
    length: 100,
    shankDiameter: 16,
    material: "carbide",
    coating: "tialn",
    maxRPM: 8000,
    maxDOC: 3,
    defaultParams: {
      boring: { feedRate: 150, spindleSpeed: 3500, depthOfCut: 0.25, stepover: 0.12, coolant: "flood" },
      finishing: { feedRate: 100, spindleSpeed: 4500, depthOfCut: 0.1, stepover: 0.08, coolant: "flood" },
    },
  },
  {
    id: "boring-bar-20",
    number: 43,
    name: "20mm Boring Bar",
    type: "boring-bar",
    diameter: 20,
    length: 120,
    shankDiameter: 20,
    material: "carbide",
    coating: "tialn",
    maxRPM: 6000,
    maxDOC: 5,
    defaultParams: {
      boring: { feedRate: 200, spindleSpeed: 3000, depthOfCut: 0.3, stepover: 0.15, coolant: "flood" },
      finishing: { feedRate: 150, spindleSpeed: 4000, depthOfCut: 0.15, stepover: 0.1, coolant: "flood" },
    },
  },
  {
    id: "boring-bar-32",
    number: 44,
    name: "32mm Boring Bar",
    type: "boring-bar",
    diameter: 32,
    length: 150,
    shankDiameter: 32,
    material: "coated-carbide",
    coating: "altin",
    maxRPM: 4000,
    maxDOC: 8,
    defaultParams: {
      boring: { feedRate: 300, spindleSpeed: 2000, depthOfCut: 0.5, stepover: 0.25, coolant: "flood" },
      finishing: { feedRate: 200, spindleSpeed: 3000, depthOfCut: 0.2, stepover: 0.15, coolant: "flood" },
    },
  },

  // ==========================================
  // BORING HEADS
  // ==========================================
  {
    id: "boring-head-50",
    number: 45,
    name: "50mm Boring Head (Fine)",
    type: "boring-head",
    diameter: 50,
    subType: "fine-boring",
    length: 80,
    shankDiameter: "CAT40" as any,
    material: "coated-carbide",
    coating: "tialn",
    maxRPM: 5000,
    maxDOC: 2,
    defaultParams: {
      boring: { feedRate: 100, spindleSpeed: 2500, depthOfCut: 0.15, stepover: 0.05, coolant: "flood", description: "Fine boring for H6-H7 tolerances. Adjustable to 0.01mm." },
      finishing: { feedRate: 80, spindleSpeed: 3500, depthOfCut: 0.05, stepover: 0.03, coolant: "flood" },
    },
  },

  // ==========================================
  // REAMERS
  // ==========================================
  {
    id: "reamer-6h7",
    number: 46,
    name: "6mm H7 Reamer",
    type: "reamer",
    diameter: 6,
    flutes: 4,
    length: 50,
    lengthOfCut: 15,
    shankDiameter: 6,
    material: "carbide",
    coating: "tin",
    maxRPM: 8000,
    maxDOC: 0.15,
    defaultParams: {
      reaming: { feedRate: 200, spindleSpeed: 3500, depthOfCut: 0.08, coolant: "flood", description: "Max stock removal 0.15mm for H7 tolerance." },
    },
  },
  {
    id: "reamer-10h7",
    number: 47,
    name: "10mm H7 Reamer",
    type: "reamer",
    diameter: 10,
    flutes: 6,
    length: 70,
    lengthOfCut: 20,
    shankDiameter: 10,
    material: "carbide",
    coating: "tin",
    maxRPM: 6000,
    maxDOC: 0.2,
    defaultParams: {
      reaming: { feedRate: 300, spindleSpeed: 2500, depthOfCut: 0.1, coolant: "flood", description: "Remove max 0.2mm for H7 finish." },
    },
  },
  {
    id: "reamer-12h7",
    number: 48,
    name: "12mm H7 Reamer",
    type: "reamer",
    diameter: 12,
    flutes: 6,
    length: 80,
    lengthOfCut: 22,
    shankDiameter: 12,
    material: "carbide",
    coating: "tin",
    maxRPM: 5000,
    maxDOC: 0.25,
    defaultParams: {
      reaming: { feedRate: 350, spindleSpeed: 2000, depthOfCut: 0.12, coolant: "flood" },
    },
  },

  // ==========================================
  // CHAMFER MILLS
  // ==========================================
  {
    id: "chamfer-6-90",
    number: 49,
    name: "6mm Chamfer Mill (90°)",
    type: "chamfer-mill",
    diameter: 6,
    flutes: 2,
    length: 40,
    shankDiameter: 6,
    material: "carbide",
    coating: "tialn",
    maxRPM: 20000,
    maxDOC: 3,
    defaultParams: {
      chamfering: { feedRate: 800, spindleSpeed: 10000, depthOfCut: 0.5, coolant: "mist", description: "90° included. Chamfer width = depth × tan(45°)." },
    },
  },
  {
    id: "chamfer-12-90",
    number: 50,
    name: "12mm Chamfer Mill (90°)",
    type: "chamfer-mill",
    diameter: 12,
    flutes: 3,
    length: 50,
    shankDiameter: 12,
    material: "carbide",
    coating: "tialn",
    maxRPM: 14000,
    maxDOC: 5,
    defaultParams: {
      chamfering: { feedRate: 1200, spindleSpeed: 8000, depthOfCut: 0.75, coolant: "flood" },
    },
  },

  // ==========================================
  // COUNTERSINKS
  // ==========================================
  {
    id: "csink-10-82",
    number: 51,
    name: "10mm Countersink (82°)",
    type: "countersink",
    diameter: 10,
    flutes: 3,
    length: 40,
    shankDiameter: 6,
    material: "hss",
    coating: "tin",
    maxRPM: 5000,
    maxDOC: 5,
    defaultParams: {
      chamfering: { feedRate: 150, spindleSpeed: 2500, depthOfCut: 0.5, coolant: "flood", description: "82° for standard flat-head screws." },
    },
  },
  {
    id: "csink-16-100",
    number: 52,
    name: "16mm Countersink (100°)",
    type: "countersink",
    diameter: 16,
    flutes: 3,
    length: 50,
    shankDiameter: 8,
    material: "hss-cobalt",
    coating: "tin",
    maxRPM: 3500,
    maxDOC: 8,
    defaultParams: {
      chamfering: { feedRate: 200, spindleSpeed: 1800, depthOfCut: 0.8, coolant: "flood", description: "100° for metric countersunk screws." },
    },
  },

  // ==========================================
  // SLITTING SAWS
  // ==========================================
  {
    id: "slitting-saw-50-1",
    number: 53,
    name: "50×1mm Slitting Saw",
    type: "slitting-saw",
    diameter: 50,
    flutes: 64,
    lengthOfCut: 1,
    shankDiameter: 16,
    material: "hss",
    coating: "tin",
    maxRPM: 5000,
    maxDOC: 25,
    defaultParams: {
      slotting: { feedRate: 150, spindleSpeed: 2500, depthOfCut: 1, coolant: "flood", description: "1mm slot width, up to 25mm depth." },
    },
  },
  {
    id: "slitting-saw-75-2",
    number: 54,
    name: "75×2mm Slitting Saw",
    type: "slitting-saw",
    diameter: 75,
    flutes: 48,
    lengthOfCut: 2,
    shankDiameter: 19.05,
    material: "hss-cobalt",
    coating: "tin",
    maxRPM: 3500,
    maxDOC: 35,
    defaultParams: {
      slotting: { feedRate: 200, spindleSpeed: 1800, depthOfCut: 2, coolant: "flood", description: "2mm slot width, up to 35mm depth." },
    },
  },

  // ==========================================
  // DOVETAIL CUTTERS
  // ==========================================
  {
    id: "dovetail-12-45",
    number: 55,
    name: "12mm Dovetail Cutter (45°)",
    type: "dovetail-cutter",
    diameter: 12,
    subType: "45deg",
    flutes: 4,
    length: 30,
    shankDiameter: 10,
    material: "hss-cobalt",
    coating: "tin",
    maxRPM: 4000,
    maxDOC: 8,
    defaultParams: {
      roughing: { feedRate: 300, spindleSpeed: 2500, depthOfCut: 0.5, coolant: "flood", description: "45° dovetail for standard T-slots and dovetail slides." },
      finishing: { feedRate: 200, spindleSpeed: 3500, depthOfCut: 0.15, coolant: "flood" },
    },
  },
  {
    id: "dovetail-16-60",
    number: 56,
    name: "16mm Dovetail Cutter (60°)",
    type: "dovetail-cutter",
    diameter: 16,
    subType: "60deg",
    flutes: 4,
    length: 35,
    shankDiameter: 12,
    material: "coated-carbide",
    coating: "tialn",
    maxRPM: 6000,
    maxDOC: 10,
    defaultParams: {
      roughing: { feedRate: 400, spindleSpeed: 3500, depthOfCut: 0.8, coolant: "flood" },
      finishing: { feedRate: 250, spindleSpeed: 4500, depthOfCut: 0.2, coolant: "flood" },
    },
  },

  // ==========================================
  // T-SLOT CUTTERS
  // ==========================================
  {
    id: "tslot-12",
    number: 57,
    name: "12mm T-Slot Cutter",
    type: "t-slot-cutter",
    diameter: 12,
    flutes: 4,
    length: 20,
    shankDiameter: 10,
    material: "hss-cobalt",
    coating: "tin",
    maxRPM: 4000,
    maxDOC: 12,
    defaultParams: {
      slotting: { feedRate: 200, spindleSpeed: 2000, depthOfCut: 0.5, coolant: "flood", description: "For 12mm T-slot. Pre-mill the stem slot first." },
    },
  },
  {
    id: "tslot-18",
    number: 58,
    name: "18mm T-Slot Cutter",
    type: "t-slot-cutter",
    diameter: 18,
    flutes: 6,
    length: 25,
    shankDiameter: 14,
    material: "hss-cobalt",
    coating: "tin",
    maxRPM: 3000,
    maxDOC: 18,
    defaultParams: {
      slotting: { feedRate: 300, spindleSpeed: 1500, depthOfCut: 0.5, coolant: "flood" },
    },
  },

  // ==========================================
  // KEYSEAT CUTTERS
  // ==========================================
  {
    id: "keyseat-6",
    number: 59,
    name: "6mm Keyseat Cutter",
    type: "keyseat-cutter",
    diameter: 6,
    flutes: 2,
    length: 15,
    shankDiameter: 6,
    material: "hss",
    coating: "tin",
    maxRPM: 6000,
    maxDOC: 12,
    defaultParams: {
      slotting: { feedRate: 150, spindleSpeed: 3500, depthOfCut: 0.3, coolant: "flood", description: "For 6mm keyseats." },
    },
  },

  // ==========================================
  // WOODRUFF KEYSEAT CUTTERS
  // ==========================================
  {
    id: "woodruff-618",
    number: 60,
    name: "5/8\" Woodruff Keyseat Cutter",
    type: "woodruff-cutter",
    diameter: 15.88,
    subType: "#618",
    lengthOfCut: 4,
    shankDiameter: 12.7,
    material: "hss",
    coating: "tin",
    maxRPM: 5000,
    maxDOC: 8,
    defaultParams: {
      slotting: { feedRate: 100, spindleSpeed: 2500, depthOfCut: 0.1, coolant: "flood", description: "Woodruff #618. Cutter dia 5/8\", tooth width 4mm." },
    },
  },
  {
    id: "woodruff-1210",
    number: 61,
    name: "1-1/4\" Woodruff Keyseat Cutter",
    type: "woodruff-cutter",
    diameter: 31.75,
    subType: "#1210",
    lengthOfCut: 6.35,
    shankDiameter: 12.7,
    material: "hss-cobalt",
    coating: "tin",
    maxRPM: 3500,
    maxDOC: 12,
    defaultParams: {
      slotting: { feedRate: 150, spindleSpeed: 1800, depthOfCut: 0.15, coolant: "flood" },
    },
  },

  // ==========================================
  // ALUMINUM-SPECIFIC TOOLS
  // ==========================================
  {
    id: "em-aluminum-6",
    number: 62,
    name: "6mm Aluminum End Mill (2F)",
    type: "endmill-flat",
    subType: "aluminum",
    diameter: 6,
    flutes: 2,
    length: 50,
    lengthOfCut: 15,
    shankDiameter: 6,
    material: "carbide",
    coating: "uncoated",
    maxRPM: 30000,
    maxDOC: 3,
    defaultParams: {
      roughing: { feedRate: 2500, spindleSpeed: 16000, depthOfCut: 2, stepover: 3, coolant: "mist" },
      finishing: { feedRate: 1500, spindleSpeed: 20000, depthOfCut: 0.5, stepover: 0.5, coolant: "mist" },
      slotting: { feedRate: 1800, spindleSpeed: 14000, depthOfCut: 1, coolant: "mist" },
    },
    notes: "Polished flutes for aluminum. 2 flutes for maximum chip evacuation.",
    brand: "Harvey Tool",
    series: "Al-Cut",
  },
  {
    id: "em-aluminum-10",
    number: 63,
    name: "10mm Aluminum End Mill (2F)",
    type: "endmill-flat",
    subType: "aluminum",
    diameter: 10,
    flutes: 2,
    length: 70,
    lengthOfCut: 25,
    shankDiameter: 10,
    material: "carbide",
    coating: "uncoated",
    maxRPM: 24000,
    maxDOC: 5,
    defaultParams: {
      roughing: { feedRate: 3500, spindleSpeed: 12000, depthOfCut: 3, stepover: 5, coolant: "mist" },
      finishing: { feedRate: 2000, spindleSpeed: 16000, depthOfCut: 0.5, stepover: 0.5, coolant: "mist" },
      slotting: { feedRate: 2500, spindleSpeed: 10000, depthOfCut: 1.5, coolant: "mist" },
    },
  },

    // ==========================================
  // PCD TOOLS
  // ==========================================
  {
    id: "pcd-face-mill-50",
    number: 64,
    name: "50mm PCD Face Mill",
    type: "face-mill",
    diameter: 50,
    flutes: 4,
    length: 40,
    shankDiameter: 22,
    material: "pcd",
    coating: "uncoated",
    maxRPM: 20000,
    maxDOC: 2,
    defaultParams: {
      "face-milling": { feedRate: 3000, spindleSpeed: 12000, depthOfCut: 0.5, stepover: 35, coolant: "mist", description: "PCD for mirror-finish on aluminum." },
    },
    notes: "PCD-tipped for high-speed finishing of non-ferrous materials.",
  },

  // ==========================================
  // MICRO END MILLS
  // ==========================================
  {
    id: "em-micro-05",
    number: 65,
    name: "0.5mm Micro Flat End Mill",
    type: "endmill-flat",
    diameter: 0.5,
    flutes: 2,
    length: 25,
    lengthOfCut: 1,
    shankDiameter: 3,
    material: "carbide-micrograin",
    coating: "tialn",
    maxRPM: 50000,
    maxDOC: 0.25,
    defaultParams: {
      finishing: { feedRate: 50, spindleSpeed: 30000, depthOfCut: 0.03, stepover: 0.03, coolant: "mist" },
      roughing: { feedRate: 80, spindleSpeed: 25000, depthOfCut: 0.05, stepover: 0.05, coolant: "mist" },
    },
    notes: "Micro end mill for precision engraving and micro-machining. Use high-speed spindle.",
    brand: "NS Tool",
    series: "MSplus",
  },
  {
    id: "em-micro-1",
    number: 66,
    name: "1.0mm Micro Flat End Mill",
    type: "endmill-flat",
    diameter: 1,
    flutes: 2,
    length: 30,
    lengthOfCut: 2,
    shankDiameter: 3,
    material: "carbide-micrograin",
    coating: "tialn",
    maxRPM: 40000,
    maxDOC: 0.5,
    defaultParams: {
      finishing: { feedRate: 100, spindleSpeed: 24000, depthOfCut: 0.05, stepover: 0.05, coolant: "mist" },
      roughing: { feedRate: 150, spindleSpeed: 20000, depthOfCut: 0.1, stepover: 0.1, coolant: "mist" },
    },
    notes: "General purpose micro end mill. Ideal for small features and detail work.",
  },
  {
    id: "em-micro-ball-1",
    number: 67,
    name: "1.0mm Micro Ball Nose End Mill",
    type: "endmill-ball",
    diameter: 1,
    flutes: 2,
    length: 30,
    lengthOfCut: 2,
    shankDiameter: 3,
    material: "carbide-micrograin",
    coating: "tialn",
    maxRPM: 40000,
    maxDOC: 0.5,
    defaultParams: {
      finishing: { feedRate: 80, spindleSpeed: 28000, depthOfCut: 0.04, stepover: 0.03, coolant: "mist" },
    },
    notes: "Micro ball nose for 3D contours and surface texturing.",
  },

  // ==========================================
  // EXTRA-LONG END MILLS
  // ==========================================
  {
    id: "em-long-6x50",
    number: 68,
    name: "6mm Long Reach End Mill (50mm LOC)",
    type: "endmill-flat",
    subType: "long-reach",
    diameter: 6,
    flutes: 4,
    length: 100,
    lengthOfCut: 50,
    shankDiameter: 6,
    material: "carbide",
    coating: "tialn",
    maxRPM: 12000,
    maxDOC: 1.5,
    defaultParams: {
      roughing: { feedRate: 600, spindleSpeed: 6000, depthOfCut: 0.5, stepover: 1.5, coolant: "flood", description: "Reduce feeds 50% due to long reach." },
      finishing: { feedRate: 400, spindleSpeed: 8000, depthOfCut: 0.15, stepover: 0.15, coolant: "flood" },
    },
    notes: "Long reach end mill for deep cavities and tall walls. Reduce cutting parameters 40-50%.",
  },
  {
    id: "em-long-10x75",
    number: 69,
    name: "10mm Long Reach End Mill (75mm LOC)",
    type: "endmill-flat",
    subType: "long-reach",
    diameter: 10,
    flutes: 4,
    length: 150,
    lengthOfCut: 75,
    shankDiameter: 10,
    material: "coated-carbide",
    coating: "altin",
    maxRPM: 8000,
    maxDOC: 3,
    defaultParams: {
      roughing: { feedRate: 1200, spindleSpeed: 4000, depthOfCut: 1, stepover: 3, coolant: "flood" },
      finishing: { feedRate: 800, spindleSpeed: 5500, depthOfCut: 0.25, stepover: 0.25, coolant: "flood" },
    },
    notes: "Extra-long reach for deep pocket milling.",
  },

  // ==========================================
  // SPADE DRILLS
  // ==========================================
  {
    id: "drill-spade-16",
    number: 70,
    name: "16mm Spade Drill",
    type: "drill-spade",
    diameter: 16,
    length: 150,
    lengthOfCut: 60,
    shankDiameter: 16,
    material: "coated-carbide",
    coating: "tialn",
    maxRPM: 5000,
    maxDOC: 50,
    defaultParams: {
      drilling: { feedRate: 200, spindleSpeed: 2500, depthOfCut: 8, coolant: "flood", description: "Spade drill with replaceable blades. High feed rates." },
    },
    brand: "Madison",
    series: "SpadeMaster",
  },
  {
    id: "drill-spade-25",
    number: 71,
    name: "25mm Spade Drill",
    type: "drill-spade",
    diameter: 25,
    length: 200,
    lengthOfCut: 80,
    shankDiameter: 25,
    material: "coated-carbide",
    coating: "tialn",
    maxRPM: 3500,
    maxDOC: 60,
    defaultParams: {
      drilling: { feedRate: 250, spindleSpeed: 1500, depthOfCut: 12, coolant: "flood" },
    },
    notes: "Large spade drill with indexable blades. Cost-effective for large holes.",
  },

  // ==========================================
  // STEP DRILLS
  // ==========================================
  {
    id: "drill-step-4-12",
    number: 72,
    name: "4-12mm Step Drill",
    type: "drill-step",
    diameter: 12,
    subType: "6-step",
    length: 60,
    lengthOfCut: 40,
    shankDiameter: 10,
    material: "hss",
    coating: "tin",
    maxRPM: 4000,
    maxDOC: 30,
    defaultParams: {
      drilling: { feedRate: 200, spindleSpeed: 2000, depthOfCut: 3, coolant: "flood", description: "Steps: 4, 6, 8, 10, 12mm. For thin sheet deburring." },
    },
    notes: "Step drill for thin materials. Each step deburrs as it drills.",
  },
  {
    id: "drill-step-6-20",
    number: 73,
    name: "6-20mm Step Drill",
    type: "drill-step",
    diameter: 20,
    subType: "8-step",
    length: 75,
    lengthOfCut: 50,
    shankDiameter: 10,
    material: "hss-cobalt",
    coating: "tin",
    maxRPM: 3000,
    maxDOC: 35,
    defaultParams: {
      drilling: { feedRate: 250, spindleSpeed: 1200, depthOfCut: 5, coolant: "flood" },
    },
  },

  // ==========================================
  // ADDITIONAL TAPS — UNC/UNF & more sizes
  // ==========================================
  {
    id: "tap-cut-m10",
    number: 74,
    name: "M10×1.5 Cutting Tap",
    type: "tap-cutting",
    diameter: 10,
    length: 55,
    shankDiameter: 8,
    material: "hss",
    coating: "tin",
    maxRPM: 800,
    defaultParams: {
      tapping: { feedRate: 600, spindleSpeed: 400, depthOfCut: 20, coolant: "flood", description: "M10×1.5 — feed = spindle speed × 1.5" },
    },
  },
  {
    id: "tap-cut-m16",
    number: 75,
    name: "M16×2.0 Cutting Tap",
    type: "tap-cutting",
    diameter: 16,
    length: 70,
    shankDiameter: 12,
    material: "hss-cobalt",
    coating: "tin",
    maxRPM: 400,
    defaultParams: {
      tapping: { feedRate: 400, spindleSpeed: 200, depthOfCut: 30, coolant: "flood", description: "M16×2.0 — feed = spindle speed × 2.0" },
    },
  },
  {
    id: "tap-cut-unc-1-4",
    number: 76,
    name: "1/4\"-20 UNC Cutting Tap",
    type: "tap-cutting",
    diameter: 6.35,
    length: 50,
    shankDiameter: 6,
    material: "hss",
    coating: "tin",
    maxRPM: 1500,
    defaultParams: {
      tapping: { feedRate: 500, spindleSpeed: 500, depthOfCut: 15, coolant: "flood", description: "1/4\"-20 UNC — feed = spindle speed × (1/20\")" },
    },
  },
  {
    id: "tap-cut-unc-3-8",
    number: 77,
    name: "3/8\"-16 UNC Cutting Tap",
    type: "tap-cutting",
    diameter: 9.525,
    length: 55,
    shankDiameter: 8,
    material: "hss",
    coating: "tin",
    maxRPM: 1000,
    defaultParams: {
      tapping: { feedRate: 500, spindleSpeed: 400, depthOfCut: 20, coolant: "flood" },
    },
  },
  {
    id: "tap-form-m8",
    number: 78,
    name: "M8×1.25 Forming Tap",
    type: "tap-forming",
    diameter: 8,
    length: 50,
    shankDiameter: 6.3,
    material: "hss",
    coating: "tin",
    maxRPM: 1500,
    defaultParams: {
      tapping: { feedRate: 1250, spindleSpeed: 1000, depthOfCut: 18, coolant: "flood", description: "M8×1.25 forming. Requires 7.2mm drill." },
    },
  },
  {
    id: "tap-form-m10",
    number: 79,
    name: "M10×1.5 Forming Tap",
    type: "tap-forming",
    diameter: 10,
    length: 55,
    shankDiameter: 8,
    material: "hss",
    coating: "tin",
    maxRPM: 1000,
    defaultParams: {
      tapping: { feedRate: 1000, spindleSpeed: 800, depthOfCut: 20, coolant: "flood" },
    },
  },

  // ==========================================
  // ADDITIONAL THREAD MILLS
  // ==========================================
  {
    id: "thread-mill-m3",
    number: 80,
    name: "M3 Thread Mill",
    type: "thread-mill",
    diameter: 2.5,
    flutes: 3,
    length: 25,
    lengthOfCut: 6,
    shankDiameter: 4,
    material: "carbide",
    coating: "tialn",
    maxRPM: 30000,
    maxDOC: 6,
    defaultParams: {
      "thread-milling": { feedRate: 300, spindleSpeed: 15000, depthOfCut: 3, coolant: "mist", description: "M3×0.5 single pass." },
    },
  },
  {
    id: "thread-mill-m16",
    number: 81,
    name: "M16 Thread Mill",
    type: "thread-mill",
    diameter: 13.5,
    flutes: 3,
    length: 60,
    lengthOfCut: 25,
    shankDiameter: 12,
    material: "carbide",
    coating: "altin",
    maxRPM: 10000,
    maxDOC: 25,
    defaultParams: {
      "thread-milling": { feedRate: 1000, spindleSpeed: 5000, depthOfCut: 20, coolant: "mist", description: "M16×2.0 multi-pass." },
    },
  },
  {
    id: "thread-mill-long-m8",
    number: 82,
    name: "M8 Long Reach Thread Mill",
    type: "thread-mill",
    subType: "long-reach",
    diameter: 6.8,
    flutes: 3,
    length: 60,
    lengthOfCut: 25,
    shankDiameter: 8,
    material: "carbide",
    coating: "tialn",
    maxRPM: 12000,
    maxDOC: 25,
    defaultParams: {
      "thread-milling": { feedRate: 500, spindleSpeed: 7000, depthOfCut: 14, coolant: "mist", description: "M8×1.25 long reach for deep threads." },
    },
    notes: "Extended reach for threading deep bores.",
  },

  // ==========================================
  // ADDITIONAL REAMERS
  // ==========================================
  {
    id: "reamer-8h7",
    number: 83,
    name: "8mm H7 Reamer",
    type: "reamer",
    diameter: 8,
    flutes: 6,
    length: 60,
    lengthOfCut: 18,
    shankDiameter: 8,
    material: "carbide",
    coating: "tin",
    maxRPM: 7000,
    maxDOC: 0.2,
    defaultParams: {
      reaming: { feedRate: 250, spindleSpeed: 3000, depthOfCut: 0.1, coolant: "flood" },
    },
  },
  {
    id: "reamer-20h7",
    number: 84,
    name: "20mm H7 Reamer",
    type: "reamer",
    diameter: 20,
    flutes: 8,
    length: 100,
    lengthOfCut: 28,
    shankDiameter: 16,
    material: "carbide",
    coating: "tin",
    maxRPM: 3500,
    maxDOC: 0.3,
    defaultParams: {
      reaming: { feedRate: 500, spindleSpeed: 1500, depthOfCut: 0.15, coolant: "flood" },
    },
  },

  // ==========================================
  // ENGRAVING TOOLS
  // ==========================================
  {
    id: "engrave-60deg-3",
    number: 85,
    name: "3mm Engraving Bit (60°)",
    type: "chamfer-mill",
    subType: "engraving",
    diameter: 3,
    flutes: 2,
    length: 35,
    shankDiameter: 3.175,
    material: "carbide",
    coating: "tialn",
    maxRPM: 30000,
    maxDOC: 2,
    defaultParams: {
      chamfering: { feedRate: 500, spindleSpeed: 18000, depthOfCut: 0.1, coolant: "air", description: "60° engraving bit. Adjust depth to control line width." },
      finishing: { feedRate: 400, spindleSpeed: 20000, depthOfCut: 0.05, coolant: "air" },
    },
    notes: "60° included angle. For engraving text, serial numbers, and decorative patterns.",
    brand: "Harvey Tool",
    series: "Engraving",
  },
  {
    id: "engrave-90deg-6",
    number: 86,
    name: "6mm Engraving Bit (90°)",
    type: "chamfer-mill",
    subType: "engraving",
    diameter: 6,
    flutes: 2,
    length: 40,
    shankDiameter: 6,
    material: "carbide",
    coating: "tialn",
    maxRPM: 24000,
    maxDOC: 4,
    defaultParams: {
      chamfering: { feedRate: 800, spindleSpeed: 15000, depthOfCut: 0.2, coolant: "air" },
    },
    notes: "90° engraving bit for wider engraved lines and V-grooves.",
  },

  // ==========================================
  // ADDITIONAL DRILLS — Carbide & specialty
  // ==========================================
  {
    id: "drill-twist-carbide-8",
    number: 87,
    name: "8mm Carbide Twist Drill",
    type: "drill-twist",
    diameter: 8,
    length: 65,
    lengthOfCut: 35,
    shankDiameter: 8,
    material: "carbide-micrograin",
    coating: "tialn",
    maxRPM: 12000,
    maxDOC: 25,
    defaultParams: {
      drilling: { feedRate: 500, spindleSpeed: 6000, depthOfCut: 4, coolant: "through-spindle" },
    },
    brand: "Guhring",
    series: "RT 150",
  },
  {
    id: "drill-twist-carbide-10",
    number: 88,
    name: "10mm Carbide Twist Drill",
    type: "drill-twist",
    diameter: 10,
    length: 75,
    lengthOfCut: 40,
    shankDiameter: 10,
    material: "carbide-micrograin",
    coating: "tialn",
    maxRPM: 10000,
    maxDOC: 30,
    defaultParams: {
      drilling: { feedRate: 600, spindleSpeed: 5000, depthOfCut: 5, coolant: "through-spindle" },
    },
  },
  {
    id: "drill-indexable-32",
    number: 89,
    name: "32mm Indexable Drill",
    type: "drill-indexable",
    diameter: 32,
    length: 150,
    lengthOfCut: 80,
    shankDiameter: 32,
    material: "coated-carbide",
    coating: "tialn",
    maxRPM: 4000,
    maxDOC: 80,
    defaultParams: {
      drilling: { feedRate: 350, spindleSpeed: 2000, depthOfCut: 16, coolant: "through-spindle", description: "3-insert indexable drill. For large production holes." },
    },
    brand: "Iscar",
    series: "SUMCHAM",
  },

  // ==========================================
  // ADDITIONAL BORING BARS — Fine & Heavy
  // ==========================================
  {
    id: "boring-bar-8",
    number: 90,
    name: "8mm Mini Boring Bar",
    type: "boring-bar",
    diameter: 8,
    length: 60,
    shankDiameter: 8,
    material: "carbide",
    coating: "tialn",
    maxRPM: 15000,
    maxDOC: 1.5,
    defaultParams: {
      boring: { feedRate: 80, spindleSpeed: 6000, depthOfCut: 0.1, stepover: 0.05, coolant: "mist" },
      finishing: { feedRate: 50, spindleSpeed: 8000, depthOfCut: 0.05, stepover: 0.03, coolant: "mist" },
    },
    notes: "Mini boring bar for small diameter bores. Steel shank with carbide head.",
  },
  {
    id: "boring-bar-40",
    number: 91,
    name: "40mm Heavy Boring Bar",
    type: "boring-bar",
    diameter: 40,
    length: 250,
    shankDiameter: 40,
    material: "coated-carbide",
    coating: "altin",
    maxRPM: 3000,
    maxDOC: 10,
    defaultParams: {
      boring: { feedRate: 400, spindleSpeed: 1500, depthOfCut: 1, stepover: 0.5, coolant: "flood" },
      finishing: { feedRate: 250, spindleSpeed: 2000, depthOfCut: 0.3, stepover: 0.2, coolant: "flood" },
    },
  },

  // ==========================================
  // DEBURRING TOOLS
  // ==========================================
  {
    id: "deburring-blade",
    number: 92,
    name: "Deburring Blade (Spring-loaded)",
    type: "chamfer-mill",
    subType: "deburring",
    diameter: 12,
    length: 40,
    shankDiameter: 6,
    material: "hss",
    coating: "tin",
    maxRPM: 3000,
    maxDOC: 3,
    defaultParams: {
      chamfering: { feedRate: 1500, spindleSpeed: 2000, depthOfCut: 0.5, coolant: "off", description: "Spring-loaded deburring. Don't decelerate — let it snap over edges." },
    },
    notes: "Spring-loaded deburring tool for hand-held or automated edge deburring.",
    brand: "Heule",
    series: "COFA",
  },

  // ==========================================
  // CARBIDE BURR TOOLS
  // ==========================================
  {
    id: "burr-cylinder-6",
    number: 93,
    name: "6mm Cylindrical Carbide Burr",
    type: "endmill-flat",
    subType: "burr",
    diameter: 6,
    length: 15,
    lengthOfCut: 10,
    shankDiameter: 6,
    material: "carbide",
    coating: "uncoated",
    maxRPM: 20000,
    maxDOC: 2,
    defaultParams: {
      roughing: { feedRate: 200, spindleSpeed: 15000, depthOfCut: 0.3, coolant: "off", description: "Rotary burr for deburring and edge breaking." },
    },
    notes: "Carbide rotary burr with diamond-cut teeth. For deburring steel, stainless, and aluminum.",
    brand: "Atrax",
    series: "Professional",
  },
  {
    id: "burr-ball-10",
    number: 94,
    name: "10mm Ball Carbide Burr",
    type: "endmill-ball",
    subType: "burr",
    diameter: 10,
    length: 20,
    lengthOfCut: 10,
    shankDiameter: 6,
    material: "carbide",
    coating: "uncoated",
    maxRPM: 18000,
    maxDOC: 4,
    defaultParams: {
      roughing: { feedRate: 300, spindleSpeed: 12000, depthOfCut: 0.5, coolant: "off" },
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

export function getToolTypes(): ToolType[] {
  const types = new Set(TOOLS.map((t) => t.type));
  return Array.from(types);
}

/**
 * Generate a CNC program skeleton for a specific tool operation
 */
export function generateToolProgram(
  tool: ToolDefinition,
  operation: OperationType,
  params: ToolParams,
  targetFormat: ControllerFormat,
  options?: {
    programNumber?: number;
    x?: number;
    y?: number;
    z?: number;
    depth?: number;
  },
): string {
  // Import format detection
  const families = {
    "siemens-840d": "siemens",
    "siemens-828d": "siemens",
    "fanuc-0i": "fanuc",
    "fanuc-31i": "fanuc",
    "heidenhain-tnc640": "heidenhain",
    "heidenhain-itnc530": "heidenhain",
    "mazak-mazatrol": "mazak",
    "mazak-smooth": "mazak",
    "okuma-osp": "okuma",
    "mitsubishi-m80": "mitsubishi",
    "mitsubishi-m70": "mitsubishi",
    "haas": "haas",
    "brother-speedio": "brother",
    "fagor-8055": "fagor",
    "bosch-mtx": "bosch",
  } as const;
  const family = (families as Record<string, string>)[targetFormat] || "fanuc";

  const progNum = options?.programNumber || 1;
  const x = options?.x ?? 50;
  const y = options?.y ?? 50;
  const z = options?.z ?? 0;
  const depth = options?.depth ?? 10;
  const { feedRate, spindleSpeed, depthOfCut, peckDepth } = params;

  const lines: string[] = [];
  const isSiemens = family === "siemens";
  const isFanuc = family === "fanuc" || family === "mitsubishi" || family === "haas";

  // Program header
  if (isSiemens) {
    lines.push(`%_N_${tool.name.replace(/[^a-zA-Z0-9]/g, "_").toUpperCase()}_MPF`);
    lines.push(`;${tool.name} — ${operation}`);
    lines.push(`;Tool: T${tool.number} D=${tool.diameter}mm`);
  } else if (family === "heidenhain") {
    lines.push(`BEGIN PGM ${String(progNum).padStart(4, "0")} MM`);
    lines.push(`;${tool.name} — ${operation}`);
  } else {
    // Fanuc/Mitsubishi/Haas/Okuma
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
  } else if (family === "heidenhain") {
    lines.push("TOOL CALL 1 Z S5000");
    lines.push("L M3");
    lines.push("L X+50 Y+50 R0 F5000");
    const zSafe = z + 2;
    lines.push(`L Z+${zSafe} R0 F5000 M8`);
  } else {
    // Fanuc-style
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
        const peck = peckDepth || depthOfCut;
        if (operation === "tapping") {
          lines.push(`CYCLE84(${z + 2},${z},1,${Math.abs(depth)},0,,3,,${getThreadPitch(tool)},,,)`);
        } else if (peck > 0 && peck < Math.abs(depth)) {
          lines.push(`CYCLE83(${z + 2},${z},1,${Math.abs(depth)},0,,${peck},,,,,)`);
        } else {
          lines.push(`CYCLE81(${z + 2},${z},1,${Math.abs(depth)})`);
        }
        lines.push(`G0 Z${z + 5}`);
      } else if (family === "heidenhain") {
        // Heidenhain uses CYCL DEF
        lines.push("CYCL DEF 200 DRILLING");
        lines.push(`QL210=${z + 2}; SET-UP`);
        lines.push(`QL211=${z - depth}; DEPTH`);
        lines.push(`QL212=2; FEED`);
        lines.push(`QL213=0; DWELL`);
        lines.push("L X+50 Y+50 FMAX M3");
        lines.push("CYCL CALL M8");
        lines.push("L Z+5 FMAX");
      } else {
        const gCode = operation === "tapping" ? "G84" : (peckDepth && peckDepth < Math.abs(depth) ? "G83" : "G81");
        const feed = operation === "tapping"
          ? Math.round(spindleSpeed * getThreadPitch(tool))
          : feedRate;
        const qText = peckDepth && peckDepth < Math.abs(depth) ? `Q${peckDepth}` : "";
        lines.push(`${gCode} X${x} Y${y} Z${z - depth} R${z + 2} ${qText} F${feed}`);
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
      } else if (family === "heidenhain") {
        lines.push(`L Z-${depthOfCut} R0 F${feedRate}`);
        lines.push(`L X+${x + 20} Y+${y + 20} R0 F${feedRate}`);
        lines.push(`L Z+${z + 2} R0 F5000`);
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
      if (isSiemens) {
        lines.push(`G1 Z=${z - depthOfCut}`);
        lines.push(`X${x + 15} Y${y + 10}`);
        lines.push(`Z=${z + 2}`);
      } else {
        lines.push(`G01 Z${z - depthOfCut}`);
        lines.push(`X${x + 15} Y${y + 10}`);
        lines.push(`Z${z + 2}`);
      }
  }

  // Retract and end
  if (isSiemens) {
    lines.push("G0 Z100");
    lines.push("M5 M9");
    lines.push("M02");
    lines.push("%");
  } else if (family === "heidenhain") {
    lines.push("L Z+100 R0 F5000 M5 M9");
    lines.push("END PGM 1 MM");
  } else if (family === "okuma") {
    lines.push("G00 Z100");
    lines.push("M5 M9");
    lines.push("M02");
  } else {
    lines.push("G00 Z100");
    lines.push("M5 M9");
    lines.push("M02");
    lines.push("%");
  }

  return lines.join("\n");
}

function getThreadPitch(tool: ToolDefinition): number {
  const name = tool.name;

  // Use regex word boundaries to avoid matching "M30" with "M3"
  if (/\bM3\b/.test(name)) return 0.5;
  if (/\bM6\b/.test(name))  return 1.0;
  if (/\bM8\b/.test(name))  return 1.25;
  if (/\bM10\b/.test(name)) return 1.5;
  if (/\bM12\b/.test(name)) return 1.75;
  if (/\bM16\b/.test(name)) return 2.0;
  if (/\bM20\b/.test(name)) return 2.5;
  if (/\b1\/4\b/.test(name)) return 0.635;

  // Fallback: try to extract the pitch from an "M<N>×<P>" pattern
  const metricMatch = name.match(/M(\d+)[×x]([\d.]+)/);
  if (metricMatch) return parseFloat(metricMatch[2]);

  return 1.0;
}

// Re-import for type safety in the generator above
import { ControllerFormat } from "./types";
