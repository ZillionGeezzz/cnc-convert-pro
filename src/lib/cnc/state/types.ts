import type { ControllerFormat } from "../types";

/**
 * Modal state tracked across blocks in a CNC program.
 * Each parsed or converted block can update this state.
 */
export interface MachineContext {
  /** Current machine position (modal — updates with each motion block) */
  position: Record<string, number>;

  /** Current modal G-group codes */
  modalG: {
    motion: "G00" | "G01" | "G02" | "G03" | "G33" | null; // Group 01
    plane: "G17" | "G18" | "G19" | null;                     // Group 02
    distance: "G90" | "G91" | null;                           // Group 03
    feedMode: "G94" | "G95" | "G96" | "G97" | null;          // Group 05
    units: "G20" | "G21" | null;                              // Group 06
    cutterComp: "G40" | "G41" | "G42" | null;                // Group 07
    returnMode: "G98" | "G99" | null;                         // Group 10
    workOffset: string | null;                                 // G54-G59, G54.1 Pn
  };

  /** Active M codes */
  activeM: string[];

  /** Current tool number */
  currentTool: number | null;
  /** Current tool offset (H number or D number) */
  currentToolOffset: number | null;

  /** Last programmed spindle speed */
  spindleSpeed: number | null;
  /** Last programmed feed rate */
  feedRate: number | null;

  /** Coolant state */
  coolant: "off" | "flood" | "mist" | "through-spindle";

  /** Spindle state */
  spindle: "off" | "forward" | "reverse";

  /** Unit system */
  units: "metric" | "imperial";

  /** Active fixed cycle */
  activeCycle: ActiveCycle | null;

  /** Whether we're in absolute or incremental mode */
  absoluteMode: boolean;

  /** Program counter (which block number we're at) */
  blockCount: number;

  /** Source format being parsed */
  sourceFormat: ControllerFormat;
}

export interface ActiveCycle {
  type: "drill" | "tap" | "bore" | "ream" | "peck-drill" | "other";
  gCode: string; // e.g., "G81", "G83", "CYCLE81"
  retractPlane: number;
  depth: number;
  dwell?: number;
  peckDepth?: number;
  pitch?: number;
}

/**
 * Factory for initial (default) machine context.
 */
export function createInitialContext(sourceFormat: ControllerFormat): MachineContext {
  return {
    position: {},
    modalG: {
      motion: null,
      plane: "G17",
      distance: "G90",
      feedMode: "G94",
      units: "G21",
      cutterComp: "G40",
      returnMode: "G98",
      workOffset: null,
    },
    activeM: [],
    currentTool: null,
    currentToolOffset: null,
    spindleSpeed: null,
    feedRate: null,
    coolant: "off",
    spindle: "off",
    units: "metric",
    activeCycle: null,
    absoluteMode: true,
    blockCount: 0,
    sourceFormat,
  };
}

/**
 * Deep clone a MachineContext.
 * Handles undefined, NaN, and edge values that JSON.parse(JSON.stringify(...)) would lose.
 */
export function cloneContext(ctx: MachineContext): MachineContext {
  return typeof structuredClone !== "undefined"
    ? structuredClone(ctx)
    : JSON.parse(JSON.stringify(ctx));
}

/**
 * Partial update type for MachineContext transitions.
 */
export type ContextDelta = Partial<MachineContext> & {
  modalG?: Partial<MachineContext["modalG"]>;
};
