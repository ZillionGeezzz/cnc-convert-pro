import type { MachineProfile } from "../types";
import type { NeutralIRBlock } from "../ir/types";

/**
 * Safety validation rule interface.
 * Each rule receives the IR block, optional machine profile, and can
 * return warnings/errors.
 */
export interface SafetyRule {
  id: string;
  description: string;
  severity: "error" | "warning";
  check: (block: NeutralIRBlock, profile?: MachineProfile) => SafetyIssue | null;
}

export interface SafetyIssue {
  ruleId: string;
  blockIndex: number;
  message: string;
  severity: "error" | "warning";
  source: string;
  suggestion?: string;
}

// ==========================================
// CYCLE MAPPING DATABASE
// ==========================================

export interface CycleMapping {
  sourceCycle: string;
  sourceFamily: string;
  targetFamily: string;
  targetCycle: string;
  confidence: "exact" | "approximate" | "manual-review-needed";
  note: string;
}

/**
 * Comprehensive cycle mapping database.
 * Siemens CYCLE81-89 ↔ Fanuc G81-89 ↔ Heidenhain CYCL DEF 200-208
 */
export const CYCLE_MAPPINGS: CycleMapping[] = [
  // Drilling
  { sourceCycle: "CYCLE81", sourceFamily: "siemens", targetFamily: "fanuc", targetCycle: "G81", confidence: "exact", note: "Simple drilling" },
  { sourceCycle: "CYCLE82", sourceFamily: "siemens", targetFamily: "fanuc", targetCycle: "G82", confidence: "exact", note: "Drilling with dwell" },
  { sourceCycle: "CYCLE83", sourceFamily: "siemens", targetFamily: "fanuc", targetCycle: "G83", confidence: "approximate", note: "Deep-hole drilling parameters simplified" },
  { sourceCycle: "CYCLE84", sourceFamily: "siemens", targetFamily: "fanuc", targetCycle: "G84", confidence: "approximate", note: "Tapping parameters simplified" },
  { sourceCycle: "CYCLE85", sourceFamily: "siemens", targetFamily: "fanuc", targetCycle: "G85", confidence: "approximate", note: "Boring feed/retraction parameters simplified" },
  { sourceCycle: "CYCLE86", sourceFamily: "siemens", targetFamily: "fanuc", targetCycle: "G86", confidence: "approximate", note: "Boring, spindle stop, rapid out" },
  { sourceCycle: "CYCLE87", sourceFamily: "siemens", targetFamily: "fanuc", targetCycle: "G87", confidence: "manual-review-needed", note: "Back boring requires review" },
  { sourceCycle: "CYCLE88", sourceFamily: "siemens", targetFamily: "fanuc", targetCycle: "G88", confidence: "manual-review-needed", note: "Boring with manual retract requires review" },
  { sourceCycle: "CYCLE89", sourceFamily: "siemens", targetFamily: "fanuc", targetCycle: "G89", confidence: "approximate", note: "Boring with dwell, feed out" },

  // Heidenhain → Fanuc
  { sourceCycle: "CYCL DEF 200", sourceFamily: "heidenhain", targetFamily: "fanuc", targetCycle: "G81", confidence: "exact", note: "Simple drilling" },
  { sourceCycle: "CYCL DEF 201", sourceFamily: "heidenhain", targetFamily: "fanuc", targetCycle: "G85", confidence: "approximate", note: "Reaming mapped to boring/reaming" },
  { sourceCycle: "CYCL DEF 202", sourceFamily: "heidenhain", targetFamily: "fanuc", targetCycle: "G85", confidence: "approximate", note: "Boring mapped to basic boring" },
  { sourceCycle: "CYCL DEF 203", sourceFamily: "heidenhain", targetFamily: "fanuc", targetCycle: "G83", confidence: "approximate", note: "Universal drilling mapped to peck drilling" },
  { sourceCycle: "CYCL DEF 204", sourceFamily: "heidenhain", targetFamily: "fanuc", targetCycle: "G87", confidence: "manual-review-needed", note: "Back boring requires review" },
  { sourceCycle: "CYCL DEF 205", sourceFamily: "heidenhain", targetFamily: "fanuc", targetCycle: "G83", confidence: "approximate", note: "Universal pecking mapped to peck drilling" },
  { sourceCycle: "CYCL DEF 206", sourceFamily: "heidenhain", targetFamily: "fanuc", targetCycle: "G84", confidence: "approximate", note: "Tapping mapped to Fanuc tapping" },
  { sourceCycle: "CYCL DEF 207", sourceFamily: "heidenhain", targetFamily: "fanuc", targetCycle: "G84", confidence: "approximate", note: "Rigid tapping mapped to Fanuc tapping" },

  // Heidenhain → Siemens
  { sourceCycle: "CYCL DEF 200", sourceFamily: "heidenhain", targetFamily: "siemens", targetCycle: "CYCLE81", confidence: "exact", note: "Simple drilling" },
  { sourceCycle: "CYCL DEF 201", sourceFamily: "heidenhain", targetFamily: "siemens", targetCycle: "CYCLE85", confidence: "approximate", note: "Reaming mapped to boring/reaming" },
  { sourceCycle: "CYCL DEF 202", sourceFamily: "heidenhain", targetFamily: "siemens", targetCycle: "CYCLE85", confidence: "approximate", note: "Boring mapped to boring cycle" },
  { sourceCycle: "CYCL DEF 203", sourceFamily: "heidenhain", targetFamily: "siemens", targetCycle: "CYCLE83", confidence: "approximate", note: "Universal drilling mapped to deep-hole drilling" },
  { sourceCycle: "CYCL DEF 204", sourceFamily: "heidenhain", targetFamily: "siemens", targetCycle: "CYCLE87", confidence: "manual-review-needed", note: "Back boring requires review" },
  { sourceCycle: "CYCL DEF 205", sourceFamily: "heidenhain", targetFamily: "siemens", targetCycle: "CYCLE83", confidence: "approximate", note: "Universal pecking mapped to deep-hole drilling" },
  { sourceCycle: "CYCL DEF 206", sourceFamily: "heidenhain", targetFamily: "siemens", targetCycle: "CYCLE84", confidence: "approximate", note: "Tapping mapped to Siemens tapping" },
  { sourceCycle: "CYCL DEF 207", sourceFamily: "heidenhain", targetFamily: "siemens", targetCycle: "CYCLE84", confidence: "approximate", note: "Rigid tapping mapped to Siemens tapping" },

  // Fanuc → Siemens
  { sourceCycle: "G81", sourceFamily: "fanuc", targetFamily: "siemens", targetCycle: "CYCLE81", confidence: "exact", note: "Simple drilling" },
  { sourceCycle: "G82", sourceFamily: "fanuc", targetFamily: "siemens", targetCycle: "CYCLE82", confidence: "exact", note: "Drilling with dwell" },
  { sourceCycle: "G83", sourceFamily: "fanuc", targetFamily: "siemens", targetCycle: "CYCLE83", confidence: "approximate", note: "Peck drilling parameters simplified" },
  { sourceCycle: "G84", sourceFamily: "fanuc", targetFamily: "siemens", targetCycle: "CYCLE84", confidence: "approximate", note: "Tapping parameters simplified" },
  { sourceCycle: "G85", sourceFamily: "fanuc", targetFamily: "siemens", targetCycle: "CYCLE85", confidence: "approximate", note: "Boring feed out parameters simplified" },

  // Fanuc → Heidenhain
  { sourceCycle: "G81", sourceFamily: "fanuc", targetFamily: "heidenhain", targetCycle: "CYCL DEF 200", confidence: "exact", note: "Simple drilling" },
  { sourceCycle: "G82", sourceFamily: "fanuc", targetFamily: "heidenhain", targetCycle: "CYCL DEF 200", confidence: "exact", note: "Drilling with dwell via Q211" },
  { sourceCycle: "G83", sourceFamily: "fanuc", targetFamily: "heidenhain", targetCycle: "CYCL DEF 203", confidence: "approximate", note: "Peck drilling mapped to universal drilling" },
  { sourceCycle: "G84", sourceFamily: "fanuc", targetFamily: "heidenhain", targetCycle: "CYCL DEF 206", confidence: "approximate", note: "Tapping mapped to Heidenhain tapping" },
  { sourceCycle: "G85", sourceFamily: "fanuc", targetFamily: "heidenhain", targetCycle: "CYCL DEF 202", confidence: "approximate", note: "Boring mapped to Heidenhain boring" },
];

/**
 * Look up a cycle mapping.
 */
export function lookupCycleMapping(
  sourceCycle: string,
  sourceFamily: string,
  targetFamily: string,
): CycleMapping | undefined {
  return CYCLE_MAPPINGS.find(
    (m) =>
      m.sourceCycle.toUpperCase() === sourceCycle.toUpperCase() &&
      m.sourceFamily === sourceFamily &&
      m.targetFamily === targetFamily,
  );
}

// ==========================================
// TRAVEL LIMIT CHECKS
// ==========================================

/**
 * Check if a motion block exceeds machine travel limits.
 */
export function checkTravelLimits(
  block: NeutralIRBlock,
  profile: MachineProfile,
  blockIndex: number,
): SafetyIssue | null {
  if (!block.target) return null;

  const limits: Record<string, number> = {
    x: profile.xTravel,
    y: profile.yTravel,
    z: profile.zTravel,
  };

  for (const [axis, val] of Object.entries(block.target)) {
    const key = axis.toLowerCase();
    const limit = limits[key];
    if (limit === undefined) continue;
    if (typeof val !== "number") continue;
    const absVal = Math.abs(val);
    if (absVal > limit * 1.1) {
      return {
        ruleId: "TRAVEL_LIMIT",
        blockIndex,
        message: `Axis ${axis.toUpperCase()} position ${absVal.toFixed(1)}mm exceeds machine travel limit of ${limit}mm`,
        severity: "warning",
        source: block.raw,
        suggestion: `Reduce ${axis.toUpperCase()} motion to ≤${limit}mm`,
      };
    }
  }
  return null;
}

// ==========================================
// SPINDLE SPEED CHECK
// ==========================================

/**
 * Check if spindle speed exceeds machine max RPM.
 */
export function checkSpindleSpeed(
  block: NeutralIRBlock,
  profile: MachineProfile,
  blockIndex: number,
): SafetyIssue | null {
  if (block.spindleSpeed === undefined) return null;
  if (block.spindleSpeed > profile.maxSpindleRPM) {
    return {
      ruleId: "SPINDLE_OVERSPEED",
      blockIndex,
      message: `Spindle speed ${block.spindleSpeed} RPM exceeds machine max of ${profile.maxSpindleRPM} RPM`,
      severity: "warning",
      source: block.raw,
      suggestion: `Reduce S to ≤${profile.maxSpindleRPM}`,
    };
  }
  return null;
}

// ==========================================
// TOOL CHANGE RULES
// ==========================================

/**
 * Check for tool change before spindle start (M3/M4 without T word).
 */
export function checkToolBeforeSpindle(
  block: NeutralIRBlock,
  _profile: MachineProfile | undefined,
  blockIndex: number,
  previousTool?: number | null,
): SafetyIssue | null {
  if (
    (block.type === "spindle-forward" || block.type === "spindle-reverse") &&
    !previousTool
  ) {
    return {
      ruleId: "TOOL_BEFORE_SPINDLE",
      blockIndex,
      message: "Spindle start commanded without a tool selected",
      severity: "warning",
      source: block.raw,
      suggestion: "Add a tool change (T M6) before M3/M4",
    };
  }
  return null;
}

/**
 * Check for missing M6 after T word.
 */
export function checkToolChangeWithM6(
  block: NeutralIRBlock,
  _profile: MachineProfile | undefined,
  blockIndex: number,
  previousTool?: number | null,
): SafetyIssue | null {
  void previousTool;
  // This is detected during parsing — the normalizer maps T+M6 → tool-change
  // If a standalone T word appears without M6, checkToolChangeWithM6 flags it
  if (block.type === "tool-definition") {
    return {
      ruleId: "TOOL_WITHOUT_M6",
      blockIndex,
      message: `Tool T${block.toolNumber} defined without M6 tool change command`,
      severity: "warning",
      source: block.raw,
      suggestion: `Add M6 after T${block.toolNumber} to execute the tool change`,
    };
  }
  return null;
}

// ==========================================
// CYCLE CONFIDENCE CHECKS
// ==========================================

/**
 * Check cycle conversion confidence.
 */
export function checkCycleConfidence(
  block: NeutralIRBlock,
  _profile: MachineProfile | undefined,
  blockIndex: number,
): SafetyIssue | null {
  const lowConfidenceAudit = block.audit.find(
    (a) => a.confidence === "approximate" || a.confidence === "manual-review-needed",
  );
  if (lowConfidenceAudit) {
    return {
      ruleId: "CYCLE_CONFIDENCE",
      blockIndex,
      message: `${lowConfidenceAudit.confidence === "manual-review-needed" ? "Manual review required" : "Approximate conversion"}: ${lowConfidenceAudit.description}`,
      severity: lowConfidenceAudit.confidence === "manual-review-needed" ? "error" : "warning",
      source: block.raw,
    };
  }
  return null;
}

/**
 * Check for G02/G03 without IJK or R.
 */
export function checkArcParameters(
  block: NeutralIRBlock,
  _profile: MachineProfile | undefined,
  blockIndex: number,
): SafetyIssue | null {
  if (block.type !== "clockwise-arc" && block.type !== "counterclockwise-arc") return null;
  if (!block.target) return null;

  const t = block.target;
  const hasIJK = t.i !== undefined || t.j !== undefined || t.k !== undefined;
  const hasR = t.r !== undefined;

  if (!hasIJK && !hasR) {
    return {
      ruleId: "ARC_NO_PARAMS",
      blockIndex,
      message: "Arc motion without I/J/K or R parameters",
      severity: "error",
      source: block.raw,
      suggestion: "Add center point (I J K) or radius (R) for arc interpolation",
    };
  }
  return null;
}

/**
 * Check for coolant before spindle (common mistake).
 */
export function checkCoolantBeforeSpindle(
  block: NeutralIRBlock,
  _profile: MachineProfile | undefined,
  blockIndex: number,
  spindleOn: boolean,
): SafetyIssue | null {
  if (
    (block.type === "coolant-flood" || block.type === "coolant-mist") &&
    !spindleOn
  ) {
    return {
      ruleId: "COOLANT_BEFORE_SPINDLE",
      blockIndex,
      message: "Coolant commanded before spindle is running",
      severity: "warning",
      source: block.raw,
      suggestion: "Start spindle (M3/M4) before coolant",
    };
  }
  return null;
}
