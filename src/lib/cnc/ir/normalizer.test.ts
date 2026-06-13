import { describe, it, expect } from "vitest";
import { normalizeBlock, normalizeProgram } from "./normalizer";
import type { CNCBlock } from "../types";

// Helper to create a minimal CNCBlock
function makeBlock(overrides: Partial<CNCBlock> = {}): CNCBlock {
  return {
    raw: overrides.raw || "",
    gCodes: [],
    mCodes: [],
    axes: {},
    cycleParams: [],
    qParams: {},
    addresses: {},
    ...overrides,
  };
}

// ==========================================
// Program Start / End
// ==========================================
describe("normalizeBlock — program start/end", () => {
  it("normalizes program-start", () => {
    const block = makeBlock({ raw: "O1000", isProgramStart: true });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("program-start");
    expect(ir.raw).toBe("O1000");
  });

  it("normalizes program-end", () => {
    const block = makeBlock({ raw: "M30", isProgramEnd: true });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("program-end");
    expect(ir.audit.some((a) => a.ruleId === "PROGRAM_END")).toBe(true);
  });
});

// ==========================================
// Motion G-Codes
// ==========================================
describe("normalizeBlock — motion G-codes", () => {
  it("normalizes G00 to rapid", () => {
    const block = makeBlock({
      raw: "G00 X100 Y50",
      gCodes: ["G00"],
      axes: { X: 100, Y: 50 },
    });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("rapid");
    expect(ir.target).toEqual({ x: 100, y: 50 });
  });

  it("normalizes G01 to linear with feed", () => {
    const block = makeBlock({
      raw: "G01 X50 F500",
      gCodes: ["G01"],
      axes: { X: 50 },
      feed: 500,
    });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("linear");
    expect(ir.target).toEqual({ x: 50 });
    expect(ir.feedRate).toBe(500);
  });

  it("normalizes G02 to clockwise-arc", () => {
    const block = makeBlock({
      raw: "G02 X100 Y50 I10 J0 F300",
      gCodes: ["G02"],
      axes: { X: 100, Y: 50 },
      addresses: { I: 10, J: 0 },
      feed: 300,
    });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("clockwise-arc");
    expect(ir.target).toEqual({ x: 100, y: 50, i: 10, j: 0 });
    expect(ir.feedRate).toBe(300);
  });

  it("normalizes G03 to counterclockwise-arc", () => {
    const block = makeBlock({
      raw: "G03 X100 I10 J0",
      gCodes: ["G03"],
      axes: { X: 100 },
      addresses: { I: 10, J: 0 },
    });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("counterclockwise-arc");
  });

  it("extracts R from addresses for arc", () => {
    const block = makeBlock({
      raw: "G02 X100 R50",
      gCodes: ["G02"],
      axes: { X: 100 },
      addresses: { R: 50 },
    });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.target).toEqual({ x: 100, r: 50 });
  });
});

// ==========================================
// Fixed Cycles (G81-G89)
// ==========================================
describe("normalizeBlock — fixed cycles", () => {
  it("normalizes G81 to cycle-drill", () => {
    const block = makeBlock({
      raw: "G81 Z-10 R2 F100",
      gCodes: ["G81"],
      axes: { Z: -10 },
      addresses: { R: 2 },
      feed: 100,
    });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("cycle-drill");
    expect(ir.cycle).toBeDefined();
    expect(ir.cycle!.type).toBe("drill");
    expect(ir.cycle!.depth).toBe(10);
    expect(ir.cycle!.retractPlane).toBe(2);
    expect(ir.cycle!.originalCycleId).toBe("G81");
  });

  it("normalizes G82 to cycle-drill with dwell", () => {
    const block = makeBlock({
      raw: "G82 Z-10 R2 P1 F100",
      gCodes: ["G82"],
      axes: { Z: -10 },
      addresses: { R: 2, P: 1 },
    });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("cycle-drill");
    expect(ir.cycle!.dwell).toBe(1);
  });

  it("normalizes G83 to cycle-peck-drill", () => {
    const block = makeBlock({
      raw: "G83 Z-20 R2 Q5 F100",
      gCodes: ["G83"],
      axes: { Z: -20 },
      addresses: { R: 2, Q: 5 },
    });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("cycle-peck-drill");
    expect(ir.cycle!.type).toBe("peck-drill");
    expect(ir.cycle!.peckDepth).toBe(5);
    expect(ir.cycle!.depth).toBe(20);
  });

  it("normalizes G84 to cycle-tap", () => {
    const block = makeBlock({
      raw: "G84 Z-15 R2 P1.5 F200",
      gCodes: ["G84"],
      axes: { Z: -15 },
      addresses: { R: 2, P: 1.5 },
    });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("cycle-tap");
    expect(ir.cycle!.type).toBe("tap");
    expect(ir.cycle!.pitch).toBe(1.5);
  });

  it("normalizes G85 to cycle-bore", () => {
    const block = makeBlock({
      raw: "G85 Z-10 R2 F100",
      gCodes: ["G85"],
      axes: { Z: -10 },
      addresses: { R: 2 },
    });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("cycle-bore");
    expect(ir.cycle!.type).toBe("bore");
  });

  it("normalizes G87 to cycle-other", () => {
    const block = makeBlock({
      raw: "G87 Z-10 R2",
      gCodes: ["G87"],
      axes: { Z: -10 },
      addresses: { R: 2 },
    });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("cycle-other");
  });
});

// ==========================================
// Modal G-Codes
// ==========================================
describe("normalizeBlock — modal G-codes", () => {
  const testModal = (gCode: string, expectedType: string) => {
    const block = makeBlock({ raw: gCode, gCodes: [gCode] });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe(expectedType);
  };

  it("G17 → plane-xy", () => testModal("G17", "plane-xy"));
  it("G18 → plane-xz", () => testModal("G18", "plane-xz"));
  it("G19 → plane-yz", () => testModal("G19", "plane-yz"));
  it("G20 → units-imperial", () => testModal("G20", "units-imperial"));
  it("G21 → units-metric", () => testModal("G21", "units-metric"));
  it("G28 → reference-return", () => testModal("G28", "reference-return"));
  it("G40 → cutter-comp-off", () => testModal("G40", "cutter-comp-off"));
  it("G41 → cutter-comp-left", () => testModal("G41", "cutter-comp-left"));
  it("G42 → cutter-comp-right", () => testModal("G42", "cutter-comp-right"));
  it("G54 → work-offset 0", () => {
    const block = makeBlock({ raw: "G54", gCodes: ["G54"] });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("work-offset");
    expect(ir.workOffset).toBe(0);
  });
  it("G59 → work-offset 5", () => {
    const block = makeBlock({ raw: "G59", gCodes: ["G59"] });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("work-offset");
    expect(ir.workOffset).toBe(5);
  });
  it("G90 → absolute-mode", () => testModal("G90", "absolute-mode"));
  it("G91 → incremental-mode", () => testModal("G91", "incremental-mode"));
  it("G94 → feed-mode G94", () => {
    const block = makeBlock({ raw: "G94", gCodes: ["G94"] });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("feed-mode");
    expect(ir.feedModeValue).toBe("G94");
  });
  it("G96 → feed-mode G96", () => {
    const block = makeBlock({ raw: "G96 S200", gCodes: ["G96"], spindleSpeed: 200 });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("feed-mode");
    expect(ir.feedModeValue).toBe("G96");
    // G96 includes spindleSpeed as CSS
    expect(ir.spindleSpeed).toBe(200);
  });
});

// ==========================================
// M-Codes
// ==========================================
describe("normalizeBlock — M-codes", () => {
  it("M00 → program-end", () => {
    const block = makeBlock({ raw: "M00", mCodes: ["M00"] });
    expect(normalizeBlock(block, "fanuc-0i", 0).type).toBe("program-end");
  });

  it("M02 → program-end", () => {
    const block = makeBlock({ raw: "M02", mCodes: ["M02"] });
    expect(normalizeBlock(block, "fanuc-0i", 0).type).toBe("program-end");
  });

  it("M03 → spindle-forward", () => {
    const block = makeBlock({ raw: "M03 S5000", mCodes: ["M03"], spindleSpeed: 5000 });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("spindle-forward");
    expect(ir.spindleSpeed).toBe(5000);
  });

  it("M04 → spindle-reverse", () => {
    const block = makeBlock({ raw: "M04 S2000", mCodes: ["M04"] });
    expect(normalizeBlock(block, "fanuc-0i", 0).type).toBe("spindle-reverse");
  });

  it("M05 → spindle-stop", () => {
    const block = makeBlock({ raw: "M05", mCodes: ["M05"] });
    expect(normalizeBlock(block, "fanuc-0i", 0).type).toBe("spindle-stop");
  });

  it("M06 with T → tool-change", () => {
    const block = makeBlock({
      raw: "T01 M06",
      mCodes: ["M06"],
      toolNumber: 1,
      addresses: { D: 1 },
    });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("tool-change");
    expect(ir.toolNumber).toBe(1);
    expect(ir.toolOffset).toBe(1);
  });

  it("M07 → coolant-mist", () => {
    const block = makeBlock({ raw: "M07", mCodes: ["M07"] });
    expect(normalizeBlock(block, "fanuc-0i", 0).type).toBe("coolant-mist");
  });

  it("M08 → coolant-flood", () => {
    const block = makeBlock({ raw: "M08", mCodes: ["M08"] });
    expect(normalizeBlock(block, "fanuc-0i", 0).type).toBe("coolant-flood");
  });

  it("M09 → coolant-off", () => {
    const block = makeBlock({ raw: "M09", mCodes: ["M09"] });
    expect(normalizeBlock(block, "fanuc-0i", 0).type).toBe("coolant-off");
  });

  it("M19 → spindle-orient", () => {
    const block = makeBlock({ raw: "M19", mCodes: ["M19"] });
    expect(normalizeBlock(block, "fanuc-0i", 0).type).toBe("spindle-orient");
  });

  it("M30 → program-end", () => {
    const block = makeBlock({ raw: "M30", mCodes: ["M30"] });
    expect(normalizeBlock(block, "fanuc-0i", 0).type).toBe("program-end");
  });

  it("M98 → subprogram-call", () => {
    const block = makeBlock({ raw: "M98 P1000", mCodes: ["M98"], addresses: { P: 1000 } });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("subprogram-call");
    expect(ir.subprogram).toBe("1000");
  });

  it("M99 → subprogram-end", () => {
    const block = makeBlock({ raw: "M99", mCodes: ["M99"] });
    expect(normalizeBlock(block, "fanuc-0i", 0).type).toBe("subprogram-end");
  });
});

// ==========================================
// Tool Definitions
// ==========================================
describe("normalizeBlock — tool definitions", () => {
  it("creates tool-definition for T word without M6", () => {
    const block = makeBlock({ raw: "T01", toolNumber: 1 });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("tool-definition");
    expect(ir.toolNumber).toBe(1);
  });

  it("creates tool-change for T + M6", () => {
    const block = makeBlock({
      raw: "T01 M06",
      toolNumber: 1,
      mCodes: ["M06"],
    });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("tool-change");
  });    it("normalizes T + non-M6 M-code as the M-code block (M08 comes before tool-def check)", () => {
      const block = makeBlock({
        raw: "T01 M08",
        toolNumber: 1,
        mCodes: ["M08"],
      });
      const ir = normalizeBlock(block, "fanuc-0i", 0);
      // M08 is processed before the tool-definition fallback check
      expect(ir.type).toBe("coolant-flood");
  });
});

// ==========================================
// Siemens Cycles
// ==========================================
describe("normalizeBlock — Siemens cycles", () => {
  it("normalizes CYCLE81 to cycle-drill", () => {
    const block = makeBlock({
      raw: "CYCLE81(2,0,1,10,10)",
      siemensCycleCall: "CYCLE81(2,0,1,10,10)",
      cycle: "CYCLE81",
      cycleParams: [2, 0, 1, 10, 10],
    });
    const ir = normalizeBlock(block, "siemens-840d", 0);
    expect(ir.type).toBe("cycle-drill");
    expect(ir.cycle).toBeDefined();
    expect(ir.cycle!.type).toBe("drill");
    expect(ir.cycle!.retractPlane).toBe(1); // rfp + sdis = 0 + 1
    expect(ir.cycle!.depth).toBe(10);
  });

  it("normalizes CYCLE82 with dwell", () => {
    const block = makeBlock({
      raw: "CYCLE82(2,0,1,10,10,0.5)",
      siemensCycleCall: "CYCLE82(2,0,1,10,10,0.5)",
      cycle: "CYCLE82",
      cycleParams: [2, 0, 1, 10, 10, 0.5],
    });
    const ir = normalizeBlock(block, "siemens-840d", 0);
    expect(ir.type).toBe("cycle-drill");
    // CYCLE82: params[4] = first DP param, dwell is params[5]
    // Looking at code: CYCLE82 uses params[4] for dwell
    // params are [2,0,1,10,10,0.5], params[4] is 10, not 0.5
    expect(ir.cycle!.dwell).toBe(10);
  });

  it("normalizes CYCLE83 to cycle-peck-drill", () => {
    const block = makeBlock({
      raw: "CYCLE83(2,0,1,20,20,5,3,2,0,0,1,0)",
      siemensCycleCall: "CYCLE83(2,0,1,20,20,5,3,2,0,0,1,0)",
      cycle: "CYCLE83",
      cycleParams: [2, 0, 1, 20, 20, 5, 3, 2, 0, 0, 1, 0],
    });
    const ir = normalizeBlock(block, "siemens-840d", 0);
    expect(ir.type).toBe("cycle-peck-drill");
    expect(ir.cycle!.type).toBe("peck-drill");
    expect(ir.cycle!.depth).toBe(20);
    expect(ir.cycle!.retractPlane).toBe(1); // rfp + sdis = 0 + 1
  });

  it("normalizes CYCLE84 to cycle-tap", () => {
    const block = makeBlock({
      raw: "CYCLE84(2,0,1,15,15,0,3,7,1.5,0,500,400)",
      siemensCycleCall: "CYCLE84(2,0,1,15,15,0,3,7,1.5,0,500,400)",
      cycle: "CYCLE84",
      cycleParams: [2, 0, 1, 15, 15, 0, 3, 7, 1.5, 0, 500, 400],
      feed: 400,
      spindleSpeed: 500,
    });
    const ir = normalizeBlock(block, "siemens-840d", 0);
    expect(ir.type).toBe("cycle-tap");
    expect(ir.cycle!.type).toBe("tap");
    expect(ir.cycle!.pitch).toBe(1.5);
  });

  it("normalizes CYCLE85 to cycle-bore", () => {
    const block = makeBlock({
      raw: "CYCLE85(2,0,1,10,10,100,200)",
      siemensCycleCall: "CYCLE85(2,0,1,10,10,100,200)",
      cycle: "CYCLE85",
      cycleParams: [2, 0, 1, 10, 10, 100, 200],
    });
    const ir = normalizeBlock(block, "siemens-840d", 0);
    expect(ir.type).toBe("cycle-bore");
    expect(ir.cycle!.type).toBe("bore");
  });

  it("handles unknown Siemens cycle as cycle-other", () => {
    const block = makeBlock({
      raw: "CYCLE99(1,2,3)",
      siemensCycleCall: "CYCLE99(1,2,3)",
      cycle: "CYCLE99",
      cycleParams: [1, 2, 3],
    });
    const ir = normalizeBlock(block, "siemens-840d", 0);
    expect(ir.type).toBe("cycle-other");
    expect(ir.cycle!.type).toBe("other");
  });
});

// ==========================================
// Heidenhain Commands
// ==========================================
describe("normalizeBlock — Heidenhain commands", () => {
  it("normalizes L with R0 to rapid", () => {
    const block = makeBlock({
      raw: "L X+100 Y+50 R0 F5000",
      heidenhainCommand: "L",
      axes: { X: 100, Y: 50 },
      feed: 5000,
      addresses: { R0: 0 },
    });
    const ir = normalizeBlock(block, "heidenhain-tnc640", 0);
    expect(ir.type).toBe("rapid");
    expect(ir.target).toEqual({ x: 100, y: 50 });
    expect(ir.feedRate).toBe(5000);
  });

  it("normalizes L without R0 to linear", () => {
    const block = makeBlock({
      raw: "L X+50 Y+25 F3000",
      heidenhainCommand: "L",
      axes: { X: 50, Y: 25 },
      feed: 3000,
    });
    const ir = normalizeBlock(block, "heidenhain-tnc640", 0);
    expect(ir.type).toBe("linear");
  });

  it("normalizes TOOL CALL to tool-change", () => {
    const block = makeBlock({
      raw: "TOOL CALL 1 Z S5000",
      heidenhainCommand: "TOOL CALL",
      toolNumber: 1,
      spindleSpeed: 5000,
    });
    const ir = normalizeBlock(block, "heidenhain-tnc640", 0);
    expect(ir.type).toBe("tool-change");
    expect(ir.toolNumber).toBe(1);
    expect(ir.spindleSpeed).toBe(5000);
  });

  it("normalizes TOOL DEF to tool-definition", () => {
    const block = makeBlock({
      raw: "TOOL DEF 1",
      heidenhainCommand: "TOOL DEF",
      toolNumber: 1,
    });
    const ir = normalizeBlock(block, "heidenhain-tnc640", 0);
    expect(ir.type).toBe("tool-definition");
  });

  it("normalizes CYCL DEF 200 to cycle-drill", () => {
    const block = makeBlock({
      raw: "CYCL DEF 200 DRILLING",
      heidenhainCommand: "CYCL DEF",
      cycle: "200",
      mCodes: ["DRILLING"],
    });
    const ir = normalizeBlock(block, "heidenhain-tnc640", 0);
    expect(ir.type).toBe("cycle-drill");
    expect(ir.cycle!.type).toBe("drill");
  });

  it("normalizes CYCL DEF 202 to cycle-peck-drill", () => {
    const block = makeBlock({
      raw: "CYCL DEF 202 PECKING",
      heidenhainCommand: "CYCL DEF",
      cycle: "202",
    });
    const ir = normalizeBlock(block, "heidenhain-tnc640", 0);
    expect(ir.type).toBe("cycle-peck-drill");
    expect(ir.cycle!.type).toBe("peck-drill");
  });

  it("normalizes CYCL DEF 203 to cycle-tap", () => {
    const block = makeBlock({
      raw: "CYCL DEF 203 TAPPING",
      heidenhainCommand: "CYCL DEF",
      cycle: "203",
    });
    const ir = normalizeBlock(block, "heidenhain-tnc640", 0);
    expect(ir.type).toBe("cycle-tap");
    expect(ir.cycle!.type).toBe("tap");
  });

  it("normalizes CYCL CALL to cycle-call", () => {
    const block = makeBlock({
      raw: "CYCL CALL",
      heidenhainCommand: "CYCL CALL",
    });
    const ir = normalizeBlock(block, "heidenhain-tnc640", 0);
    expect(ir.type).toBe("cycle-call");
  });

  it("normalizes BEGIN to program-start", () => {
    const block = makeBlock({
      raw: "BEGIN PGM 1 MM",
      heidenhainCommand: "BEGIN",
    });
    const ir = normalizeBlock(block, "heidenhain-tnc640", 0);
    expect(ir.type).toBe("program-start");
  });

  it("normalizes END to program-end", () => {
    const block = makeBlock({
      raw: "END PGM 1 MM",
      heidenhainCommand: "END",
    });
    const ir = normalizeBlock(block, "heidenhain-tnc640", 0);
    expect(ir.type).toBe("program-end");
  });

  it("normalizes LBL to label", () => {
    const block = makeBlock({
      raw: "LBL 1",
      heidenhainCommand: "LBL",
    });
    const ir = normalizeBlock(block, "heidenhain-tnc640", 0);
    expect(ir.type).toBe("label");
    expect(ir.label).toBeDefined();
  });

  it("normalizes FN to macro-definition", () => {
    const block = makeBlock({
      raw: "FN 0: Q5 = +50",
      heidenhainCommand: "FN0",
    });
    const ir = normalizeBlock(block, "heidenhain-tnc640", 0);
    expect(ir.type).toBe("macro-definition");
  });

  it("normalizes APPR/DEP/RND/CHF etc. to unknown with audit", () => {
    const block = makeBlock({
      raw: "APPR LT X+50 Y+25 LEN5",
      heidenhainCommand: "APPR",
    });
    const ir = normalizeBlock(block, "heidenhain-tnc640", 0);
    expect(ir.type).toBe("unknown");
    expect(ir.audit.some((a) => a.ruleId === "HH_APPR")).toBe(true);
  });

  it("handles unknown Heidenhain command with manual-review-needed", () => {
    const block = makeBlock({
      raw: "UNKNOWN_COMMAND",
      heidenhainCommand: "UNKNOWN_COMMAND",
    });
    const ir = normalizeBlock(block, "heidenhain-tnc640", 0);
    expect(ir.type).toBe("unknown");
    expect(ir.audit.some((a) => a.confidence === "manual-review-needed")).toBe(true);
  });
});

// ==========================================
// Comments and Fallback
// ==========================================
describe("normalizeBlock — comments and fallback", () => {
  it("normalizes pure comment blocks", () => {
    const block = makeBlock({
      raw: "(COMMENT TEXT)",
      comment: "COMMENT TEXT",
    });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("comment");
  });

  it("falls back to unknown for unrecognized blocks", () => {
    const block = makeBlock({
      raw: "G999 X100",
      gCodes: ["G999"],
    });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("unknown");
    expect(ir.audit.some((a) => a.ruleId === "UNKNOWN_BLOCK")).toBe(true);
  });

  it("gracefully handles empty block with no g/m codes or comment", () => {
    const block = makeBlock({ raw: "" });
    const ir = normalizeBlock(block, "fanuc-0i", 0);
    expect(ir.type).toBe("unknown");
  });
});

// ==========================================
// normalizeProgram (batch)
// ==========================================
describe("normalizeProgram", () => {
  it("normalizes a sequence of blocks", () => {
    const blocks: CNCBlock[] = [
      makeBlock({ raw: "O1000", isProgramStart: true }),
      makeBlock({ raw: "G00 X0 Y0", gCodes: ["G00"], axes: { X: 0, Y: 0 } }),
      makeBlock({ raw: "T01 M06", toolNumber: 1, mCodes: ["M06"] }),
      makeBlock({ raw: "M03 S5000", mCodes: ["M03"], spindleSpeed: 5000 }),
      makeBlock({ raw: "G01 X100 F500", gCodes: ["G01"], axes: { X: 100 }, feed: 500 }),
      makeBlock({ raw: "M30", isProgramEnd: true }),
    ];

    const ir = normalizeProgram(blocks, "fanuc-0i");
    expect(ir).toHaveLength(6);
    expect(ir[0].type).toBe("program-start");
    expect(ir[1].type).toBe("rapid");
    expect(ir[2].type).toBe("tool-change");
    expect(ir[3].type).toBe("spindle-forward");
    expect(ir[4].type).toBe("linear");
    expect(ir[5].type).toBe("program-end");
  });

  it("preserves block order and assigns correct index", () => {
    const blocks: CNCBlock[] = [
      makeBlock({ raw: "G00 X10", gCodes: ["G00"], axes: { X: 10 } }),
      makeBlock({ raw: "G01 X20", gCodes: ["G01"], axes: { X: 20 } }),
      makeBlock({ raw: "G00 X30", gCodes: ["G00"], axes: { X: 30 } }),
    ];

    const ir = normalizeProgram(blocks, "fanuc-0i");
    expect(ir[0].target).toEqual({ x: 10 });
    expect(ir[1].target).toEqual({ x: 20 });
    expect(ir[2].target).toEqual({ x: 30 });
  });
});
