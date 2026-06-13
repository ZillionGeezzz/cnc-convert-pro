import { describe, it, expect } from "vitest";
import {
  CONTROL_RESOLUTION_MM,
  MIN_COMMAND_INCREMENT_MM,
  COORDINATE_DECIMALS,
  getResolution,
  getMinIncrement,
  getDecimals,
  roundToResolution,
  checkMinIncrement,
} from "./resolution";
import {
  CYCLE_MAPPINGS,
  lookupCycleMapping,
  checkTravelLimits,
  checkSpindleSpeed,
  checkToolBeforeSpindle,
  checkToolChangeWithM6,
  checkCycleConfidence,
  checkArcParameters,
  checkCoolantBeforeSpindle,
} from "./rules";
import { SafetyValidator } from "./validator";
import type { NeutralIRBlock, AuditEntry } from "../ir/types";
import type { MachineProfile } from "../types";

// ==========================================
// Resolution Tests
// ==========================================
describe("resolution", () => {
  describe("constants", () => {
    it("has resolution for all 10 controller families", () => {
      expect(Object.keys(CONTROL_RESOLUTION_MM)).toHaveLength(10);
      expect(CONTROL_RESOLUTION_MM.fanuc).toBe(0.001);
      expect(CONTROL_RESOLUTION_MM.siemens).toBe(0.001);
      expect(CONTROL_RESOLUTION_MM.heidenhain).toBe(0.001);
      expect(CONTROL_RESOLUTION_MM.haas).toBe(0.0001); // higher res
    });

    it("has min increment for all 10 controller families", () => {
      expect(Object.keys(MIN_COMMAND_INCREMENT_MM)).toHaveLength(10);
      expect(MIN_COMMAND_INCREMENT_MM.haas).toBe(0.001); // finer
      expect(MIN_COMMAND_INCREMENT_MM.fanuc).toBe(0.010);
    });

    it("has decimals for all 10 controller families", () => {
      expect(Object.keys(COORDINATE_DECIMALS)).toHaveLength(10);
      expect(COORDINATE_DECIMALS.haas).toBe(4);
      expect(COORDINATE_DECIMALS.fanuc).toBe(3);
    });
  });

  describe("getResolution", () => {
    it("returns 0.001 for fanuc format", () => {
      expect(getResolution("fanuc-0i")).toBe(0.001);
    });

    it("returns 0.0001 for haas", () => {
      expect(getResolution("haas")).toBe(0.0001);
    });

    it("returns 0.001 as default for unknown family (mazak-eia routes to fanuc)", () => {
      expect(getResolution("mazak-eia")).toBe(0.001);
    });
  });

  describe("getMinIncrement", () => {
    it("returns 0.010 for siemens", () => {
      expect(getMinIncrement("siemens-840d")).toBe(0.010);
    });

    it("returns 0.001 for haas", () => {
      expect(getMinIncrement("haas")).toBe(0.001);
    });
  });

  describe("getDecimals", () => {
    it("returns 3 for most controllers", () => {
      expect(getDecimals("fanuc-0i")).toBe(3);
      expect(getDecimals("siemens-840d")).toBe(3);
    });

    it("returns 4 for haas", () => {
      expect(getDecimals("haas")).toBe(4);
    });
  });

  describe("roundToResolution", () => {
    it("rounds to 0.001 by default", () => {
      expect(roundToResolution(1.2345, "fanuc-0i")).toBe(1.235);
    });

    it("rounds to 0.0001 for haas", () => {
      expect(roundToResolution(1.23456, "haas")).toBeCloseTo(1.2346);
    });

    it("handles negative values", () => {
      expect(roundToResolution(-1.2345, "fanuc-0i")).toBe(-1.234);
    });

    it("rounds -1.2345 to -1.235 for haas (0.0001 resolution)", () => {
      expect(roundToResolution(-1.2345, "haas")).toBeCloseTo(-1.2345);
    });

    it("rounds 0.0004 to 0 at fanuc resolution", () => {
      expect(roundToResolution(0.0004, "fanuc-0i")).toBe(0);
    });

    it("rounds 0.0005 to 0.001 at fanuc resolution", () => {
      expect(roundToResolution(0.0005, "fanuc-0i")).toBe(0.001);
    });
  });

  describe("checkMinIncrement", () => {
    it("returns null for zero value", () => {
      expect(checkMinIncrement(0, "fanuc-0i", "X")).toBeNull();
    });

    it("returns null for value above min increment", () => {
      expect(checkMinIncrement(0.02, "fanuc-0i", "X")).toBeNull();
    });

    it("returns warning for value below min increment", () => {
      const result = checkMinIncrement(0.003, "fanuc-0i", "X");
      expect(result).toContain("X value 0.003");
      expect(result).toContain("minimum command increment");
      expect(result).toContain("0.01");
    });

    it("returns null for haas with very small value that is above its min increment (0.001)", () => {
      expect(checkMinIncrement(0.002, "haas", "X")).toBeNull();
    });

    it("uses absolute value for negative inputs", () => {
      const result = checkMinIncrement(-0.003, "fanuc-0i", "Z");
      expect(result).toContain("Z value 0.003");
    });
  });
});

// ==========================================
// Safety Rules Tests
// ==========================================
describe("safety rules", () => {
  describe("lookupCycleMapping", () => {
    it("finds Siemens CYCLE81 → Fanuc G81", () => {
      const mapping = lookupCycleMapping("CYCLE81", "siemens", "fanuc");
      expect(mapping).toBeDefined();
      expect(mapping!.targetCycle).toBe("G81");
      expect(mapping!.confidence).toBe("exact");
    });

    it("finds Fanuc G84 → Siemens CYCLE84", () => {
      const mapping = lookupCycleMapping("G84", "fanuc", "siemens");
      expect(mapping).toBeDefined();
      expect(mapping!.targetCycle).toBe("CYCLE84");
    });

    it("finds Heidenhain CYCL DEF 200 → Fanuc G81", () => {
      const mapping = lookupCycleMapping("CYCL DEF 200", "heidenhain", "fanuc");
      expect(mapping).toBeDefined();
      expect(mapping!.targetCycle).toBe("G81");
    });

    it("is case-insensitive for source cycle", () => {
      const mapping = lookupCycleMapping("cycle81", "siemens", "fanuc");
      expect(mapping).toBeDefined();
      expect(mapping!.targetCycle).toBe("G81");
    });

    it("returns undefined for unmapped cycle", () => {
      const mapping = lookupCycleMapping("CYCLE99", "siemens", "fanuc");
      expect(mapping).toBeUndefined();
    });

    it("has all mappings defined", () => {
      // Siemens → Fanuc: 9 cycles
      const siemensToFanuc = CYCLE_MAPPINGS.filter(
        (m) => m.sourceFamily === "siemens" && m.targetFamily === "fanuc",
      );
      expect(siemensToFanuc).toHaveLength(9);

      // Fanuc → Siemens: 5 cycles
      const fanucToSiemens = CYCLE_MAPPINGS.filter(
        (m) => m.sourceFamily === "fanuc" && m.targetFamily === "siemens",
      );
      expect(fanucToSiemens).toHaveLength(5);
    });
  });

  describe("checkTravelLimits", () => {
    const profile: MachineProfile = {
      type: "vmc",
      tableLength: 900,
      tableWidth: 350,
      xTravel: 762,
      yTravel: 406,
      zTravel: 508,
      bAxis: false,
      bAxisIncremental: true,
      maxSpindleRPM: 10000,
    };

    it("returns null when no target", () => {
      const block: NeutralIRBlock = {
        type: "program-end",
        raw: "M30",
        transformations: [],
        audit: [],
      };
      expect(checkTravelLimits(block, profile, 0)).toBeNull();
    });

    it("returns null when within limits", () => {
      const block: NeutralIRBlock = {
        type: "linear",
        raw: "G01 X500",
        target: { x: 500 },
        transformations: [],
        audit: [],
      };
      expect(checkTravelLimits(block, profile, 0)).toBeNull();
    });

    it("returns issue when position exceeds travel limit", () => {
      const block: NeutralIRBlock = {
        type: "linear",
        raw: "G01 X900",
        target: { x: 900 },
        transformations: [],
        audit: [],
      };
      const issue = checkTravelLimits(block, profile, 5);
      expect(issue).not.toBeNull();
      expect(issue!.ruleId).toBe("TRAVEL_LIMIT");
      expect(issue!.blockIndex).toBe(5);
      expect(issue!.message).toContain("X");
      expect(issue!.message).toContain("900");
      expect(issue!.severity).toBe("warning");
      expect(issue!.suggestion).toContain("762");
    });

    it("allows up to 1.1× travel limit", () => {
      // 1.1 × 762 = 838.2, so 838 should be OK
      const block: NeutralIRBlock = {
        type: "rapid",
        raw: "G00 X838",
        target: { x: 838 },
        transformations: [],
        audit: [],
      };
      expect(checkTravelLimits(block, profile, 0)).toBeNull();
    });

    it("triggers at 1.1× + epsilon", () => {
      const block: NeutralIRBlock = {
        type: "rapid",
        raw: "G00 X839",
        target: { x: 839 },
        transformations: [],
        audit: [],
      };
      expect(checkTravelLimits(block, profile, 0)).not.toBeNull();
    });

    it("checks multiple axes", () => {
      const block: NeutralIRBlock = {
        type: "linear",
        raw: "G01 X500 Y500",
        target: { x: 500, y: 500 },
        transformations: [],
        audit: [],
      };
      // Y limit is 406, 500 > 406*1.1=446.6
      expect(checkTravelLimits(block, profile, 0)).not.toBeNull();
    });
  });

  describe("checkSpindleSpeed", () => {
    const profile: MachineProfile = {
      type: "vmc",
      tableLength: 900,
      tableWidth: 350,
      xTravel: 762,
      yTravel: 406,
      zTravel: 508,
      bAxis: false,
      bAxisIncremental: true,
      maxSpindleRPM: 10000,
    };

    it("returns null when no spindle speed", () => {
      const block: NeutralIRBlock = {
        type: "linear",
        raw: "G01 X100",
        transformations: [],
        audit: [],
      };
      expect(checkSpindleSpeed(block, profile, 0)).toBeNull();
    });

    it("returns null when within limits", () => {
      const block: NeutralIRBlock = {
        type: "spindle-forward",
        raw: "M03 S5000",
        spindleSpeed: 5000,
        transformations: [],
        audit: [],
      };
      expect(checkSpindleSpeed(block, profile, 0)).toBeNull();
    });

    it("returns issue when spindle speed exceeds max", () => {
      const block: NeutralIRBlock = {
        type: "spindle-forward",
        raw: "M03 S15000",
        spindleSpeed: 15000,
        transformations: [],
        audit: [],
      };
      const issue = checkSpindleSpeed(block, profile, 3);
      expect(issue).not.toBeNull();
      expect(issue!.ruleId).toBe("SPINDLE_OVERSPEED");
      expect(issue!.blockIndex).toBe(3);
      expect(issue!.message).toContain("15000");
      expect(issue!.message).toContain("10000");
      expect(issue!.suggestion).toContain("10000");
    });
  });

  describe("checkToolBeforeSpindle", () => {
    it("returns null when spindle start with previous tool", () => {
      const block: NeutralIRBlock = {
        type: "spindle-forward",
        raw: "M03 S1000",
        transformations: [],
        audit: [],
      };
      expect(checkToolBeforeSpindle(block, undefined, 0, 1)).toBeNull();
    });

    it("returns null for non-spindle blocks", () => {
      const block: NeutralIRBlock = {
        type: "linear",
        raw: "G01 X100",
        transformations: [],
        audit: [],
      };
      expect(checkToolBeforeSpindle(block, undefined, 0, null)).toBeNull();
    });

    it("returns warning when spindle starts without tool", () => {
      const block: NeutralIRBlock = {
        type: "spindle-forward",
        raw: "M03 S1000",
        transformations: [],
        audit: [],
      };
      const issue = checkToolBeforeSpindle(block, undefined, 2, null);
      expect(issue).not.toBeNull();
      expect(issue!.ruleId).toBe("TOOL_BEFORE_SPINDLE");
      expect(issue!.blockIndex).toBe(2);
      expect(issue!.message).toContain("without a tool selected");
      expect(issue!.suggestion).toContain("Add a tool change");
    });

    it("works for spindle-reverse too", () => {
      const block: NeutralIRBlock = {
        type: "spindle-reverse",
        raw: "M04 S1000",
        transformations: [],
        audit: [],
      };
      const issue = checkToolBeforeSpindle(block, undefined, 0, null);
      expect(issue).not.toBeNull();
    });
  });

  describe("checkToolChangeWithM6", () => {
    it("returns null for non-tool-definition blocks", () => {
      const block: NeutralIRBlock = {
        type: "tool-change",
        raw: "T01 M6",
        transformations: [],
        audit: [],
      };
      expect(checkToolChangeWithM6(block, undefined, 0)).toBeNull();
    });

    it("returns warning when T word without M6", () => {
      const block: NeutralIRBlock = {
        type: "tool-definition",
        raw: "T01",
        toolNumber: 1,
        transformations: [],
        audit: [],
      };
      const issue = checkToolChangeWithM6(block, undefined, 4);
      expect(issue).not.toBeNull();
      expect(issue!.ruleId).toBe("TOOL_WITHOUT_M6");
      expect(issue!.blockIndex).toBe(4);
      expect(issue!.message).toContain("T1");
      expect(issue!.suggestion).toContain("M6 after T1");
    });
  });

  describe("checkCycleConfidence", () => {
    it("returns null when no low-confidence audit entries", () => {
      const block: NeutralIRBlock = {
        type: "cycle-drill",
        raw: "G81 Z-10 R2",
        transformations: [],
        audit: [
          {
            ruleId: "TEST",
            description: "Exact conversion",
            source: "G81",
            target: "cycle-drill",
            confidence: "exact",
          },
        ],
      };
      expect(checkCycleConfidence(block, undefined, 0)).toBeNull();
    });

    it("returns warning for approximate confidence", () => {
      const block: NeutralIRBlock = {
        type: "cycle-bore",
        raw: "G86 Z-10 R2",
        transformations: [],
        audit: [
          {
            ruleId: "TEST",
            description: "Approximate bore cycle",
            source: "G86",
            target: "cycle-bore",
            confidence: "approximate",
          },
        ],
      };
      const issue = checkCycleConfidence(block, undefined, 1);
      expect(issue).not.toBeNull();
      expect(issue!.ruleId).toBe("CYCLE_CONFIDENCE");
      expect(issue!.severity).toBe("warning");
    });

    it("returns error for manual-review-needed", () => {
      const block: NeutralIRBlock = {
        type: "unknown",
        raw: "G999",
        transformations: [],
        audit: [
          {
            ruleId: "UNKNOWN",
            description: "Unknown G-code",
            source: "G999",
            target: "unknown",
            confidence: "manual-review-needed",
          },
        ],
      };
      const issue = checkCycleConfidence(block, undefined, 0);
      expect(issue).not.toBeNull();
      expect(issue!.severity).toBe("error");
      expect(issue!.message).toContain("Manual review required");
    });
  });

  describe("checkArcParameters", () => {
    it("returns null for non-arc blocks", () => {
      const block: NeutralIRBlock = {
        type: "linear",
        raw: "G01 X100",
        transformations: [],
        audit: [],
      };
      expect(checkArcParameters(block, undefined, 0)).toBeNull();
    });

    it("returns null for arc with IJK", () => {
      const block: NeutralIRBlock = {
        type: "clockwise-arc",
        raw: "G02 X100 Y50 I10 J0",
        target: { x: 100, y: 50, i: 10, j: 0 },
        transformations: [],
        audit: [],
      };
      expect(checkArcParameters(block, undefined, 0)).toBeNull();
    });

    it("returns null for arc with R", () => {
      const block: NeutralIRBlock = {
        type: "clockwise-arc",
        raw: "G02 X100 R50",
        target: { x: 100, r: 50 },
        transformations: [],
        audit: [],
      };
      expect(checkArcParameters(block, undefined, 0)).toBeNull();
    });

    it("returns error for arc without IJK or R and no target", () => {
      const block: NeutralIRBlock = {
        type: "clockwise-arc",
        raw: "G02",
        target: { x: 100, y: 50 },
        transformations: [],
        audit: [],
      };
      const issue = checkArcParameters(block, undefined, 2);
      expect(issue).not.toBeNull();
      expect(issue!.ruleId).toBe("ARC_NO_PARAMS");
      expect(issue!.blockIndex).toBe(2);
      expect(issue!.severity).toBe("error");
      expect(issue!.suggestion).toContain("center point");
    });

    it("returns null for arc without target at all", () => {
      const block: NeutralIRBlock = {
        type: "clockwise-arc",
        raw: "G02",
        transformations: [],
        audit: [],
      };
      expect(checkArcParameters(block, undefined, 0)).toBeNull();
    });
  });

  describe("checkCoolantBeforeSpindle", () => {
    it("returns null when coolant with spindle running", () => {
      const block: NeutralIRBlock = {
        type: "coolant-flood",
        raw: "M08",
        transformations: [],
        audit: [],
      };
      expect(checkCoolantBeforeSpindle(block, undefined, 0, true)).toBeNull();
    });

    it("returns null for non-coolant blocks", () => {
      const block: NeutralIRBlock = {
        type: "linear",
        raw: "G01 X100",
        transformations: [],
        audit: [],
      };
      expect(checkCoolantBeforeSpindle(block, undefined, 0, false)).toBeNull();
    });

    it("returns warning when coolant without spindle", () => {
      const block: NeutralIRBlock = {
        type: "coolant-flood",
        raw: "M08",
        transformations: [],
        audit: [],
      };
      const issue = checkCoolantBeforeSpindle(block, undefined, 3, false);
      expect(issue).not.toBeNull();
      expect(issue!.ruleId).toBe("COOLANT_BEFORE_SPINDLE");
      expect(issue!.blockIndex).toBe(3);
      expect(issue!.suggestion).toContain("Start spindle");
    });

    it("warns for coolant-mist too", () => {
      const block: NeutralIRBlock = {
        type: "coolant-mist",
        raw: "M07",
        transformations: [],
        audit: [],
      };
      expect(checkCoolantBeforeSpindle(block, undefined, 0, false)).not.toBeNull();
    });
  });
});

// ==========================================
// SafetyValidator Tests
// ==========================================
describe("SafetyValidator", () => {
  it("validates blocks and finds no issues for clean program", () => {
    const validator = new SafetyValidator();
    const blocks: NeutralIRBlock[] = [
      {
        type: "program-start",
        raw: "O0001",
        transformations: [],
        audit: [],
      },
      {
        type: "tool-change",
        raw: "T01 M6",
        toolNumber: 1,
        transformations: [],
        audit: [],
      },
      {
        type: "spindle-forward",
        raw: "M03 S1000",
        spindleSpeed: 1000,
        transformations: [],
        audit: [],
      },
      {
        type: "coolant-flood",
        raw: "M08",
        transformations: [],
        audit: [],
      },
      {
        type: "linear",
        raw: "G01 X100 F500",
        target: { x: 100 },
        transformations: [],
        audit: [],
      },
      {
        type: "program-end",
        raw: "M30",
        transformations: [],
        audit: [],
      },
    ];

    const issues = validator.validate(blocks);
    expect(issues).toHaveLength(0);
  });

  it("detects spindle start without tool", () => {
    const validator = new SafetyValidator();
    const blocks: NeutralIRBlock[] = [
      {
        type: "program-start",
        raw: "O0001",
        transformations: [],
        audit: [],
      },
      {
        type: "spindle-forward",
        raw: "M03 S1000",
        spindleSpeed: 1000,
        transformations: [],
        audit: [],
      },
    ];

    const issues = validator.validate(blocks);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe("TOOL_BEFORE_SPINDLE");
  });

  it("detects coolant before spindle", () => {
    const validator = new SafetyValidator();
    const blocks: NeutralIRBlock[] = [
      {
        type: "coolant-flood",
        raw: "M08",
        transformations: [],
        audit: [],
      },
    ];

    const issues = validator.validate(blocks);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe("COOLANT_BEFORE_SPINDLE");
  });

  it("detects tool-definition without M6", () => {
    const validator = new SafetyValidator();
    const blocks: NeutralIRBlock[] = [
      {
        type: "tool-definition",
        raw: "T01",
        toolNumber: 1,
        transformations: [],
        audit: [],
      },
    ];

    const issues = validator.validate(blocks);
    expect(issues).toHaveLength(1);
    expect(issues[0].ruleId).toBe("TOOL_WITHOUT_M6");
  });

  it("detects arc without parameters", () => {
    const validator = new SafetyValidator();
    const blocks: NeutralIRBlock[] = [
      {
        type: "clockwise-arc",
        raw: "G02 X100",
        target: { x: 100, y: 50 },
        transformations: [],
        audit: [],
      },
    ];

    const issues = validator.validate(blocks);
    expect(issues.some((i) => i.ruleId === "ARC_NO_PARAMS")).toBe(true);
  });

  it("detects low confidence cycles", () => {
    const validator = new SafetyValidator();
    const blocks: NeutralIRBlock[] = [
      {
        type: "cycle-bore",
        raw: "G86 Z-10 R2",
        transformations: [],
        audit: [
          {
            ruleId: "CYCLE",
            description: "Approximate conversion",
            source: "G86",
            target: "cycle-bore",
            confidence: "approximate",
          },
        ],
      },
    ];

    const issues = validator.validate(blocks);
    expect(issues.some((i) => i.ruleId === "CYCLE_CONFIDENCE")).toBe(true);
  });

  it("validates travel limits when profile provided", () => {
    const validator = new SafetyValidator();
    const profile: MachineProfile = {
      type: "vmc",
      tableLength: 900,
      tableWidth: 350,
      xTravel: 762,
      yTravel: 406,
      zTravel: 508,
      bAxis: false,
      bAxisIncremental: true,
      maxSpindleRPM: 10000,
    };
    const blocks: NeutralIRBlock[] = [
      {
        type: "linear",
        raw: "G01 X900",
        target: { x: 900 },
        transformations: [],
        audit: [],
      },
    ];

    const issues = validator.validate(blocks, profile);
    expect(issues.some((i) => i.ruleId === "TRAVEL_LIMIT")).toBe(true);
  });

  it("detects spindle overspeed when profile provided", () => {
    const validator = new SafetyValidator();
    const profile: MachineProfile = {
      type: "vmc",
      tableLength: 900,
      tableWidth: 350,
      xTravel: 762,
      yTravel: 406,
      zTravel: 508,
      bAxis: false,
      bAxisIncremental: true,
      maxSpindleRPM: 10000,
    };
    const blocks: NeutralIRBlock[] = [
      {
        type: "spindle-forward",
        raw: "M03 S15000",
        spindleSpeed: 15000,
        transformations: [],
        audit: [],
      },
    ];

    const issues = validator.validate(blocks, profile);
    expect(issues.some((i) => i.ruleId === "SPINDLE_OVERSPEED")).toBe(true);
  });

  it("tracks spindle state across blocks", () => {
    const validator = new SafetyValidator();
    const blocks: NeutralIRBlock[] = [
      { type: "tool-change", raw: "T01 M6", toolNumber: 1, transformations: [], audit: [] },
      { type: "spindle-forward", raw: "M03", transformations: [], audit: [] },
      { type: "coolant-flood", raw: "M08", transformations: [], audit: [] }, // spindle on → OK
      { type: "spindle-stop", raw: "M05", transformations: [], audit: [] },
      { type: "coolant-mist", raw: "M07", transformations: [], audit: [] }, // spindle off → warning
    ];

    const issues = validator.validate(blocks);
    // Should have: TOOL_WITHOUT_M6 for tool-definition? No — it's tool-change (T M6), not tool-definition
    // Coolant on block 2 is after spindle start — OK
    // Coolant on block 4 is after spindle stop — warning
    const coolantIssues = issues.filter((i) => i.ruleId === "COOLANT_BEFORE_SPINDLE");
    expect(coolantIssues).toHaveLength(1);
  });

  it("tracks tool changes across blocks", () => {
    const validator = new SafetyValidator();
    const blocks: NeutralIRBlock[] = [
      { type: "spindle-forward", raw: "M03 S1000", transformations: [], audit: [] }, // no tool → warning
      { type: "tool-change", raw: "T01 M6", toolNumber: 1, transformations: [], audit: [] },
      { type: "spindle-forward", raw: "M03 S2000", transformations: [], audit: [] }, // tool set → OK
    ];

    const issues = validator.validate(blocks);
    const toolIssues = issues.filter((i) => i.ruleId === "TOOL_BEFORE_SPINDLE");
    expect(toolIssues).toHaveLength(1);
    expect(toolIssues[0].blockIndex).toBe(0);
  });

  it("tracks spindle-stop and spindle-orient", () => {
    const validator = new SafetyValidator();
    const blocks: NeutralIRBlock[] = [
      { type: "tool-change", raw: "T01 M6", toolNumber: 1, transformations: [], audit: [] },
      { type: "spindle-forward", raw: "M03", transformations: [], audit: [] },
      { type: "spindle-orient", raw: "M19", transformations: [], audit: [] },
      { type: "coolant-flood", raw: "M08", transformations: [], audit: [] }, // spindle stopped → warning
    ];

    const issues = validator.validate(blocks);
    const coolantIssues = issues.filter((i) => i.ruleId === "COOLANT_BEFORE_SPINDLE");
    expect(coolantIssues).toHaveLength(1);
  });

  it("resets state on subsequent calls", () => {
    const validator = new SafetyValidator();

    // First call: no tool before spindle
    validator.validate([
      { type: "spindle-forward", raw: "M03", transformations: [], audit: [] },
    ]);
    expect(validator.getIssues()).toHaveLength(1);

    // Second call: should start fresh
    validator.validate([
      { type: "tool-change", raw: "T01 M6", toolNumber: 1, transformations: [], audit: [] },
      { type: "spindle-forward", raw: "M03", transformations: [], audit: [] },
    ]);
    expect(validator.getIssues()).toHaveLength(0);
  });

  it("getIssues returns a copy", () => {
    const validator = new SafetyValidator();
    validator.validate([
      { type: "spindle-forward", raw: "M03", transformations: [], audit: [] },
    ]);
    const issues = validator.getIssues();
    expect(issues).toHaveLength(1);
    // Mutating the returned array should not affect internal state
    issues.pop();
    expect(validator.getIssues()).toHaveLength(1);
  });

  it("reset clears all state", () => {
    const validator = new SafetyValidator();
    validator.validate([
      { type: "spindle-forward", raw: "M03", transformations: [], audit: [] },
    ]);
    expect(validator.getIssues()).toHaveLength(1);

    validator.reset();
    expect(validator.getIssues()).toHaveLength(0);
  });
});
