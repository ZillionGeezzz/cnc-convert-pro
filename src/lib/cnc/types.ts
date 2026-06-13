/** Core types for CNC program conversion */

export type ControllerFormat = "siemens-840d" | "mitsubishi-m80";

export interface ControllerInfo {
  id: ControllerFormat;
  name: string;
  manufacturer: string;
  description: string;
}

export const CONTROLLERS: ControllerInfo[] = [
  {
    id: "siemens-840d",
    name: "SINUMERIK 840D",
    manufacturer: "Siemens",
    description: "Siemens 840D solution line — DIN/ISO with Siemens cycles",
  },
  {
    id: "mitsubishi-m80",
    name: "M80 Series",
    manufacturer: "Mitsubishi Electric",
    description: "Mitsubishi M80 Series — standard G-code with M70/M80 extensions",
  },
];

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

/** Tool types */
export type ToolType =
  | "endmill-flat"
  | "endmill-ball"
  | "endmill-corner"
  | "face-mill"
  | "drill-spot"
  | "drill-twist"
  | "drill-center"
  | "tap"
  | "boring-bar"
  | "reamer"
  | "chamfer-mill"
  | "thread-mill"
  | "slot-drill";

export type ToolMaterial = "hss" | "carbide" | "cbn" | "pcd" | "coated-carbide";

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
  | "face-milling";

export type WorkpieceMaterial =
  | "steel-mild"
  | "steel-alloy"
  | "steel-stainless"
  | "aluminum"
  | "brass"
  | "copper"
  | "titanium"
  | "cast-iron"
  | "plastic"
  | "wood";

export interface ToolDefinition {
  id: string;
  number: number;
  name: string;
  type: ToolType;
  diameter: number;
  flutes?: number;
  length?: number;
  material: ToolMaterial;
  maxRPM?: number;
  defaultParams: Partial<Record<OperationType, ToolParams>>;
  notes?: string;
}

export interface ToolParams {
  feedRate: number;
  spindleSpeed: number;
  depthOfCut: number;
  stepover?: number;
  peckDepth?: number;
  coolant: "flood" | "mist" | "air" | "off";
  description?: string;
}

export const WORKPIECE_MATERIALS: Record<WorkpieceMaterial, string> = {
  "steel-mild": "Mild Steel",
  "steel-alloy": "Alloy Steel",
  "steel-stainless": "Stainless Steel",
  aluminum: "Aluminum",
  brass: "Brass",
  copper: "Copper",
  titanium: "Titanium",
  "cast-iron": "Cast Iron",
  plastic: "Plastic",
  wood: "Wood",
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
};

export const TOOL_TYPE_LABELS: Record<ToolType, string> = {
  "endmill-flat": "Flat End Mill",
  "endmill-ball": "Ball Nose End Mill",
  "endmill-corner": "Corner Radius End Mill",
  "face-mill": "Face Mill",
  "drill-spot": "Spot Drill",
  "drill-twist": "Twist Drill",
  "drill-center": "Center Drill",
  tap: "Tap",
  "boring-bar": "Boring Bar",
  reamer: "Reamer",
  "chamfer-mill": "Chamfer Mill",
  "thread-mill": "Thread Mill",
  "slot-drill": "Slot Drill",
};
