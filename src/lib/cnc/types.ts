/** Core types for CNC program conversion */

export type ControllerFormat =
  | "siemens-840d"
  | "siemens-828d"
  | "mitsubishi-m80"
  | "mitsubishi-m70"
  | "fanuc-0i"
  | "fanuc-31i"
  | "heidenhain-tnc640"
  | "heidenhain-itnc530"
  | "mazak-mazatrol"
  | "mazak-smooth"
  | "okuma-osp"
  | "haas"
  | "brother-speedio"
  | "fagor-8055"
  | "bosch-mtx"
  | "mazak-eia";

export interface ControllerInfo {
  id: ControllerFormat;
  name: string;
  manufacturer: string;
  description: string;
  format: "gcode-iso" | "gcode-extended" | "conversational" | "hybrid";
  color: string;
}

export const CONTROLLERS: ControllerInfo[] = [
  {
    id: "fanuc-0i",
    name: "Series 0i",
    manufacturer: "Fanuc",
    description: "Fanuc 0i series — the global industry standard for G-code programming",
    format: "gcode-iso",
    color: "#E53935",
  },
  {
    id: "fanuc-31i",
    name: "Series 31i-B5",
    manufacturer: "Fanuc",
    description: "Fanuc 31i-B5 — high-end 5-axis with Nano Smoothing",
    format: "gcode-iso",
    color: "#D32F2F",
  },
  {
    id: "siemens-840d",
    name: "SINUMERIK 840D",
    manufacturer: "Siemens",
    description: "Siemens 840D solution line — DIN/ISO with Siemens cycles",
    format: "gcode-extended",
    color: "#0097A7",
  },
  {
    id: "siemens-828d",
    name: "SINUMERIK 828D",
    manufacturer: "Siemens",
    description: "Siemens 828D — compact version for standard machine tools",
    format: "gcode-extended",
    color: "#00838F",
  },
  {
    id: "heidenhain-tnc640",
    name: "TNC 640",
    manufacturer: "Heidenhain",
    description: "Heidenhain TNC 640 — conversational + ISO for 5-axis and milling-turning",
    format: "hybrid",
    color: "#1565C0",
  },
  {
    id: "heidenhain-itnc530",
    name: "iTNC 530",
    manufacturer: "Heidenhain",
    description: "Heidenhain iTNC 530 — conversational programming for mold & die",
    format: "hybrid",
    color: "#1976D2",
  },
  {
    id: "mazak-mazatrol",
    name: "Mazatrol",
    manufacturer: "Mazak",
    description: "Mazak Mazatrol — conversational programming with G-code support",
    format: "conversational",
    color: "#00796B",
  },
  {
    id: "mazak-smooth",
    name: "SmoothG/SmoothX",
    manufacturer: "Mazak",
    description: "Mazak Smooth series — next-gen conversational",
    format: "conversational",
    color: "#00695C",
  },
  {
    id: "okuma-osp",
    name: "OSP",
    manufacturer: "Okuma",
    description: "Okuma OSP — intelligent CNC with thermal compensation",
    format: "gcode-extended",
    color: "#E65100",
  },
  {
    id: "mitsubishi-m80",
    name: "M80 Series",
    manufacturer: "Mitsubishi Electric",
    description: "Mitsubishi M80 Series — standard G-code with M70/M80 extensions",
    format: "gcode-iso",
    color: "#7B1FA2",
  },
  {
    id: "mitsubishi-m70",
    name: "M70 Series",
    manufacturer: "Mitsubishi Electric",
    description: "Mitsubishi M70 Series — previous gen G-code control",
    format: "gcode-iso",
    color: "#8E24AA",
  },
  {
    id: "haas",
    name: "Haas NGC/Classic",
    manufacturer: "Haas Automation",
    description: "Haas — Fanuc-style G-code with conversational programming",
    format: "gcode-iso",
    color: "#2E7D32",
  },
  {
    id: "brother-speedio",
    name: "Speedio",
    manufacturer: "Brother",
    description: "Brother Speedio — high-speed tapping/milling with optimized cycles",
    format: "hybrid",
    color: "#283593",
  },
  {
    id: "fagor-8055",
    name: "8055 CNC",
    manufacturer: "Fagor Automation",
    description: "Fagor 8055 — ISO + conversational for mills and lathes",
    format: "hybrid",
    color: "#4E342E",
  },
  {
    id: "bosch-mtx",
    name: "IndraMotion MTX",
    manufacturer: "Bosch Rexroth",
    description: "Bosch Rexroth MTX — advanced CNC with deep PLC integration",
    format: "gcode-extended",
    color: "#B71C1C",
  },
  {
    id: "mazak-eia",
    name: "EIA/ISO (G-code Mode)",
    manufacturer: "Mazak",
    description: "Mazak EIA/ISO — standard G-code programming on Mazak controls (Mazatrol Matrix, Nexus, Smooth)",
    format: "gcode-iso",
    color: "#00897B",
  },
];

export type ControllerFamily =
  | "fanuc"
  | "siemens"
  | "heidenhain"
  | "mazak"
  | "okuma"
  | "mitsubishi"
  | "haas"
  | "brother"
  | "fagor"
  | "bosch";

export const getFamilyForFormat = (format: ControllerFormat): ControllerFamily => {
  const map: Record<string, ControllerFamily> = {
    "fanuc-0i": "fanuc",
    "fanuc-31i": "fanuc",
    "siemens-840d": "siemens",
    "siemens-828d": "siemens",
    "heidenhain-tnc640": "heidenhain",
    "heidenhain-itnc530": "heidenhain",
    "mazak-mazatrol": "mazak",
    "mazak-smooth": "mazak",
    "mazak-eia": "mazak",
    "okuma-osp": "okuma",
    "mitsubishi-m80": "mitsubishi",
    "mitsubishi-m70": "mitsubishi",
    haas: "haas",
    "brother-speedio": "brother",
    "fagor-8055": "fagor",
    "bosch-mtx": "bosch",
  };
  return map[format] || "fanuc";
};

export type AxisCount = 3 | 4 | 5;

export type UnitSystem = "metric" | "imperial";

export interface ConversionOptions {
  sourceFormat: ControllerFormat;
  targetFormat: ControllerFormat;
  unitSystem?: UnitSystem;
  axisCount?: AxisCount;
  programNumber?: number;
  commentStyle?: "semicolon" | "parens";
}

export interface CNCBlock {
  /** Raw line text */
  raw: string;
  /** Line number (if present) */
  lineNumber?: number;
  /** Parsed G-codes */
  gCodes: string[];
  /** Parsed M-codes */
  mCodes: string[];
  /** Axis words (X, Y, Z, A, B, C) */
  axes: Record<string, number>;
  /** Feed rate (F word) */
  feed?: number;
  /** Spindle speed (S word) */
  spindleSpeed?: number;
  /** Tool number (T word) */
  toolNumber?: number;
  /** Tool name (Siemens specific T="name") */
  toolName?: string;
  /** Fixed cycle (G81, G83, etc. or Siemens CYCLE...) */
  cycle?: string;
  /** Cycle parameters */
  cycleParams: number[];
  /** Siemens-specific cycle call */
  siemensCycleCall?: string;
  /** Heidenhain specific: TOOL CALL, CYCL DEF, etc */
  heidenhainCommand?: string;
  /** Heidenhain Q parameters */
  qParams: Record<string, number>;
  /** Comment text */
  comment?: string;
  /** Whether this is a program start line */
  isProgramStart?: boolean;
  /** Whether this is a program end line */
  isProgramEnd?: boolean;
  /** Raw addresses (all word-address pairs) */
  addresses: Record<string, string | number>;
}

export interface CNCProgram {
  blocks: CNCBlock[];
  sourceFormat: ControllerFormat;
  programName?: string;
  errors: ConversionError[];
}

export interface ConversionError {
  line: number;
  message: string;
  severity: "warning" | "error";
}

export interface ConversionResult {
  success: boolean;
  program: CNCProgram;
  output: string;
  errors: ConversionError[];
  warnings: ConversionError[];
}

// ==========================================
// TOOL TYPES
// ==========================================

export type ToolType =
  | "endmill-flat"
  | "endmill-ball"
  | "endmill-corner"
  | "endmill-tapered"
  | "endmill-roughing"
  | "face-mill"
  | "drill-spot"
  | "drill-twist"
  | "drill-center"
  | "drill-gun"
  | "drill-indexable"
  | "drill-spade"
  | "drill-step"
  | "tap-cutting"
  | "tap-forming"
  | "thread-mill"
  | "boring-bar"
  | "boring-head"
  | "reamer"
  | "chamfer-mill"
  | "countersink"
  | "slitting-saw"
  | "dovetail-cutter"
  | "t-slot-cutter"
  | "keyseat-cutter"
  | "woodruff-cutter";

export type ToolMaterial =
  | "hss"
  | "hss-cobalt"
  | "carbide"
  | "carbide-micrograin"
  | "cbn"
  | "pcd"
  | "cermet"
  | "ceramic"
  | "coated-carbide"
  | "coated-hss";

export type ToolCoating =
  | "uncoated"
  | "tin"
  | "ticn"
  | "tialn"
  | "altin"
  | "craln"
  | "diamond"
  | "zrn";

export type OperationType =
  | "roughing"
  | "finishing"
  | "drilling"
  | "tapping"
  | "boring"
  | "reaming"
  | "chamfering"
  | "slotting"
  | "thread-milling"
  | "face-milling"
  | "plunge-roughing"
  | "trochoidal-milling"
  | "helical-interpolation";

export type WorkpieceMaterial =
  | "steel-mild"
  | "steel-carbon"
  | "steel-alloy"
  | "steel-tool"
  | "steel-stainless-austenitic"
  | "steel-stainless-martensitic"
  | "steel-stainless-ferritic"
  | "steel-hardened"
  | "aluminum"
  | "aluminum-silicon"
  | "brass"
  | "bronze"
  | "copper"
  | "titanium"
  | "titanium-alloy"
  | "inconel"
  | "hastelloy"
  | "cast-iron-gray"
  | "cast-iron-ductile"
  | "cast-iron-malleable"
  | "magnesium"
  | "plastic-abs"
  | "plastic-nylon"
  | "plastic-acetal"
  | "plastic-acrylic"
  | "carbon-fiber"
  | "wood-soft"
  | "wood-hard"
  | "composite";

export interface ToolDefinition {
  id: string;
  number: number;
  name: string;
  type: ToolType;
  subType?: string;
  diameter: number;
  diameterMax?: number;
  flutes?: number;
  length?: number;
  lengthOfCut?: number;
  shankDiameter?: number;
  material: ToolMaterial;
  coating?: ToolCoating;
  maxRPM?: number;
  maxDOC?: number;
  defaultParams: Partial<Record<OperationType, ToolParams>>;
  notes?: string;
  imageUrl?: string;
  brand?: string;
  series?: string;
}

export interface ToolParams {
  feedRate: number;
  spindleSpeed: number;
  depthOfCut: number;
  stepover?: number;
  stepdown?: number;
  peckDepth?: number;
  coolant: "flood" | "mist" | "air" | "through-spindle" | "off";
  description?: string;
}

// ==========================================
// INSERT TYPES — ISO 1832 Standard
// ==========================================

export type InsertShape =
  | "C" | "D" | "S" | "T" | "V" | "W" | "L"
  | "A" | "B" | "K" | "E" | "M" | "R" | "H";

export type InsertClearance =
  | "A" | "B" | "C" | "D" | "E" | "F" | "G" | "N" | "P" | "R";

export type InsertTolerance =
  | "A" | "B" | "C" | "E" | "F" | "G" | "H" | "J" | "K" | "L" | "M" | "N" | "U";

export type InsertChipbreaker =
  | "general-purpose"
  | "finishing"
  | "roughing"
  | "light"
  | "heavy"
  | "high-feed"
  | "wiper";

export interface InsertDefinition {
  id: string;
  isoCode: string;
  shape: InsertShape;
  clearance: InsertClearance;
  tolerance: InsertTolerance;
  size: number;
  thickness: number;
  noseRadius: number;
  chipbreaker: InsertChipbreaker;
  material: ToolMaterial;
  coating?: ToolCoating;
  isoApplicationGroup: string;
  recommendedDOC: { min: number; max: number };
  recommendedFeed: { min: number; max: number };
  maxDepthOfCut: number;
  maxFeedRate: number;
  notes?: string;
  imageUrl?: string;
  brand?: string;
  series?: string;
}

export interface InsertHolderDefinition {
  id: string;
  name: string;
  isoCode?: string;
  shankSize: string;
  length: number;
  insertSeatSize: number;
  style: "external" | "internal" | "parting" | "threading" | "grooving";
  maxDepth: number;
}

// ==========================================
// MATERIAL DATABASE — Cutting Data
// ==========================================

export const SFM_RANGES: Record<string, { sfmLimits: { min: number; max: number }; chipLoad?: { min: number; max: number } }> = {
  "aluminum": { sfmLimits: { min: 600, max: 2000 }, chipLoad: { min: 0.05, max: 0.25 } },
  "aluminum-alloy": { sfmLimits: { min: 500, max: 1500 }, chipLoad: { min: 0.05, max: 0.2 } },
  "steel-mild": { sfmLimits: { min: 300, max: 600 }, chipLoad: { min: 0.05, max: 0.15 } },
  "steel-alloy": { sfmLimits: { min: 200, max: 500 }, chipLoad: { min: 0.04, max: 0.12 } },
  "steel-stainless": { sfmLimits: { min: 150, max: 350 }, chipLoad: { min: 0.03, max: 0.1 } },
  "steel-hardened": { sfmLimits: { min: 100, max: 250 }, chipLoad: { min: 0.02, max: 0.08 } },
  "titanium": { sfmLimits: { min: 80, max: 200 }, chipLoad: { min: 0.02, max: 0.08 } },
  "titanium-alloy": { sfmLimits: { min: 60, max: 150 }, chipLoad: { min: 0.015, max: 0.06 } },
  "inconel": { sfmLimits: { min: 50, max: 120 }, chipLoad: { min: 0.015, max: 0.05 } },
  "brass": { sfmLimits: { min: 400, max: 1200 }, chipLoad: { min: 0.05, max: 0.2 } },
  "bronze": { sfmLimits: { min: 300, max: 800 }, chipLoad: { min: 0.04, max: 0.15 } },
  "copper": { sfmLimits: { min: 300, max: 800 }, chipLoad: { min: 0.04, max: 0.15 } },
  "cast-iron": { sfmLimits: { min: 200, max: 500 }, chipLoad: { min: 0.04, max: 0.12 } },
  "magnesium": { sfmLimits: { min: 800, max: 3000 }, chipLoad: { min: 0.05, max: 0.3 } },
  "plastic": { sfmLimits: { min: 400, max: 1500 }, chipLoad: { min: 0.05, max: 0.2 } },
  "carbon-fiber": { sfmLimits: { min: 200, max: 600 }, chipLoad: { min: 0.02, max: 0.08 } },
  "wood": { sfmLimits: { min: 1000, max: 3000 }, chipLoad: { min: 0.1, max: 0.5 } },
};

// ==========================================
// LABELS AND CONSTANTS
// ==========================================

export const WORKPIECE_MATERIALS: Record<WorkpieceMaterial, string> = {
  "steel-mild": "Mild Steel (1018, A36)",
  "steel-carbon": "Carbon Steel (1045, 4140)",
  "steel-alloy": "Alloy Steel (4140, 4340)",
  "steel-tool": "Tool Steel (D2, A2, H13)",
  "steel-stainless-austenitic": "Stainless Steel — Austenitic (304, 316)",
  "steel-stainless-martensitic": "Stainless Steel — Martensitic (416, 17-4)",
  "steel-stainless-ferritic": "Stainless Steel — Ferritic (430, 409)",
  "steel-hardened": "Hardened Steel (45-65 HRC)",
  aluminum: "Aluminum (6061, 7075)",
  "aluminum-silicon": "Aluminum — High Silicon (>12%)",
  brass: "Brass",
  bronze: "Bronze",
  copper: "Copper",
  titanium: "Titanium (Grade 2-5)",
  "titanium-alloy": "Titanium Alloy (6Al-4V)",
  inconel: "Inconel / Superalloys",
  hastelloy: "Hastelloy",
  "cast-iron-gray": "Cast Iron — Gray",
  "cast-iron-ductile": "Cast Iron — Ductile/Nodular",
  "cast-iron-malleable": "Cast Iron — Malleable",
  magnesium: "Magnesium Alloys",
  "plastic-abs": "Plastic — ABS",
  "plastic-nylon": "Plastic — Nylon",
  "plastic-acetal": "Plastic — Acetal/Delrin",
  "plastic-acrylic": "Plastic — Acrylic/Plexiglass",
  "carbon-fiber": "Carbon Fiber Composite",
  "wood-soft": "Wood — Softwood",
  "wood-hard": "Wood — Hardwood",
  composite: "Composite (GFRP, etc.)",
};

export const MATERIAL_SFM_LABELS: Record<WorkpieceMaterial, string> = {
  "steel-mild": "steel-mild",
  "steel-carbon": "steel-alloy",
  "steel-alloy": "steel-alloy",
  "steel-tool": "steel-alloy",
  "steel-stainless-austenitic": "steel-stainless",
  "steel-stainless-martensitic": "steel-stainless",
  "steel-stainless-ferritic": "steel-stainless",
  "steel-hardened": "steel-hardened",
  aluminum: "aluminum",
  "aluminum-silicon": "aluminum-alloy",
  brass: "brass",
  bronze: "bronze",
  copper: "copper",
  titanium: "titanium",
  "titanium-alloy": "titanium-alloy",
  inconel: "inconel",
  hastelloy: "inconel",
  "cast-iron-gray": "cast-iron",
  "cast-iron-ductile": "cast-iron",
  "cast-iron-malleable": "cast-iron",
  magnesium: "magnesium",
  "plastic-abs": "plastic",
  "plastic-nylon": "plastic",
  "plastic-acetal": "plastic",
  "plastic-acrylic": "plastic",
  "carbon-fiber": "carbon-fiber",
  "wood-soft": "wood",
  "wood-hard": "wood",
  composite: "carbon-fiber",
};

export const OPERATION_LABELS: Record<OperationType, string> = {
  roughing: "Roughing",
  finishing: "Finishing",
  drilling: "Drilling",
  tapping: "Tapping",
  boring: "Boring",
  reaming: "Reaming",
  chamfering: "Chamfering",
  slotting: "Slotting",
  "thread-milling": "Thread Milling",
  "face-milling": "Face Milling",
  "plunge-roughing": "Plunge Roughing",
  "trochoidal-milling": "Trochoidal Milling",
  "helical-interpolation": "Helical Interpolation",
};

export const TOOL_TYPE_LABELS: Record<ToolType, string> = {
  "endmill-flat": "Flat End Mill",
  "endmill-ball": "Ball Nose End Mill",
  "endmill-corner": "Corner Radius End Mill",
  "endmill-tapered": "Tapered End Mill",
  "endmill-roughing": "Roughing End Mill",
  "face-mill": "Face Mill",
  "drill-spot": "Spot Drill",
  "drill-twist": "Twist Drill",
  "drill-center": "Center Drill",
  "drill-gun": "Gun Drill",
  "drill-indexable": "Indexable Drill",
  "drill-spade": "Spade Drill",
  "drill-step": "Step Drill",
  "tap-cutting": "Cutting Tap",
  "tap-forming": "Forming Tap",
  "thread-mill": "Thread Mill",
  "boring-bar": "Boring Bar",
  "boring-head": "Boring Head",
  reamer: "Reamer",
  "chamfer-mill": "Chamfer Mill",
  countersink: "Countersink",
  "slitting-saw": "Slitting Saw",
  "dovetail-cutter": "Dovetail Cutter",
  "t-slot-cutter": "T-Slot Cutter",
  "keyseat-cutter": "Keyseat Cutter",
  "woodruff-cutter": "Woodruff Keyseat Cutter",
};

export const TOOL_MATERIAL_LABELS: Record<ToolMaterial, string> = {
  hss: "HSS",
  "hss-cobalt": "HSS-Co (Cobalt)",
  carbide: "Carbide",
  "carbide-micrograin": "Micrograin Carbide",
  cbn: "CBN (Cubic Boron Nitride)",
  pcd: "PCD (Polycrystalline Diamond)",
  cermet: "Cermet",
  ceramic: "Ceramic",
  "coated-carbide": "Coated Carbide",
  "coated-hss": "Coated HSS",
};

export const COATING_LABELS: Record<ToolCoating, string> = {
  uncoated: "Uncoated",
  tin: "TiN (Gold)",
  ticn: "TiCN (Blue-Gray)",
  tialn: "TiAlN (Violet)",
  altin: "AlTiN (Blue-Black)",
  craln: "CrAlN (Dark Gray)",
  diamond: "Diamond (Carbon)",
  zrn: "ZrN (Silver)",
};

export const INSERT_SHAPE_LABELS: Record<InsertShape, string> = {
  C: "80° Rhombic (C)",
  D: "55° Rhombic (D)",
  S: "Square (S)",
  T: "Triangular (T)",
  V: "35° Diamond (V)",
  W: "80° Trigon (W)",
  L: "Rectangular (L)",
  A: "85° Parallelogram (A)",
  B: "82° Parallelogram (B)",
  K: "55° Parallelogram (K)",
  E: "75° Rhombic (E)",
  M: "86° Rhombic (M)",
  R: "Round (R)",
  H: "Hexagonal (H)",
};

export const COOLANT_OPTIONS: { value: ToolParams["coolant"]; label: string }[] = [
  { value: "flood", label: "Flood Coolant" },
  { value: "mist", label: "Mist Coolant" },
  { value: "air", label: "Air Blast" },
  { value: "through-spindle", label: "Through-Spindle (TSC)" },
  { value: "off", label: "Dry Machining" },
];

// ==========================================
// UTILITY FUNCTIONS
// ==========================================

export function calculateRPM(sfm: number, diameterMm: number): number {
  const diameterInches = diameterMm / 25.4;
  if (diameterInches <= 0) return 0;
  return Math.round((sfm * 3.82) / diameterInches);
}

export function calculateFeedRate(rpm: number, flutes: number, chipLoadMm: number): number {
  return Math.round(rpm * flutes * chipLoadMm);
}

export function calculateChipLoad(feedRate: number, rpm: number, flutes: number): number {
  if (rpm === 0 || flutes === 0) return 0;
  return parseFloat((feedRate / (rpm * flutes)).toFixed(4));
}

export function mmToIpm(mmPerMin: number): number {
  return parseFloat((mmPerMin / 25.4).toFixed(2));
}

export function ipmToMm(ipm: number): number {
  return parseFloat((ipm * 25.4).toFixed(1));
}

export function getSFMForMaterial(material: WorkpieceMaterial): { min: number; max: number } {
  const key = MATERIAL_SFM_LABELS[material];
  return SFM_RANGES[key]?.sfmLimits || { min: 200, max: 500 };
}

export function getChipLoadForMaterial(material: WorkpieceMaterial): { min: number; max: number } {
  const key = MATERIAL_SFM_LABELS[material];
  return SFM_RANGES[key]?.chipLoad || { min: 0.04, max: 0.12 };
}
