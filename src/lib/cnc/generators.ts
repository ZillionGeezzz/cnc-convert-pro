/**
 * CNC Program Generators (State-Based Emission).
 *
 * Each generator reads NeutralIRBlock[] + MachineContext and emits
 * target-format G-code strings. Modal state is tracked so codes are
 * only emitted when they change (state-based emission).
 *
 * Architecture:
 * - Base generator handles common IR block types → target format
 * - Each controller format overrides specific behaviors
 * - The MachineStateMachine provides the current machine context
 * - The AuditTrail injector adds conversion comments
 */

import type { AxisTarget, NeutralIRBlock } from "./ir/types";
import type {
  ControllerFormat,
  ConversionOptions,
} from "./types";
import {
  formatCoordinate,
  formatRPM,
  formatSiemensCoordinate,
  formatFanucCoordinate,
  formatHeidenhainCoordinate,
} from "./utils/numbers";
import type { MachineStateMachine } from "./state/machine";
import type { MachineContext } from "./state/types";
import { AuditTrail } from "./audit/trail";
import { getControllerFamily } from "./ir/family";

// ==========================================
// GENERATOR DISPATCH
// ==========================================

export function generateProgram(
  blocks: NeutralIRBlock[],
  format: ControllerFormat,
  options?: ConversionOptions,
  machine?: MachineStateMachine,
): string {
  const family = getControllerFamily(format);
  const audit = new AuditTrail(true);

  switch (family) {
    case "siemens":
      return generateSiemens(blocks, format, options, audit, machine);
    case "heidenhain":
      return generateHeidenhain(blocks, format, options, audit, machine);
    case "mazak":
      return generateMazak(blocks, format, options, audit, machine);
    case "okuma":
      return generateOkuma(blocks, format, options, audit, machine);
    case "fagor":
      return generateFagor(blocks, format, options, audit, machine);
    case "bosch":
      return generateBosch(blocks, format, options, audit, machine);
    default:
      // Fanuc / Mitsubishi / Haas / Brother
      return generateFanuc(blocks, format, options, audit, machine);
  }
}

// ==========================================
// SHARED EMISSION HELPERS
// ==========================================

/**
 * Format an axis word for the target format.
 */
function formatAxis(
  axis: string,
  value: number,
  format: ControllerFormat,
): string {
  const family = getControllerFamily(format);
  switch (family) {
    case "siemens":
      return formatSiemensCoordinate(axis.toUpperCase(), value);
    case "heidenhain":
      return formatHeidenhainCoordinate(axis.toUpperCase(), value);
    default:
      return formatFanucCoordinate(axis.toUpperCase(), value);
  }
}

/**
 * Build the axis-position string from a target.
 */
function formatTarget(
  target: Partial<AxisTarget>,
  format: ControllerFormat,
  includeIJK = true,
): string {
  const parts: string[] = [];
  const axisOrder: (keyof AxisTarget)[] = ["x", "y", "z", "a", "b", "c", "u", "v", "w"];

  for (const axis of axisOrder) {
    const val = target[axis];
    if (val !== undefined) {
      parts.push(formatAxis(axis, val, format));
    }
  }

  if (includeIJK) {
    // I, J, K for arcs
    if (target.i !== undefined) {
      parts.push(formatAxis("i", target.i, format));
    }
    if (target.j !== undefined) {
      parts.push(formatAxis("j", target.j, format));
    }
    if (target.k !== undefined) {
      parts.push(formatAxis("k", target.k, format));
    }
    // R for radius
    if (target.r !== undefined) {
      parts.push(formatAxis("r", target.r, format));
    }
  }

  return parts.join(" ");
}

function formatCyclePositionTarget(
  target: NonNullable<NeutralIRBlock["target"]>,
  format: ControllerFormat,
): string {
  const position: Partial<AxisTarget> = {};
  const positionAxes: (keyof AxisTarget)[] = ["x", "y", "a", "b", "c", "u", "v", "w"];
  for (const axis of positionAxes) {
    const value = target[axis];
    if (value !== undefined) position[axis] = value;
  }
  return formatTarget(position, format, false);
}

/**
 * Format a comment for the target format.
 */
function formatComment(
  text: string,
  format: ControllerFormat,
): string {
  const family = getControllerFamily(format);
  if (family === "siemens" || family === "heidenhain" || format === "fagor-8055" || format === "bosch-mtx") {
    return `;${text}`;
  }
  return `(${text})`;
}

/**
 * Check if a comment is already present and combine.
 */
function maybeAddComment(
  line: string,
  comment: string | undefined,
  format: ControllerFormat,
): string {
  if (!comment) return line;
  const c = formatComment(comment, format);
  if (!line || line === c) return line || c;
  return line ? `${line} ${c}` : c;
}

function needsManualCycleReview(block: NeutralIRBlock): boolean {
  return (
    block.type === "cycle-other" ||
    block.audit.some((entry) => entry.confidence === "manual-review-needed")
  );
}

function hasUnknownFanucCycleReturnPlane(block: NeutralIRBlock): boolean {
  const cycle = block.cycle;
  const sourceCycleId = cycle?.sourceCycleId ?? cycle?.originalCycleId;
  return (
    !!sourceCycleId &&
    /^G0?8[1-9]$/i.test(sourceCycleId.trim()) &&
    cycle?.returnPlane === undefined
  );
}

function emitManualReviewCycleComment(
  block: NeutralIRBlock,
  format: ControllerFormat,
): string {
  const id = block.cycle?.originalCycleId ? ` ${block.cycle.originalCycleId}` : "";
  const raw = block.raw.trim().replace(/\s+/g, " ");
  const detail = raw ? `: ${raw}` : "";
  return formatComment(`MANUAL REVIEW: cycle not emitted${id}${detail}`, format);
}

type CycleIR = NonNullable<NeutralIRBlock["cycle"]>;

function cycleReferencePlane(cycle: CycleIR): number {
  return cycle.surfaceCoordinate ?? cycle.referencePlane ?? 0;
}

function cycleFinalDepth(cycle: CycleIR): number {
  if (cycle.absoluteDepth !== undefined) return cycle.absoluteDepth;
  if (cycle.relativeDepth !== undefined) return cycleReferencePlane(cycle) + cycle.relativeDepth;
  return cycleReferencePlane(cycle) - Math.abs(cycle.depth);
}

function shouldPreserveSiemensDepthFields(block: NeutralIRBlock): boolean {
  return /\bCYCLE\d+\s*\(/i.test(block.raw);
}

function siemensDepthFields(block: NeutralIRBlock, cycle: CycleIR): { dp: number; dpr: number } {
  if (cycle.absoluteDepth !== undefined) {
    return {
      dp: cycle.absoluteDepth,
      dpr: shouldPreserveSiemensDepthFields(block) ? cycle.relativeDepth ?? 0 : 0,
    };
  }

  if (cycle.relativeDepth !== undefined) {
    return { dp: 0, dpr: cycle.relativeDepth };
  }

  return { dp: cycleFinalDepth(cycle), dpr: 0 };
}

// ==========================================
// STATE-BASED EMISSION TRACKER
// ==========================================

/**
 * Tracks modal state to emit codes only on change.
 *
 * Unlike the standalone StateTracker, EmissionTracker initializes from
 * the MachineStateMachine's context so that the initial machine state
 * (G90, G21, G17, etc.) is already considered "emitted."
 *
 * This prevents redundant modal code emission:
 * - If the machine starts in G90, the first G90 block won't emit "G90"
 * - If a later block changes to G91, "G91" will be emitted
 * - If a later block changes back to G90, "G90" will be emitted
 */
class EmissionTracker {
  private state: Record<string, string | null> = {};
  private currentTool: number | null = null;

  constructor(ctx?: MachineContext) {
    if (ctx) {
      this.state = {
        motion: ctx.modalG.motion,
        plane: ctx.modalG.plane,
        distance: ctx.modalG.distance,
        units: ctx.modalG.units,
        cutter: ctx.modalG.cutterComp,
        feedMode: ctx.modalG.feedMode,
        workOffset: ctx.modalG.workOffset,
      };
    }
  }

  hasChanged(key: string, value: string | null): boolean {
    if (this.state[key] !== value) {
      this.state[key] = value;
      return true;
    }
    return false;
  }

  getTool(): number | null {
    return this.currentTool;
  }

  setTool(t: number | null): void {
    this.currentTool = t;
  }

  /**
   * Update the emission tracker based on a context delta.
   * Marks any changed modal values as needing re-emission.
   */
  processDelta(delta?: Partial<MachineContext>): void {
    if (!delta) return;
    const modalDelta = delta.modalG;
    if (!modalDelta) return;

    // Invalidate our state for keys that changed in the delta
    // so that hasChanged will return true for them
    for (const key of Object.keys(modalDelta)) {
      this.state[key] = null; // Force re-emission
    }
  }

  reset(): void {
    this.state = {};
  }
}

// ==========================================
// SIEMENS GENERATOR (840D / 828D)
// ==========================================

function generateSiemens(
  blocks: NeutralIRBlock[],
  format: ControllerFormat,
  options?: ConversionOptions,
  audit?: AuditTrail,
  machine?: MachineStateMachine,
): string {
  const lines: string[] = [];
  const state = new EmissionTracker();
  void machine;
  const progName = options?.programNumber ? `O${String(options.programNumber).padStart(4, "0")}` : "PROGRAM";

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    audit?.collectBlock(block);
    let line = "";

    switch (block.type) {
      case "program-start":
        lines.push(`%_N_${progName}_MPF`);
        lines.push(formatComment("Generated by CNC Converter", format));
        continue;

      case "program-end":
        if (block.comment) lines.push(maybeAddComment("M02", block.comment, format));
        else lines.push("M02");
        lines.push("%");
        continue;

      case "rapid":
        line = emitMotionSiemens(block, state, "G0", format);
        break;

      case "linear":
        line = emitMotionSiemens(block, state, "G1", format);
        break;

      case "clockwise-arc":
        line = emitMotionSiemens(block, state, "G2", format);
        break;

      case "counterclockwise-arc":
        line = emitMotionSiemens(block, state, "G3", format);
        break;

      case "cycle-drill":
      case "cycle-peck-drill":
      case "cycle-tap":
      case "cycle-bore":
      case "cycle-other":
        line = emitCycleSiemens(block, format);
        break;

      case "cycle-call":
        line = ""; // Siemens cycles are self-contained calls
        break;

      case "tool-change":
        state.setTool(block.toolNumber ?? null);
        line = `T${block.toolNumber || 1}`;
        if (block.spindleSpeed) {
          line += ` S=${formatRPM(block.spindleSpeed)}`;
        }
        break;

      case "tool-length-comp":
        line = block.toolLengthOffset !== undefined
          ? `D${block.toolLengthOffset}`
          : formatComment(`MANUAL REVIEW: tool length offset missing: ${block.raw.trim()}`, format);
        if (block.target) {
          const targetStr = formatTarget(block.target, format, false);
          if (targetStr) line += ` ${targetStr}`;
        }
        if (block.feedRate !== undefined) {
          line += ` F=${formatCoordinate(block.feedRate)}`;
        }
        break;

      case "tool-length-comp-off":
        line = "D0";
        break;

      case "spindle-forward":
        line = `M3`;
        if (block.spindleSpeed) {
          line = `S=${formatRPM(block.spindleSpeed)} M3`;
        }
        break;

      case "spindle-reverse":
        line = "M4";
        break;

      case "spindle-stop":
        line = "M5";
        break;

      case "coolant-flood":
        line = "M8";
        break;

      case "coolant-mist":
        line = "M7";
        break;

      case "coolant-off":
        line = "M9";
        break;

      case "units-metric":
        if (state.hasChanged("units", "G71")) line = "G71";
        break;

      case "units-imperial":
        if (state.hasChanged("units", "G70")) line = "G70";
        break;

      case "absolute-mode":
        if (state.hasChanged("distance", "G90")) line = "G90";
        break;

      case "incremental-mode":
        if (state.hasChanged("distance", "G91")) line = "G91";
        break;

      case "plane-xy":
        if (state.hasChanged("plane", "G17")) line = "G17";
        break;

      case "plane-xz":
        if (state.hasChanged("plane", "G18")) line = "G18";
        break;

      case "plane-yz":
        if (state.hasChanged("plane", "G19")) line = "G19";
        break;

      case "cutter-comp-off":
        if (state.hasChanged("cutter", "G40")) line = "G40";
        break;

      case "cutter-comp-left":
        if (state.hasChanged("cutter", "G41")) line = "G41";
        break;

      case "cutter-comp-right":
        if (state.hasChanged("cutter", "G42")) line = "G42";
        break;

      case "work-offset": {
        const offset = block.workOffset !== undefined ? `G${54 + block.workOffset}` : "G54";
        if (state.hasChanged("workOffset", offset)) line = offset;
        break;
      }

      case "feed-mode":
        if (block.feedModeValue && state.hasChanged("feedMode", block.feedModeValue)) {
          line = block.feedModeValue;
        }
        break;

      case "dwell":
        if (block.dwell !== undefined) {
          line = `G4 F${block.dwell}`;
        }
        break;

      case "reference-return":
        line = "G74"; // Siemens reference return
        break;

      case "comment":
        line = formatComment(block.comment || "", format);
        break;

      case "label":
        line = block.raw;
        break;

      case "macro-definition":
        line = block.raw;
        break;

      case "unknown":
        // Preserve the raw line as a comment
        if (block.raw.trim()) {
          line = formatComment(block.raw.trim(), format);
        }
        break;

      default:
        if (block.raw.trim()) {
          line = formatComment(block.raw.trim(), format);
        }
        break;
    }

    if (line) {
      lines.push(maybeAddComment(line, block.comment, format));
    }
  }

  return lines.join("\n");
}

function emitMotionSiemens(
  block: NeutralIRBlock,
  state: EmissionTracker,
  gCode: string,
  format: ControllerFormat,
): string {
  let line = gCode;

  if (block.target) {
    line += " " + formatTarget(block.target, format, true);
  }

  if (block.feedRate !== undefined) {
    line += ` F=${formatCoordinate(block.feedRate)}`;
  }

  if (block.spindleSpeed !== undefined) {
    // Only emit if changed from last block
    line += ` S=${formatRPM(block.spindleSpeed)}`;
  }

  // Modal M codes
  const mCodes = collectMCodes(block);
  if (mCodes.length > 0) {
    line += " " + mCodes.join(" ");
  }

  return line;
}

function emitCycleSiemens(
  block: NeutralIRBlock,
  format: ControllerFormat,
): string {
  if (!block.cycle) return formatComment(`Unknown cycle: ${block.raw}`, format);
  if (needsManualCycleReview(block) || hasUnknownFanucCycleReturnPlane(block)) {
    return emitManualReviewCycleComment(block, format);
  }

  const c = block.cycle;
  const targetId = c.originalCycleId?.toUpperCase() || "CYCLE81";
  const rtp = c.returnPlane ?? c.retractPlane;
  const rfp = cycleReferencePlane(c);
  const sdis = c.safetyClearance ?? Math.max(rtp - rfp, 0);
  const { dp, dpr } = siemensDepthFields(block, c);

  const common = [
    formatCoordinate(rtp),
    formatCoordinate(rfp),
    formatCoordinate(sdis),
    formatCoordinate(dp),
    formatCoordinate(dpr),
  ];

  let params: string;
  switch (targetId) {
    case "CYCLE82":
      params = [...common, formatCoordinate(c.dwell || 0)].join(",");
      break;
    case "CYCLE83":
      params = [
        ...common,
        formatCoordinate(c.peckDepth || Math.max(c.depth / 2, 1)),
        formatCoordinate(c.peckDepth || Math.max(c.depth / 2, 1)),
        formatCoordinate(c.chipBreak || 0),
        formatCoordinate(c.dwell || 0),
        "0",
        "1",
        "0",
      ].join(",");
      break;
    case "CYCLE84":
      params = [
        ...common,
        formatCoordinate(c.dwell || 0),
        "3",
        "0",
        formatCoordinate(c.pitch || 1.5),
        "0",
        block.spindleSpeed ? formatRPM(block.spindleSpeed) : "",
        "",
      ].join(",");
      break;
    case "CYCLE85":
      params = [
        ...common,
        formatCoordinate(c.dwell || 0),
        formatCoordinate(c.feedRate ?? block.feedRate ?? 0),
        formatCoordinate(c.retractionFeedRate ?? c.feedRate ?? block.feedRate ?? 0),
      ].join(",");
      break;
    default: // CYCLE81
      params = common.join(",");
      break;
  }

  const feed = block.feedRate ? ` F=${formatCoordinate(block.feedRate)}` : "";

  // Build axis words (X/Y for positioning)
  const axisWords = block.target ? formatCyclePositionTarget(block.target, format) : "";

  return `${axisWords} ${targetId}(${params})${feed}`.trim();
}

// ==========================================
// FANUC-STYLE GENERATOR
// ==========================================

function generateFanuc(
  blocks: NeutralIRBlock[],
  format: ControllerFormat,
  options?: ConversionOptions,
  audit?: AuditTrail,
  machine?: MachineStateMachine,
): string {
  const lines: string[] = [];
  const state = new EmissionTracker();
  void machine;
  const progNum = options?.programNumber || 1;
  const useDecimal = format === "haas";

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    audit?.collectBlock(block);
    let line = "";

    switch (block.type) {
      case "program-start":
        lines.push(`O${String(progNum).padStart(4, "0")}`);
        lines.push(formatComment("Generated by CNC Converter", format));
        continue;

      case "program-end":
        lines.push("M02");
        lines.push("%");
        continue;

      case "rapid":
        line = emitMotionFanuc(block, state, "G00", format, useDecimal);
        break;

      case "linear":
        line = emitMotionFanuc(block, state, "G01", format, useDecimal);
        break;

      case "clockwise-arc":
        line = emitMotionFanuc(block, state, "G02", format, useDecimal);
        break;

      case "counterclockwise-arc":
        line = emitMotionFanuc(block, state, "G03", format, useDecimal);
        break;

      case "cycle-drill":
        line = emitCycleFanuc(block, "G81", format, useDecimal);
        break;

      case "cycle-peck-drill":
        line = emitCycleFanuc(block, "G83", format, useDecimal);
        break;

      case "cycle-tap":
        line = emitCycleFanuc(block, "G84", format, useDecimal);
        break;

      case "cycle-bore":
        line = emitCycleFanuc(block, "G85", format, useDecimal);
        break;

      case "cycle-other":
        line = emitManualReviewCycleComment(block, format);
        break;

      case "tool-change":
        state.setTool(block.toolNumber ?? null);
        line = `T${String(block.toolNumber || 1).padStart(2, "0")} M6`;
        if (block.spindleSpeed) {
          line += ` S${formatRPM(block.spindleSpeed)}`;
        }
        break;

      case "tool-length-comp":
        line = block.toolLengthOffset !== undefined
          ? `G43 H${String(block.toolLengthOffset).padStart(2, "0")}`
          : "G43";
        if (block.target) {
          const targetStr = formatTarget(block.target, format, false);
          if (targetStr) line += ` ${targetStr}`;
        }
        if (block.feedRate !== undefined) {
          const feed = useDecimal ? block.feedRate.toFixed(2) : formatCoordinate(block.feedRate);
          line += ` F${feed}`;
        }
        break;

      case "tool-length-comp-off":
        line = "G49";
        break;

      case "spindle-forward":
        if (block.spindleSpeed) {
          line = `S${formatRPM(block.spindleSpeed)} M3`;
        } else {
          line = "M3";
        }
        break;

      case "spindle-reverse":
        line = "M4";
        break;

      case "spindle-stop":
        line = "M5";
        break;

      case "coolant-flood":
        line = "M8";
        break;

      case "coolant-mist":
        line = "M7";
        break;

      case "coolant-off":
        line = "M9";
        break;

      case "units-metric":
        if (state.hasChanged("units", "G21")) line = "G21";
        break;

      case "units-imperial":
        if (state.hasChanged("units", "G20")) line = "G20";
        break;

      case "absolute-mode":
        if (state.hasChanged("distance", "G90")) line = "G90";
        break;

      case "incremental-mode":
        if (state.hasChanged("distance", "G91")) line = "G91";
        break;

      case "cycle-return-initial":
        if (state.hasChanged("cycleReturn", "G98")) line = "G98";
        break;

      case "cycle-return-r-plane":
        if (state.hasChanged("cycleReturn", "G99")) line = "G99";
        break;

      case "plane-xy":
        if (state.hasChanged("plane", "G17")) line = "G17";
        break;

      case "plane-xz":
        if (state.hasChanged("plane", "G18")) line = "G18";
        break;

      case "plane-yz":
        if (state.hasChanged("plane", "G19")) line = "G19";
        break;

      case "cutter-comp-off":
        if (state.hasChanged("cutter", "G40")) line = "G40";
        break;

      case "cutter-comp-left":
        if (state.hasChanged("cutter", "G41")) line = "G41";
        break;

      case "cutter-comp-right":
        if (state.hasChanged("cutter", "G42")) line = "G42";
        break;

      case "work-offset": {
        const offset = block.workOffset !== undefined ? `G${54 + block.workOffset}` : "G54";
        if (state.hasChanged("workOffset", offset)) line = offset;
        break;
      }

      case "feed-mode":
        if (block.feedModeValue && state.hasChanged("feedMode", block.feedModeValue)) {
          line = block.feedModeValue;
        }
        break;

      case "dwell":
        if (block.dwell !== undefined) {
          line = `G04 P${Math.round(block.dwell * 1000)}`;
        }
        break;

      case "reference-return":
        line = block.referencePoint === 30 ? "G30" : "G28";
        break;

      case "comment":
        line = formatComment(block.comment || "", format);
        break;

      case "label":
        line = block.raw;
        break;

      case "macro-definition":
        line = block.raw;
        break;

      case "subprogram-call":
        line = block.subprogram ? `M98 P${block.subprogram}` : "M98";
        break;

      case "subprogram-end":
        line = "M99";
        break;

      case "unknown":
        if (block.raw.trim()) {
          line = formatComment(block.raw.trim(), format);
        }
        break;

      default:
        if (block.raw.trim()) {
          line = formatComment(block.raw.trim(), format);
        }
        break;
    }

    if (line) {
      lines.push(maybeAddComment(line, block.comment, format));
    }
  }

  return lines.join("\n");
}

function emitMotionFanuc(
  block: NeutralIRBlock,
  state: EmissionTracker,
  gCode: string,
  format: ControllerFormat,
  useDecimal: boolean,
): string {
  let line = gCode;

  if (block.target) {
    const targetStr = formatTarget(block.target, format, true);
    if (targetStr) line += " " + targetStr;
  }

  if (block.feedRate !== undefined) {
    const feed = useDecimal ? block.feedRate.toFixed(2) : formatCoordinate(block.feedRate);
    line += ` F${feed}`;
  }

  if (block.spindleSpeed !== undefined) {
    line += ` S${formatRPM(block.spindleSpeed)}`;
  }

  const mCodes = collectMCodes(block);
  if (mCodes.length > 0) {
    line += " " + mCodes.join(" ");
  }

  return line;
}

function emitCycleFanuc(
  block: NeutralIRBlock,
  defaultG: string,
  format: ControllerFormat,
  useDecimal: boolean,
): string {
  if (!block.cycle) {
    return formatComment(`Unknown cycle: ${block.raw}`, format);
  }
  if (needsManualCycleReview(block)) {
    return emitManualReviewCycleComment(block, format);
  }

  const c = block.cycle;
  const targetId = normalizeFanucCycleId(c.originalCycleId) || defaultG;

  // Axis positions
  const axisStr = block.target ? formatCyclePositionTarget(block.target, format) : "";
  const zVal = cycleFinalDepth(c);
  const zStr = formatFanucCoordinate("Z", zVal, { decimals: 3, keepTrailingDecimal: useDecimal });
  const rStr = formatFanucCoordinate("R", c.retractPlane, { decimals: 3, keepTrailingDecimal: useDecimal });
  const feed = block.feedRate
    ? `F${useDecimal ? block.feedRate.toFixed(2) : formatCoordinate(block.feedRate)}`
    : "";

  let extra = "";
  if (c.peckDepth && (targetId === "G83" || targetId === "G73")) {
    extra = `Q${formatCoordinate(c.peckDepth, { decimals: 2 })}`;
  }
  if (c.dwell && (targetId === "G82" || targetId === "G89")) {
    extra = `P${Math.round(c.dwell * 1000)}`;
  }

  return [targetId, axisStr, zStr, rStr, extra, feed].filter(Boolean).join(" ");
}

function normalizeFanucCycleId(originalCycleId: string | undefined): string | undefined {
  if (!originalCycleId) return undefined;
  const upper = originalCycleId.toUpperCase();
  if (/^G\d+/.test(upper)) return upper;

  const siemensMatch = upper.match(/^CYCLE(\d+)/);
  if (siemensMatch) {
    const num = Number(siemensMatch[1]);
    if (num >= 81 && num <= 89) return `G${num}`;
  }

  return undefined;
}

// ==========================================
// HEIDENHAIN GENERATOR
// ==========================================

function generateHeidenhain(
  blocks: NeutralIRBlock[],
  format: ControllerFormat,
  options?: ConversionOptions,
  audit?: AuditTrail,
  machine?: MachineStateMachine,
): string {
  const lines: string[] = [];
  const state = new EmissionTracker(machine?.context);
  const progName = options?.programNumber ? `PGM_${String(options.programNumber).padStart(4, "0")}` : "PROGRAM";
  let suppressNextCycleCall = false;

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    audit?.collectBlock(block);
    let line = "";

    switch (block.type) {
      case "program-start":
        lines.push(`BEGIN PGM ${progName} MM`);
        lines.push(formatComment("Generated by CNC Converter", format));
        continue;

      case "program-end":
        lines.push(`END PGM ${progName} MM`);
        continue;

      case "rapid":
        line = emitMotionHeidenhain(block, true);
        break;

      case "linear":
        line = emitMotionHeidenhain(block, false);
        break;

      case "clockwise-arc":
        line = emitArcHeidenhain(block, "DR-");
        break;

      case "counterclockwise-arc":
        line = emitArcHeidenhain(block, "DR+");
        break;

      case "cycle-drill":
        suppressNextCycleCall = shouldSuppressFollowingHeidenhainCycleCall(block);
        line = emitCycleHeidenhain(block, shouldInlineHeidenhainCycleCall(blocks, i));
        break;

      case "cycle-peck-drill":
        suppressNextCycleCall = shouldSuppressFollowingHeidenhainCycleCall(block);
        line = emitCycleHeidenhain(block, shouldInlineHeidenhainCycleCall(blocks, i));
        break;

      case "cycle-tap":
        suppressNextCycleCall = shouldSuppressFollowingHeidenhainCycleCall(block);
        line = emitCycleHeidenhain(block, shouldInlineHeidenhainCycleCall(blocks, i));
        break;

      case "cycle-bore":
        suppressNextCycleCall = shouldSuppressFollowingHeidenhainCycleCall(block);
        line = emitCycleHeidenhain(block, shouldInlineHeidenhainCycleCall(blocks, i));
        break;

      case "cycle-other":
        suppressNextCycleCall = shouldSuppressFollowingHeidenhainCycleCall(block);
        line = emitCycleHeidenhain(block, shouldInlineHeidenhainCycleCall(blocks, i));
        break;

      case "cycle-call":
        if (suppressNextCycleCall) {
          lines.push(formatComment(`MANUAL REVIEW: suppressed CYCL CALL after unsupported cycle: ${block.raw.trim()}`, format));
          suppressNextCycleCall = false;
          continue;
        }
        lines.push("CYCL CALL");
        suppressNextCycleCall = false;
        continue;

      case "tool-change":
        line = `TOOL CALL ${block.toolNumber || 1} Z S${formatRPM(block.spindleSpeed || 5000)}`;
        state.setTool(block.toolNumber ?? null);
        break;

      case "tool-definition":
        line = `TOOL DEF ${block.toolNumber || 1}`;
        break;

      case "spindle-forward":
        line = block.raw.includes("M13") ? "M13" : "M3";
        break;

      case "spindle-reverse":
        line = "M4";
        break;

      case "spindle-stop":
        line = "M5";
        break;

      case "coolant-flood":
        line = "M8";
        break;

      case "coolant-mist":
        line = "M7";
        break;

      case "coolant-off":
        line = "M9";
        break;

      case "units-metric":
        lines.push("MM");
        continue;

      case "units-imperial":
        lines.push("INCH");
        continue;

      case "absolute-mode":
        continue; // Heidenhain uses signed coordinates instead

      case "dwell":
        if (block.dwell !== undefined) {
          line = `CYCL DEF 9 DWELL TIME`;
          lines.push(line);
          line = `QL9=${block.dwell}`;
        }
        break;

      case "comment":
        line = formatComment(block.comment || "", format);
        break;

      case "label":
        line = block.raw;
        break;

      case "macro-definition":
        line = block.raw;
        break;

      case "unknown":
        if (block.raw.trim()) {
          // Preserve Heidenhain raw lines
          line = block.raw.trim();
        }
        break;

      default:
        if (block.raw.trim()) {
          line = formatComment(block.raw.trim(), format);
        }
        break;
    }

    if (line) {
      const finalLine = maybeAddComment(line, block.comment, format);
      // Heidenhain uses ; for comments already, so skip double-wrap
      lines.push(finalLine);
    }
  }

  return lines.join("\n");
}

function emitMotionHeidenhain(
  block: NeutralIRBlock,
  isRapid: boolean,
): string {
  let line = "L";
  if (block.target) {
    for (const axis of ["X", "Y", "Z", "A", "B", "C"] as const) {
      const key = axis.toLowerCase() as keyof AxisTarget;
      const val = block.target[key];
      if (val !== undefined) {
        const sign = val >= 0 ? "+" : "";
        line += ` ${axis}${sign}${formatCoordinate(val, { decimals: 3 })}`;
      }
    }
  }

  if (isRapid) line += " R0";
  if (block.feedRate) line += ` F${formatRPM(block.feedRate)}`;
  if (block.spindleSpeed) line += ` S${formatRPM(block.spindleSpeed)}`;

  const mCodes = collectMCodes(block);
  if (mCodes.length > 0) {
    line += " " + mCodes.join(" ");
  }

  return line;
}

function emitArcHeidenhain(
  block: NeutralIRBlock,
  direction: string,
): string {
  let line = "CR";
  if (block.target) {
    for (const axis of ["X", "Y", "Z"] as const) {
      const key = axis.toLowerCase() as keyof AxisTarget;
      const val = block.target[key];
      if (val !== undefined) {
        const sign = val >= 0 ? "+" : "";
        line += ` ${axis}${sign}${formatCoordinate(val, { decimals: 3 })}`;
      }
    }
    // Compute radius from I, J
    if (block.target.i !== undefined && block.target.j !== undefined) {
      const r = Math.sqrt(block.target.i * block.target.i + block.target.j * block.target.j);
      line += ` ${direction} R+${formatCoordinate(r, { decimals: 3 })}`;
    }
  }
  if (block.feedRate) line += ` F${formatRPM(block.feedRate)}`;
  return line;
}

function shouldInlineHeidenhainCycleCall(blocks: NeutralIRBlock[], index: number): boolean {
  const block = blocks[index];
  if (blocks[index + 1]?.type === "cycle-call") return false;
  if (/^\s*CYCL\s+DEF\b/i.test(block.raw)) return false;
  return true;
}

function shouldSuppressFollowingHeidenhainCycleCall(block: NeutralIRBlock): boolean {
  return needsManualCycleReview(block) || hasUnknownFanucCycleReturnPlane(block);
}

function emitCycleHeidenhain(block: NeutralIRBlock, includeCall: boolean): string {
  if (needsManualCycleReview(block) || hasUnknownFanucCycleReturnPlane(block)) {
    return emitManualReviewCycleComment(block, "heidenhain-tnc640");
  }

  const lines: string[] = [];
  const { cycleNum, operation } = getHeidenhainCycleHeader(block);
  lines.push(`CYCL DEF ${cycleNum} ${operation}`);
  if (block.cycle) {
    const c = block.cycle;
    const setup = c.safetyClearance ?? Math.max(c.retractPlane - (c.surfaceCoordinate ?? c.referencePlane ?? 0), 0);
    const surface = c.surfaceCoordinate ?? c.referencePlane ?? 0;
    const secondSetup = c.returnPlane !== undefined
      ? Math.max(c.returnPlane - surface, setup)
      : c.secondSetupClearance ?? Math.max(c.retractPlane - surface, setup);
    const feed = c.feedRate ?? block.feedRate ?? 0;

    lines.push(`Q200=${formatCoordinate(setup)} ;SET-UP CLEARANCE`);
    const depthFromSurface = c.relativeDepth ?? cycleFinalDepth(c) - surface;
    lines.push(`Q201=${formatHeidenhainSigned(depthFromSurface)} ;DEPTH`);
    if (cycleNum === "207" && c.pitch) {
      lines.push(`Q239=${formatCoordinate(c.pitch)} ;THREAD PITCH`);
    } else {
      lines.push(`Q206=${formatCoordinate(feed)} ;FEED RATE FOR PLNGNG`);
    }
    if (cycleNum === "200" || cycleNum === "203" || cycleNum === "205") {
      const plungingDepth = c.peckDepth ?? Math.abs(depthFromSurface);
      if (plungingDepth > 0) {
        lines.push(`Q202=${formatCoordinate(plungingDepth)} ;PLUNGING DEPTH`);
      }
    }
    lines.push(`Q203=${formatHeidenhainSigned(surface)} ;SURFACE COORDINATE`);
    lines.push(`Q204=${formatCoordinate(secondSetup)} ;2ND SET-UP CLEARANCE`);
    if (block.cycle.dwell) {
      lines.push(`Q211=${formatCoordinate(block.cycle.dwell)} ;DWELL TIME AT DEPTH`);
    }
  }

  // Axis position
  if (block.target) {
    const pos = formatCyclePositionTarget(block.target, "heidenhain-tnc640");
    if (pos) {
      lines.push(`L ${pos} R0 FMAX M3`);
    }
  }

  if (includeCall) {
    lines.push("CYCL CALL");
  }

  return lines.join("\n");
}

function getHeidenhainCycleHeader(block: NeutralIRBlock): { cycleNum: string; operation: string } {
  const original = block.cycle?.originalCycleId ?? "";
  const match = original.match(/CYCL\s+DEF\s+(\d+)/i);
  if (match) {
    return {
      cycleNum: match[1],
      operation: heidenhainOperationForCycle(match[1], block),
    };
  }

  switch (block.type) {
    case "cycle-peck-drill":
      return { cycleNum: "203", operation: "UNIVERSAL DRILLING" };
    case "cycle-tap":
      return { cycleNum: "206", operation: "TAPPING" };
    case "cycle-bore":
      return { cycleNum: "202", operation: "BORING" };
    case "cycle-other":
      return { cycleNum: "204", operation: "BACK BORING" };
    default:
      return { cycleNum: "200", operation: "DRILLING" };
  }
}

function heidenhainOperationForCycle(cycleNum: string, block: NeutralIRBlock): string {
  switch (cycleNum) {
    case "200":
      return "DRILLING";
    case "201":
      return "REAMING";
    case "202":
      return "BORING";
    case "203":
      return "UNIVERSAL DRILLING";
    case "204":
      return "BACK BORING";
    case "205":
      return "UNIVERSAL PECKING";
    case "206":
      return "TAPPING";
    case "207":
      return "RIGID TAPPING";
    default:
      return block.cycle?.type?.toUpperCase() ?? "DRILLING";
  }
}

function formatHeidenhainSigned(value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${formatCoordinate(value)}`;
}

// ==========================================
// MAZAK GENERATOR (Mazatrol-style)
// ==========================================

function generateMazak(
  blocks: NeutralIRBlock[],
  format: ControllerFormat,
  options?: ConversionOptions,
  audit?: AuditTrail,
  machine?: MachineStateMachine,
): string {
  // Mazak EIA/ISO: same as Fanuc
  if (format === "mazak-eia") {
    return generateFanuc(blocks, format, options, audit, machine);
  }

  // Mazatrol / Smooth: conversational format
  const lines: string[] = [];
  const state = new EmissionTracker(machine?.context);

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];
    audit?.collectBlock(block);
    let line = "";

    switch (block.type) {
      case "program-start":
        lines.push(`{UNIT SYSTEM METRIC}`);
        lines.push(formatComment("Generated by CNC Converter", format));
        continue;

      case "program-end":
        lines.push("M30");
        continue;

      case "rapid":
      case "linear":
      case "clockwise-arc":
      case "counterclockwise-arc":
        line = emitMotionFanuc(block, state, block.type === "rapid" ? "G00" : block.type === "linear" ? "G01" : block.type === "clockwise-arc" ? "G02" : "G03", format, false);
        break;

      case "cycle-drill":
        line = emitCycleFanuc(block, "G81", format, false);
        break;

      case "cycle-peck-drill":
        line = emitCycleFanuc(block, "G83", format, false);
        break;

      case "tool-change":
        line = `T${String(block.toolNumber || 1).padStart(2, "0")}`;
        if (block.spindleSpeed) line += ` S${formatRPM(block.spindleSpeed)}`;
        break;

      case "spindle-forward":
        line = "M3";
        break;

      case "spindle-stop":
        line = "M5";
        break;

      case "coolant-flood":
        line = "M8";
        break;

      case "coolant-off":
        line = "M9";
        break;

      case "comment":
        line = formatComment(block.comment || "", format);
        break;

      default:
        if (block.raw.trim()) {
          line = formatComment(block.raw.trim(), format);
        }
        break;
    }

    if (line) {
      lines.push(maybeAddComment(line, block.comment, format));
    }
  }

  return lines.join("\n");
}

// ==========================================
// OKUMA GENERATOR
// ==========================================

function generateOkuma(
  blocks: NeutralIRBlock[],
  format: ControllerFormat,
  options?: ConversionOptions,
  audit?: AuditTrail,
  machine?: MachineStateMachine,
): string {
  // Okuma uses Fanuc-like G-code with specific conventions
  return generateFanuc(blocks, format, options, audit, machine);
}

// ==========================================
// FAGOR GENERATOR
// ==========================================

function generateFagor(
  blocks: NeutralIRBlock[],
  format: ControllerFormat,
  options?: ConversionOptions,
  audit?: AuditTrail,
  machine?: MachineStateMachine,
): string {
  return generateFanuc(blocks, format, options, audit, machine);
}

// ==========================================
// BOSCH GENERATOR
// ==========================================

function generateBosch(
  blocks: NeutralIRBlock[],
  format: ControllerFormat,
  options?: ConversionOptions,
  audit?: AuditTrail,
  machine?: MachineStateMachine,
): string {
  // Bosch MTX uses Siemens-like G-code
  return generateSiemens(blocks, format, options, audit, machine);
}

// ==========================================
// UTILITY
// ==========================================

/**
 * Collect M-codes from a NeutralIRBlock by analyzing the block type.
 */
function collectMCodes(block: NeutralIRBlock): string[] {
  const mCodes: string[] = [];

  switch (block.type) {
    case "spindle-forward":
      mCodes.push("M3");
      break;
    case "spindle-reverse":
      mCodes.push("M4");
      break;
    case "spindle-stop":
      mCodes.push("M5");
      break;
    case "spindle-orient":
      mCodes.push("M19");
      break;
    case "coolant-flood":
      mCodes.push("M8");
      break;
    case "coolant-mist":
      mCodes.push("M7");
      break;
    case "coolant-off":
      mCodes.push("M9");
      break;
    case "tool-change":
      // M6 is implied by the type, handled separately in generators
      break;
    case "program-end":
      mCodes.push("M02");
      break;
  }

  return mCodes;
}
