import { MachineContext, ContextDelta, createInitialContext, cloneContext } from "./types";
import type { ControllerFormat } from "../types";
import type { NeutralIRBlock } from "../ir/types";

/**
 * MachineContext state machine.
 *
 * Walks through an array of NeutralIRBlock blocks and updates the machine
 * context for each block. Tracks all modal state transitions.
 *
 * Usage:
 *   const machine = new MachineStateMachine("siemens-840d");
 *   for (const irBlock of irBlocks) {
 *     machine.step(irBlock);
 *     console.log(machine.context.position);
 *   }
 */
export class MachineStateMachine {
  context: MachineContext;
  history: MachineContext[] = [];

  constructor(sourceFormat: ControllerFormat) {
    this.context = createInitialContext(sourceFormat);
  }

  /**
   * Reset the state machine to initial state.
   */
  reset(format?: ControllerFormat): void {
    this.context = createInitialContext(format || this.context.sourceFormat);
    this.history = [];
  }

  /**
   * Step through one IR block, updating the context.
   * Returns the context delta (what changed).
   */
  step(block: NeutralIRBlock): ContextDelta {
    const prev = cloneContext(this.context);
    this.context.blockCount++;

    switch (block.type) {
      // ==========================================
      // MOTION MODAL — Group 01
      // ==========================================
      case "rapid":
        this.context.modalG.motion = "G00";
        this._updatePosition(block);
        this._updateFeedAndSpeed(block);
        break;

      case "linear":
        this.context.modalG.motion = "G01";
        this._updatePosition(block);
        this._updateFeedAndSpeed(block);
        break;

      case "clockwise-arc":
        this.context.modalG.motion = "G02";
        this._updatePosition(block);
        this._updateFeedAndSpeed(block);
        break;

      case "counterclockwise-arc":
        this.context.modalG.motion = "G03";
        this._updatePosition(block);
        this._updateFeedAndSpeed(block);
        break;

      case "helical":
        this.context.modalG.motion = "G02"; // modal G may not apply, but track
        this._updatePosition(block);
        this._updateFeedAndSpeed(block);
        break;

      // ==========================================
      // TOOL
      // ==========================================
      case "tool-change":
        if (block.toolNumber !== undefined) {
          this.context.currentTool = block.toolNumber;
        }
        this.context.currentToolOffset = block.toolOffset ?? block.toolNumber ?? null;
        break;

      case "tool-definition":
        if (block.toolNumber !== undefined) {
          this.context.currentTool = block.toolNumber;
        }
        break;

      // ==========================================
      // SPINDLE
      // ==========================================
      case "spindle-forward":
        this.context.spindle = "forward";
        if (block.spindleSpeed !== undefined) {
          this.context.spindleSpeed = block.spindleSpeed;
        }
        break;

      case "spindle-reverse":
        this.context.spindle = "reverse";
        if (block.spindleSpeed !== undefined) {
          this.context.spindleSpeed = block.spindleSpeed;
        }
        break;

      case "spindle-stop":
        this.context.spindle = "off";
        break;

      case "spindle-orient":
        this.context.spindle = "off";
        break;

      // ==========================================
      // COOLANT
      // ==========================================
      case "coolant-flood":
        this.context.coolant = "flood";
        break;

      case "coolant-mist":
        this.context.coolant = "mist";
        break;

      case "coolant-off":
        this.context.coolant = "off";
        break;

      // ==========================================
      // UNITS — Group 06
      // ==========================================
      case "units-metric":
        this.context.modalG.units = "G21";
        this.context.units = "metric";
        break;

      case "units-imperial":
        this.context.modalG.units = "G20";
        this.context.units = "imperial";
        break;

      // ==========================================
      // DISTANCE MODE — Group 03
      // ==========================================
      case "absolute-mode":
        this.context.modalG.distance = "G90";
        this.context.absoluteMode = true;
        break;

      case "incremental-mode":
        this.context.modalG.distance = "G91";
        this.context.absoluteMode = false;
        break;

      // ==========================================
      // PLANE — Group 02
      // ==========================================
      case "plane-xy":
        this.context.modalG.plane = "G17";
        break;

      case "plane-xz":
        this.context.modalG.plane = "G18";
        break;

      case "plane-yz":
        this.context.modalG.plane = "G19";
        break;

      // ==========================================
      // CUTTER COMP — Group 07
      // ==========================================
      case "cutter-comp-left":
        this.context.modalG.cutterComp = "G41";
        break;

      case "cutter-comp-right":
        this.context.modalG.cutterComp = "G42";
        break;

      case "cutter-comp-off":
        this.context.modalG.cutterComp = "G40";
        break;

      // ==========================================
      // WORK OFFSET
      // ==========================================
      case "work-offset":
        this.context.modalG.workOffset = block.workOffset !== undefined
          ? `G${54 + block.workOffset}`
          : null;
        break;

      // ==========================================
      // FEED MODE — Group 05
      // ==========================================
      case "feed-mode":
        this.context.modalG.feedMode = block.feedModeValue || "G94";
        break;

      // ==========================================
      // CYCLES
      // ==========================================
      case "cycle-drill":
      case "cycle-peck-drill":
      case "cycle-tap":
      case "cycle-bore":
      case "cycle-other":
        if (block.cycle) {
          this.context.activeCycle = {
            type: block.cycle.type,
            gCode: block.cycle.originalCycleId || block.type,
            retractPlane: block.cycle.retractPlane,
            depth: block.cycle.depth,
            dwell: block.cycle.dwell,
            peckDepth: block.cycle.peckDepth,
            pitch: block.cycle.pitch,
          };
        }
        this._updateFeedAndSpeed(block);
        break;

      case "cycle-call":
        // Cycle call fires the active cycle
        break;

      case "cycle-definition":
        // Cycle parameter definition — may set cycle values
        break;

      // ==========================================
      // MISC
      // ==========================================
      case "dwell":
        break;

      case "reference-return":
        this.context.position = {};
        break;

      case "program-start":
        this.context.position = {};
        this.context.blockCount = 0;
        break;

      case "program-end":
        this.context.spindle = "off";
        this.context.coolant = "off";
        break;

      case "subprogram-call":
      case "subprogram-end":
      case "label":
      case "goto":
        break;

      case "comment":
      case "block-skip":
      case "operator-message":
        break;

      case "macro-definition":
      case "macro-computation":
        break;

      case "unknown":
        break;
    }

    // Track M codes as they appear (from transformations/audit context)
    if (block.type === "spindle-forward" || block.type === "spindle-stop" || block.type === "spindle-reverse") {
      // M codes are tracked via the semantic type
    }

    // Compute what changed
    const delta = this._computeDelta(prev, this.context);
    this.history.push(cloneContext(this.context));

    // Attach delta to block (any cast because NeutralIRBlock types ContextDelta as MachineContext for simplicity)
    (block as any).contextDelta = delta;
    return delta;
  }

  /**
   * Get the current machine state summary string.
   */
  getStateSummary(): string {
    const m = this.context.modalG;
    const parts: string[] = [];
    if (m.motion) parts.push(m.motion);
    if (m.plane) parts.push(m.plane);
    if (m.distance) parts.push(m.distance);
    if (m.units) parts.push(m.units);
    if (m.feedMode) parts.push(m.feedMode);
    if (m.cutterComp !== "G40") parts.push(m.cutterComp || "G40");
    if (m.workOffset) parts.push(m.workOffset);
    if (this.context.currentTool !== null) parts.push(`T${this.context.currentTool}`);
    if (this.context.spindleSpeed !== null) parts.push(`S${this.context.spindleSpeed}`);
    if (this.context.feedRate !== null) parts.push(`F${this.context.feedRate}`);
    return parts.join(" ");
  }

  // ==========================================
  // PRIVATE HELPERS
  // ==========================================

  private _updatePosition(block: NeutralIRBlock): void {
    if (!block.target) return;
    const isAbsoluteMode = this.context.absoluteMode;

    for (const [axis, value] of Object.entries(block.target)) {
      if (typeof value !== "number") continue;

      const isExplicitIncremental = axis.startsWith("i") && axis.length > 1;
      const baseAxis = isExplicitIncremental ? axis.slice(1).toUpperCase() : axis.toUpperCase();

      // Skip non-position axes like I, J, K, R for position tracking
      if (!["X", "Y", "Z", "A", "B", "C", "U", "V", "W"].includes(baseAxis)) continue;

      if (isExplicitIncremental || !isAbsoluteMode) {
        // Incremental update
        this.context.position[baseAxis] = (this.context.position[baseAxis] ?? 0) + value;
      } else {
        // Absolute update
        this.context.position[baseAxis] = value;
      }
    }
  }

  private _updateFeedAndSpeed(block: NeutralIRBlock): void {
    if (block.feedRate !== undefined) {
      this.context.feedRate = block.feedRate;
    }
    if (block.spindleSpeed !== undefined) {
      this.context.spindleSpeed = block.spindleSpeed;
    }
  }

  private _computeDelta(prev: MachineContext, current: MachineContext): ContextDelta {
    const delta: ContextDelta = {};

    for (const key of Object.keys(current) as (keyof MachineContext)[]) {
      if (key === "modalG") {
        const modalDelta: Partial<MachineContext["modalG"]> = {};
        const prevModal = prev.modalG;
        const curModal = current.modalG;
        for (const mkey of Object.keys(curModal) as (keyof typeof curModal)[]) {
          if (prevModal[mkey] !== curModal[mkey]) {
            (modalDelta as any)[mkey] = curModal[mkey];
          }
        }
        if (Object.keys(modalDelta).length > 0) {
          (delta as any).modalG = modalDelta;
        }
      } else if (JSON.stringify(prev[key]) !== JSON.stringify(current[key])) {
        (delta as any)[key] = current[key];
      }
    }

    return delta;
  }
}
