import type { MachineContext } from "../state/types";

/**
 * Vendor-neutral intermediate representation block type.
 * Every CNC block normalizes into one of these categories.
 */
export type IRBlockType =
  | "rapid"              // G00 / L R0
  | "linear"             // G01 / L
  | "clockwise-arc"      // G02 / CR DR-
  | "counterclockwise-arc" // G03 / CR DR+
  | "helical"            // Helical interpolation
  | "cycle-drill"        // G81, CYCLE81, CYCL DEF 200
  | "cycle-peck-drill"   // G83, CYCLE83, CYCL DEF 202
  | "cycle-tap"          // G84, CYCLE84, CYCL DEF 203
  | "cycle-bore"         // G85-G89, CYCLE85-89, CYCL DEF 204-208
  | "cycle-other"        // Custom cycles
  | "cycle-definition"   // CYCL DEF / cycle parameter definition
  | "cycle-call"         // CYCL CALL / MCALL
  | "cycle-return-initial" // G98 return to initial plane
  | "cycle-return-r-plane" // G99 return to R plane
  | "tool-change"        // T M6 / TOOL CALL
  | "tool-definition"    // TOOL DEF
  | "tool-length-comp"   // G43 H / target-specific length offset activation
  | "tool-length-comp-off" // G49 / length offset cancel
  | "spindle-forward"    // M3 / M4
  | "spindle-reverse"    // M4
  | "spindle-stop"       // M5
  | "spindle-orient"     // M19
  | "coolant-flood"      // M8
  | "coolant-mist"       // M7
  | "coolant-off"        // M9
  | "units-metric"       // G21 / G71
  | "units-imperial"     // G20 / G70
  | "absolute-mode"      // G90
  | "incremental-mode"   // G91
  | "plane-xy"           // G17
  | "plane-xz"           // G18
  | "plane-yz"           // G19
  | "work-offset"        // G54-G59, G54.1 Pn
  | "cutter-comp-left"   // G41
  | "cutter-comp-right"  // G42
  | "cutter-comp-off"    // G40
  | "dwell"              // G04
  | "reference-return"   // G28 / G30
  | "feed-mode"          // G94 / G95 / G96 / G97
  | "program-start"
  | "program-end"
  | "subprogram-call"
  | "subprogram-end"
  | "label"
  | "goto"
  | "comment"
  | "block-skip"         // /
  | "operator-message"   // MSG()
  | "macro-definition"   // #1=100, Q1=5, FN0
  | "macro-computation"  // #100=#101+#102
  | "unknown";

/**
 * Axis position data for motion blocks.
 * All values are optional — only axes that change are present.
 */
export interface AxisTarget {
  x?: number;
  y?: number;
  z?: number;
  a?: number;
  b?: number;
  c?: number;
  u?: number;
  v?: number;
  w?: number;
  ix?: number; // Incremental X (Heidenhain)
  iy?: number;
  iz?: number;
  ia?: number;
  ib?: number;
  ic?: number;
  iu?: number;
  iv?: number;
  iw?: number;
  i?: number; // Arc center or thread axis
  j?: number;
  k?: number;
  r?: number; // Arc radius or cycle retract
}

/**
 * Vendor-neutral fixed cycle definition.
 */
export interface CycleDefinition {
  /** Semantic type */
  type: "drill" | "peck-drill" | "tap" | "bore" | "ream" | "other";
  /** Retract plane (R / RTP) */
  retractPlane: number;
  /** Reference plane / work surface used by target cycle templates */
  referencePlane?: number;
  /** Safety clearance above the reference plane */
  safetyClearance?: number;
  /** Final depth (Z / DP) — positive value = distance below retract plane */
  depth: number;
  /** Actual post-cycle return plane, distinct from Fanuc R plane when G98 is active */
  returnPlane?: number;
  /** Siemens absolute final drilling depth (DP), preserved with source sign */
  absoluteDepth?: number;
  /** Final depth relative to reference plane when source distinguishes DP/DPR */
  relativeDepth?: number;
  /** Heidenhain workpiece surface coordinate (Q203) */
  surfaceCoordinate?: number;
  /** Heidenhain second setup clearance (Q204) */
  secondSetupClearance?: number;
  /** Dwell at bottom (seconds) */
  dwell?: number;
  /** Peck depth for peck drilling (Q / MID) */
  peckDepth?: number;
  /** Thread pitch for tapping */
  pitch?: number;
  /** Chip break retract distance */
  chipBreak?: number;
  /** Feed rate for the cycle */
  feedRate?: number;
  /** Retraction feed rate for cycles that distinguish feed-in/feed-out */
  retractionFeedRate?: number;
  /** Original controller-specific cycle ID (for audit trail) */
  originalCycleId?: string;
  /** Source controller-specific cycle ID before family mapping */
  sourceCycleId?: string;
  /** Original controller-specific cycle parameters as raw string */
  originalParams?: string;
  /** Taper ratio (e.g. 0.0625 for 1:16 pipe threads) */
  taperRatio?: number;
}

/**
 * A transformation applied to a block during conversion.
 * Each transformation records source→target mapping for audit.
 */
export interface BlockTransformation {
  /** Identity of the transformation rule applied */
  ruleId: string;
  /** Human-readable description */
  description: string;
  /** Source representation before transformation */
  source: string;
  /** Target representation after transformation */
  target: string;
}

/**
 * Audit entry for the conversion audit trail.
 */
export interface AuditEntry {
  ruleId: string;
  description: string;
  source: string;
  target: string;
  confidence: "exact" | "approximate" | "manual-review-needed";
}

/**
 * Vendor-neutral intermediate representation of a single CNC block.
 *
 * Every block (from any controller format) normalizes into this structure
 * before being generated into the target format.
 */
export interface NeutralIRBlock {
  /** Semantic type of this block */
  type: IRBlockType;
  /** Raw source line (for reference / debugging) */
  raw: string;
  /** Optional comment */
  comment?: string;
  /** Line number (N word) */
  lineNumber?: number;
  /** Axis target positions */
  target?: AxisTarget;
  /** Feed rate (mm/min or inch/min depending on units) */
  feedRate?: number;
  /** Spindle speed (RPM) */
  spindleSpeed?: number;
  /** Maximum spindle speed (G96/G97 limiter) */
  maxSpindleSpeed?: number;
  /** Tool number */
  toolNumber?: number;
  /** Tool name (Siemens T="name") */
  toolName?: string;
  /** Tool offset number (H or D word) */
  toolOffset?: number;
  /** Tool offset length compensation (H word) */
  toolLengthOffset?: number;
  /** Tool radius compensation (D word) */
  toolRadiusOffset?: number;
  /** Work offset number (0 = G54, 1 = G55, etc., -1 = G54.1 Pn) */
  workOffset?: number;
  /** Work offset sub-index for G54.1 Pn */
  workOffsetSub?: number;
  /** Cycle definition (for cycle-type blocks) */
  cycle?: CycleDefinition;
  /** Cycle call flag (Siemens MCALL / Heidenhain CYCL CALL) */
  cycleCall?: boolean;
  /** Dwell time in seconds */
  dwell?: number;
  /** Subprogram call target */
  subprogram?: string;
  /** Label name/number */
  label?: string;
  /** Feed mode value (for feed-mode blocks) */
  feedModeValue?: "G94" | "G95" | "G96" | "G97";
  /** Reference point number (G28, G30) */
  referencePoint?: number;
  /** Transformation history (source→target for each conversion step) */
  transformations: BlockTransformation[];
  /** Audit trail entries */
  audit: AuditEntry[];
  /**
   * State delta: the changes this block makes to MachineContext.
   * Populated by the state machine, consumed by generators.
   */
  contextDelta?: MachineContext;
}

/**
 * Factory for creating a neutral IR block.
 */
export function createIRBlock(
  type: IRBlockType,
  raw: string,
  overrides?: Partial<NeutralIRBlock>,
): NeutralIRBlock {
  return {
    type,
    raw,
    transformations: [],
    audit: [],
    ...overrides,
  };
}
