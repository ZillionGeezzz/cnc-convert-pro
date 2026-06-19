import { describe, it, expect } from "vitest";
import { MachineStateMachine } from "./machine";
import {
  createInitialContext,
  cloneContext,
  type MachineContext,
  type ContextDelta,
} from "./types";
import type { NeutralIRBlock } from "../ir/types";

// ==========================================
// Context Type Tests
// ==========================================
describe("createInitialContext", () => {
  it("creates context with default values", () => {
    const ctx = createInitialContext("fanuc-0i");
    expect(ctx.sourceFormat).toBe("fanuc-0i");
    expect(ctx.modalG.plane).toBe("G17");
    expect(ctx.modalG.distance).toBe("G90");
    expect(ctx.modalG.units).toBe("G21");
    expect(ctx.modalG.cutterComp).toBe("G40");
    expect(ctx.modalG.feedMode).toBe("G94");
    expect(ctx.modalG.motion).toBeNull();
    expect(ctx.position).toEqual({});
    expect(ctx.currentTool).toBeNull();
    expect(ctx.currentToolOffset).toBeNull();
    expect(ctx.spindleSpeed).toBeNull();
    expect(ctx.feedRate).toBeNull();
    expect(ctx.coolant).toBe("off");
    expect(ctx.spindle).toBe("off");
    expect(ctx.units).toBe("metric");
    expect(ctx.absoluteMode).toBe(true);
    expect(ctx.blockCount).toBe(0);
    expect(ctx.activeCycle).toBeNull();
    expect(ctx.activeM).toEqual([]);
  });
});

describe("cloneContext", () => {
  it("creates a deep copy of context", () => {
    const ctx = createInitialContext("siemens-840d");
    ctx.position = { X: 100, Y: 50, Z: -10 };
    ctx.currentTool = 1;
    ctx.spindleSpeed = 5000;

    const cloned = cloneContext(ctx);
    expect(cloned).toEqual(ctx);
    expect(cloned).not.toBe(ctx);
    expect(cloned.position).not.toBe(ctx.position);
  });

  it("handles nested modalG object", () => {
    const ctx = createInitialContext("fanuc-0i");
    const cloned = cloneContext(ctx);
    expect(cloned.modalG).toEqual(ctx.modalG);
    expect(cloned.modalG).not.toBe(ctx.modalG);
  });
});

// ==========================================
// MachineStateMachine Tests
// ==========================================
describe("MachineStateMachine", () => {
  describe("constructor and reset", () => {
    it("initializes with source format", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      expect(machine.context.sourceFormat).toBe("fanuc-0i");
      expect(machine.history).toEqual([]);
    });

    it("reset restores initial state", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "linear",
        raw: "G01 X100",
        target: { x: 100 },
        transformations: [],
        audit: [],
      });

      expect(machine.context.blockCount).toBe(1);
      expect(machine.context.position).toEqual({ X: 100 });

      machine.reset("siemens-840d");
      expect(machine.context.sourceFormat).toBe("siemens-840d");
      expect(machine.context.blockCount).toBe(0);
      expect(machine.context.position).toEqual({});
      expect(machine.history).toEqual([]);
    });

    it("reset keeps current format if none specified", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "rapid",
        raw: "G00 X50",
        target: { x: 50 },
        transformations: [],
        audit: [],
      });
      machine.reset();
      expect(machine.context.sourceFormat).toBe("fanuc-0i");
    });
  });

  describe("motion blocks", () => {
    it("tracks G00 rapid moves", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      const delta = machine.step({
        type: "rapid",
        raw: "G00 X100 Y50",
        target: { x: 100, y: 50 },
        transformations: [],
        audit: [],
      });

      expect(machine.context.modalG.motion).toBe("G00");
      expect(machine.context.position).toEqual({ X: 100, Y: 50 });
    });

    it("tracks G01 linear moves", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "linear",
        raw: "G01 X200 F500",
        target: { x: 200 },
        feedRate: 500,
        transformations: [],
        audit: [],
      });

      expect(machine.context.modalG.motion).toBe("G01");
      expect(machine.context.position).toEqual({ X: 200 });
      expect(machine.context.feedRate).toBe(500);
    });

    it("tracks G02 clockwise arc", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "clockwise-arc",
        raw: "G02 X100 I50",
        target: { x: 100, i: 50 },
        transformations: [],
        audit: [],
      });

      expect(machine.context.modalG.motion).toBe("G02");
    });

    it("tracks G03 counterclockwise arc", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "counterclockwise-arc",
        raw: "G03 X100 I50",
        target: { x: 100, i: 50 },
        transformations: [],
        audit: [],
      });

      expect(machine.context.modalG.motion).toBe("G03");
    });

    it("accumulates position in absolute mode (default)", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "linear",
        raw: "G01 X100",
        target: { x: 100 },
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "linear",
        raw: "G01 X200",
        target: { x: 200 },
        transformations: [],
        audit: [],
      });

      expect(machine.context.position).toEqual({ X: 200 });
    });

    it("accumulates position incrementally in G91 mode", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "incremental-mode",
        raw: "G91",
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "linear",
        raw: "G01 X10",
        target: { x: 10 },
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "linear",
        raw: "G01 X20",
        target: { x: 20 },
        transformations: [],
        audit: [],
      });

      expect(machine.context.position).toEqual({ X: 30 });
    });

    it("updates position for arcs in incremental mode", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "incremental-mode",
        raw: "G91",
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "clockwise-arc",
        raw: "G02 X10 I5",
        target: { x: 10, i: 5 },
        transformations: [],
        audit: [],
      });

      // Position stores absolute coordinates, not arc offsets like I,J,K
      expect(machine.context.position).toEqual({ X: 10 });
    });
  });

  describe("tool management", () => {
    it("tracks tool-change", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "tool-change",
        raw: "T01 M6",
        toolNumber: 1,
        transformations: [],
        audit: [],
      });

      expect(machine.context.currentTool).toBe(1);
      expect(machine.context.currentToolOffset).toBe(1);
    });

    it("tracks tool-definition", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "tool-definition",
        raw: "T02",
        toolNumber: 2,
        transformations: [],
        audit: [],
      });

      expect(machine.context.currentTool).toBe(2);
      // toolOffset not set for tool-definition
      expect(machine.context.currentToolOffset).toBeNull();
    });

    it("tracks tool-change with explicit offset", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "tool-change",
        raw: "T01 D1 M6",
        toolNumber: 1,
        toolOffset: 1,
        transformations: [],
        audit: [],
      });

      expect(machine.context.currentTool).toBe(1);
      expect(machine.context.currentToolOffset).toBe(1);
    });
  });

  describe("spindle control", () => {
    it("tracks M3 spindle-forward with speed", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "spindle-forward",
        raw: "M03 S5000",
        spindleSpeed: 5000,
        transformations: [],
        audit: [],
      });

      expect(machine.context.spindle).toBe("forward");
      expect(machine.context.spindleSpeed).toBe(5000);
    });

    it("tracks M4 spindle-reverse", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "spindle-reverse",
        raw: "M04 S2000",
        spindleSpeed: 2000,
        transformations: [],
        audit: [],
      });

      expect(machine.context.spindle).toBe("reverse");
      expect(machine.context.spindleSpeed).toBe(2000);
    });

    it("tracks M5 spindle-stop", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "spindle-forward",
        raw: "M03 S5000",
        spindleSpeed: 5000,
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "spindle-stop",
        raw: "M05",
        transformations: [],
        audit: [],
      });

      expect(machine.context.spindle).toBe("off");
      // Spindle speed is preserved
      expect(machine.context.spindleSpeed).toBe(5000);
    });

    it("tracks M19 spindle-orient", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "spindle-forward",
        raw: "M03",
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "spindle-orient",
        raw: "M19",
        transformations: [],
        audit: [],
      });

      expect(machine.context.spindle).toBe("off");
    });
  });

  describe("coolant control", () => {
    it("tracks M8 coolant-flood", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "coolant-flood",
        raw: "M08",
        transformations: [],
        audit: [],
      });
      expect(machine.context.coolant).toBe("flood");
    });

    it("tracks M7 coolant-mist", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "coolant-mist",
        raw: "M07",
        transformations: [],
        audit: [],
      });
      expect(machine.context.coolant).toBe("mist");
    });

    it("tracks M9 coolant-off", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "coolant-flood",
        raw: "M08",
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "coolant-off",
        raw: "M09",
        transformations: [],
        audit: [],
      });
      expect(machine.context.coolant).toBe("off");
    });
  });

  describe("units", () => {
    it("defaults to metric", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      expect(machine.context.units).toBe("metric");
      expect(machine.context.modalG.units).toBe("G21");
    });

    it("tracks G20 imperial", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "units-imperial",
        raw: "G20",
        transformations: [],
        audit: [],
      });
      expect(machine.context.units).toBe("imperial");
      expect(machine.context.modalG.units).toBe("G20");
    });

    it("tracks G21 metric", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "units-metric",
        raw: "G21",
        transformations: [],
        audit: [],
      });
      expect(machine.context.units).toBe("metric");
      expect(machine.context.modalG.units).toBe("G21");
    });
  });

  describe("distance mode", () => {
    it("defaults to absolute", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      expect(machine.context.absoluteMode).toBe(true);
    });

    it("tracks G91 incremental mode", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "incremental-mode",
        raw: "G91",
        transformations: [],
        audit: [],
      });
      expect(machine.context.absoluteMode).toBe(false);
      expect(machine.context.modalG.distance).toBe("G91");
    });

    it("tracks G90 absolute mode", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "incremental-mode",
        raw: "G91",
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "absolute-mode",
        raw: "G90",
        transformations: [],
        audit: [],
      });
      expect(machine.context.absoluteMode).toBe(true);
      expect(machine.context.modalG.distance).toBe("G90");
    });
  });

  describe("plane selection", () => {
    it("tracks G17 XY plane", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "plane-xy",
        raw: "G17",
        transformations: [],
        audit: [],
      });
      expect(machine.context.modalG.plane).toBe("G17");
    });

    it("tracks G18 XZ plane", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "plane-xz",
        raw: "G18",
        transformations: [],
        audit: [],
      });
      expect(machine.context.modalG.plane).toBe("G18");
    });

    it("tracks G19 YZ plane", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "plane-yz",
        raw: "G19",
        transformations: [],
        audit: [],
      });
      expect(machine.context.modalG.plane).toBe("G19");
    });
  });

  describe("cutter compensation", () => {
    it("tracks G41 cutter-comp-left", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "cutter-comp-left",
        raw: "G41",
        transformations: [],
        audit: [],
      });
      expect(machine.context.modalG.cutterComp).toBe("G41");
    });

    it("tracks G42 cutter-comp-right", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "cutter-comp-right",
        raw: "G42",
        transformations: [],
        audit: [],
      });
      expect(machine.context.modalG.cutterComp).toBe("G42");
    });

    it("tracks G40 cutter-comp-off", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "cutter-comp-left",
        raw: "G41",
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "cutter-comp-off",
        raw: "G40",
        transformations: [],
        audit: [],
      });
      expect(machine.context.modalG.cutterComp).toBe("G40");
    });
  });

  describe("work offset", () => {
    it("tracks G54 work-offset (offset 0)", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "work-offset",
        raw: "G54",
        workOffset: 0,
        transformations: [],
        audit: [],
      });
      expect(machine.context.modalG.workOffset).toBe("G54");
    });

    it("tracks G59 work-offset (offset 5)", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "work-offset",
        raw: "G59",
        workOffset: 5,
        transformations: [],
        audit: [],
      });
      expect(machine.context.modalG.workOffset).toBe("G59");
    });
  });

  describe("cycle tracking", () => {
    it("tracks active cycle from cycle-drill blocks", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "cycle-drill",
        raw: "G81 Z-10 R2 F100",
        cycle: {
          type: "drill",
          retractPlane: 2,
          depth: 10,
          originalCycleId: "G81",
        },
        transformations: [],
        audit: [],
      });

      expect(machine.context.activeCycle).not.toBeNull();
      expect(machine.context.activeCycle!.type).toBe("drill");
      expect(machine.context.activeCycle!.gCode).toBe("G81");
      expect(machine.context.activeCycle!.depth).toBe(10);
      expect(machine.context.activeCycle!.retractPlane).toBe(2);
    });

    it("tracks cycle-peck-drill with peck depth", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "cycle-peck-drill",
        raw: "G83 Z-20 R2 Q5 F100",
        cycle: {
          type: "peck-drill",
          retractPlane: 2,
          depth: 20,
          peckDepth: 5,
          originalCycleId: "G83",
        },
        transformations: [],
        audit: [],
      });

      expect(machine.context.activeCycle).not.toBeNull();
      expect(machine.context.activeCycle!.type).toBe("peck-drill");
      expect(machine.context.activeCycle!.peckDepth).toBe(5);
    });
  });

  describe("feed and speed updates", () => {
    it("updates feedRate from motion blocks", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "linear",
        raw: "G01 X100 F500",
        target: { x: 100 },
        feedRate: 500,
        transformations: [],
        audit: [],
      });
      expect(machine.context.feedRate).toBe(500);
    });

    it("spindle speed from motion blocks is tracked", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "linear",
        raw: "G01 X100 S3000",
        target: { x: 100 },
        spindleSpeed: 3000,
        transformations: [],
        audit: [],
      });
      expect(machine.context.spindleSpeed).toBe(3000);
    });
  });

  describe("program start/end", () => {
    it("resets position and block count on program-start", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      // Add some state
      machine.step({
        type: "linear",
        raw: "G01 X100",
        target: { x: 100 },
        transformations: [],
        audit: [],
      });
      // program-start resets
      machine.step({
        type: "program-start",
        raw: "O0001",
        transformations: [],
        audit: [],
      });

      expect(machine.context.position).toEqual({});
      expect(machine.context.blockCount).toBe(0); // reset to 0 by program-start
    });

    it("stops spindle and coolant on program-end", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "spindle-forward",
        raw: "M03",
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "coolant-flood",
        raw: "M08",
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "program-end",
        raw: "M30",
        transformations: [],
        audit: [],
      });

      expect(machine.context.spindle).toBe("off");
      expect(machine.context.coolant).toBe("off");
    });
  });

  describe("reference return", () => {
    it("clears position on reference-return", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "linear",
        raw: "G01 X100 Y50",
        target: { x: 100, y: 50 },
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "reference-return",
        raw: "G28",
        transformations: [],
        audit: [],
      });

      expect(machine.context.position).toEqual({});
    });
  });

  describe("feed mode", () => {
    it("tracks G94 feed per minute", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "feed-mode",
        raw: "G94",
        feedModeValue: "G94",
        transformations: [],
        audit: [],
      });
      expect(machine.context.modalG.feedMode).toBe("G94");
    });

    it("tracks G95 feed per revolution", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "feed-mode",
        raw: "G95",
        feedModeValue: "G95",
        transformations: [],
        audit: [],
      });
      expect(machine.context.modalG.feedMode).toBe("G95");
    });
  });

  describe("contextDelta", () => {
    it("returns delta for changed fields", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      const delta = machine.step({
        type: "tool-change",
        raw: "T01 M6",
        toolNumber: 1,
        transformations: [],
        audit: [],
      });

      expect(delta.currentTool).toBe(1);
      expect(delta.blockCount).toBe(1);
    });

    it("attaches delta to block", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      const block: NeutralIRBlock = {
        type: "linear",
        raw: "G01 X100 F500",
        target: { x: 100 },
        feedRate: 500,
        transformations: [],
        audit: [],
      };
      machine.step(block);

      expect((block as any).contextDelta).toBeDefined();
      expect((block as any).contextDelta.modalG.motion).toBe("G01");
      expect((block as any).contextDelta.feedRate).toBe(500);
    });

    it("delta contains only changed fields", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      // First G00 → sets motion to G00
      machine.step({
        type: "rapid",
        raw: "G00 X50",
        target: { x: 50 },
        transformations: [],
        audit: [],
      });
      // Second G01 → motion changes to G01, position changes, blockCount changes
      const delta = machine.step({
        type: "linear",
        raw: "G01 X100",
        target: { x: 100 },
        transformations: [],
        audit: [],
      });

      expect(delta.modalG).toBeDefined();
      expect((delta.modalG as any).motion).toBe("G01");
      expect(delta.position).toEqual({ X: 100 });
    });
  });

  describe("getStateSummary", () => {
    it("returns empty string for initial state", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      expect(machine.getStateSummary()).toBe("G17 G90 G21 G94");
    });

    it("includes tool and speed info", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "tool-change",
        raw: "T01 M6",
        toolNumber: 1,
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "spindle-forward",
        raw: "M03 S5000",
        spindleSpeed: 5000,
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "linear",
        raw: "G01 X100 F500",
        target: { x: 100 },
        feedRate: 500,
        transformations: [],
        audit: [],
      });

      const summary = machine.getStateSummary();
      expect(summary).toContain("G01");
      expect(summary).toContain("T1");
      expect(summary).toContain("S5000");
      expect(summary).toContain("F500");
    });

    it("excludes G40 cutter comp from summary when off", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      const summary = machine.getStateSummary();
      expect(summary).not.toContain("G40");
    });

    it("includes active cutter comp", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "cutter-comp-left",
        raw: "G41",
        transformations: [],
        audit: [],
      });
      expect(machine.getStateSummary()).toContain("G41");
    });

    it("includes active work offset", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "work-offset",
        raw: "G54",
        workOffset: 0,
        transformations: [],
        audit: [],
      });
      expect(machine.getStateSummary()).toContain("G54");
    });
  });

  describe("blockCount", () => {
    it("increments on each step", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      expect(machine.context.blockCount).toBe(0);
      machine.step({
        type: "rapid",
        raw: "G00 X100",
        target: { x: 100 },
        transformations: [],
        audit: [],
      });
      expect(machine.context.blockCount).toBe(1);
      machine.step({
        type: "linear",
        raw: "G01 X100",
        target: { x: 100 },
        transformations: [],
        audit: [],
      });
      expect(machine.context.blockCount).toBe(2);
    });
  });

  describe("history", () => {
    it("records context after each step", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      expect(machine.history).toHaveLength(0);

      machine.step({
        type: "tool-change",
        raw: "T01 M6",
        toolNumber: 1,
        transformations: [],
        audit: [],
      });
      expect(machine.history).toHaveLength(1);
      expect(machine.history[0].currentTool).toBe(1);

      machine.step({
        type: "spindle-forward",
        raw: "M03 S5000",
        spindleSpeed: 5000,
        transformations: [],
        audit: [],
      });
      expect(machine.history).toHaveLength(2);
    });
  });

  describe("non-motion block types", () => {
    it("handles dwell blocks", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      const block: NeutralIRBlock = {
        type: "dwell",
        raw: "G04 P1",
        transformations: [],
        audit: [],
      };
      expect(() => machine.step(block)).not.toThrow();
      expect(machine.context.blockCount).toBe(1);
    });

    it("handles subprogram-call and subprogram-end", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "subprogram-call",
        raw: "M98 P1000",
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "subprogram-end",
        raw: "M99",
        transformations: [],
        audit: [],
      });
      expect(machine.context.blockCount).toBe(2);
    });

    it("handles label and goto", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "label",
        raw: "N100",
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "goto",
        raw: "GOTO 100",
        transformations: [],
        audit: [],
      });
      expect(machine.context.blockCount).toBe(2);
    });

    it("handles comment, block-skip, operator-message", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "comment",
        raw: "(THIS IS A COMMENT)",
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "block-skip",
        raw: "/G01 X100",
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "operator-message",
        raw: "MSG(\"TOOL CHANGE\")",
        transformations: [],
        audit: [],
      });
      expect(machine.context.blockCount).toBe(3);
    });

    it("handles macro-definition and macro-computation", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "macro-definition",
        raw: "#100=50",
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "macro-computation",
        raw: "#101=#100+10",
        transformations: [],
        audit: [],
      });
      expect(machine.context.blockCount).toBe(2);
    });

    it("handles unknown blocks", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "unknown",
        raw: "G999 X100",
        transformations: [],
        audit: [],
      });
      expect(machine.context.blockCount).toBe(1);
    });

    it("handles cycle-call and cycle-definition", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "cycle-call",
        raw: "CYCL CALL",
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "cycle-definition",
        raw: "CYCL DEF 200",
        transformations: [],
        audit: [],
      });
      expect(machine.context.blockCount).toBe(2);
    });

    it("handles helical interpolation", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "helical",
        raw: "G02 X100 Y50 Z-5 I10 J0",
        target: { x: 100, y: 50, z: -5, i: 10, j: 0 },
        feedRate: 500,
        transformations: [],
        audit: [],
      });
      expect(machine.context.modalG.motion).toBe("G02");
      // Position stores absolute coordinates, not arc offsets like I,J,K
      expect(machine.context.position).toEqual({ X: 100, Y: 50, Z: -5 });
    });
  });

  describe("position edge cases", () => {
    it("handles single-axis moves", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "rapid",
        raw: "G00 X10",
        target: { x: 10 },
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "rapid",
        raw: "G00 Y20",
        target: { y: 20 },
        transformations: [],
        audit: [],
      });
      machine.step({
        type: "rapid",
        raw: "G00 Z-5",
        target: { z: -5 },
        transformations: [],
        audit: [],
      });
      expect(machine.context.position).toEqual({ X: 10, Y: 20, Z: -5 });
    });

    it("handles blocks without target", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      expect(() =>
        machine.step({
          type: "rapid",
          raw: "G00",
          transformations: [],
          audit: [],
        }),
      ).not.toThrow();
    });

    it("handles position when initial key doesn't exist in incremental mode", () => {
      const machine = new MachineStateMachine("fanuc-0i");
      machine.step({
        type: "incremental-mode",
        raw: "G91",
        transformations: [],
        audit: [],
      });
      // First move in G91 where position key doesn't exist yet
      machine.step({
        type: "linear",
        raw: "G01 X10",
        target: { x: 10 },
        transformations: [],
        audit: [],
      });
      expect(machine.context.position).toEqual({ X: 10 });
    });
  });
});
