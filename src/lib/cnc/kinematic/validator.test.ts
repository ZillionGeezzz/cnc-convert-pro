import { describe, it, expect, beforeEach } from "vitest";
import { KinematicValidator } from "./validator";
import { createIRBlock } from "../ir/types";
import type { MachineProfile } from "../types";

const vmcNoB: MachineProfile = {
  type: "vmc",
  tableLength: 914,
  tableWidth: 356,
  xTravel: 762,
  yTravel: 406,
  zTravel: 508,
  bAxis: false,
  bAxisIncremental: true,
  maxSpindleRPM: 10000,
};

const vmcWithB: MachineProfile = {
  type: "vmc",
  tableLength: 914,
  tableWidth: 356,
  xTravel: 762,
  yTravel: 406,
  zTravel: 508,
  bAxis: true,
  bAxisIncremental: true,
  maxSpindleRPM: 10000,
};

const hmc: MachineProfile = {
  type: "hmc",
  tableLength: 630,
  tableWidth: 630,
  xTravel: 800,
  yTravel: 630,
  zTravel: 630,
  bAxis: true,
  bAxisIncremental: true,
  maxSpindleRPM: 12000,
};

describe("KinematicValidator", () => {
  let validator: KinematicValidator;

  beforeEach(() => {
    validator = new KinematicValidator();
  });

  describe("B-axis checks", () => {
    it("flags B-axis on VMC without B-axis capability", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 Y10.0 B45.0", {
          target: { x: 10, y: 10, b: 45 },
        }),
      ];
      const issues = validator.validate(blocks, vmcNoB);
      expect(issues.some((i) => i.ruleId === "B_AXIS_ON_VMC")).toBe(true);
      expect(issues.find((i) => i.ruleId === "B_AXIS_ON_VMC")!.severity).toBe("error");
    });

    it("does not flag B-axis on VMC with B-axis capability", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 Y10.0 B45.0", {
          target: { x: 10, y: 10, b: 45 },
        }),
      ];
      const issues = validator.validate(blocks, vmcWithB);
      expect(issues.some((i) => i.ruleId === "B_AXIS_ON_VMC")).toBe(false);
    });

    it("warns when B-axis exceeds 360° on HMC", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 Y10.0 B450.0", {
          target: { x: 10, y: 10, b: 450 },
        }),
      ];
      const issues = validator.validate(blocks, hmc);
      expect(issues.some((i) => i.ruleId === "B_AXIS_RANGE_HMC")).toBe(true);
      expect(issues.find((i) => i.ruleId === "B_AXIS_RANGE_HMC")!.severity).toBe("warning");
    });

    it("does not warn when B-axis is within 0-360° on HMC", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 Y10.0 B180.0", {
          target: { x: 10, y: 10, b: 180 },
        }),
      ];
      const issues = validator.validate(blocks, hmc);
      expect(issues.some((i) => i.ruleId === "B_AXIS_RANGE_HMC")).toBe(false);
    });
  });

  describe("A-axis range checks", () => {
    it("warns when A-axis exceeds 360°", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 Y10.0 A400.0", {
          target: { x: 10, y: 10, a: 400 },
        }),
      ];
      const issues = validator.validate(blocks, vmcNoB);
      expect(issues.some((i) => i.ruleId === "A_AXIS_RANGE")).toBe(true);
    });

    it("warns when A-axis exceeds VMC trunnion limits (120°)", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 A130.0", {
          target: { x: 10, a: 130 },
        }),
      ];
      const issues = validator.validate(blocks, vmcNoB);
      expect(issues.some((i) => i.ruleId === "A_AXIS_VMC_TILT")).toBe(true);
    });

    it("does not warn when A-axis is within VMC trunnion limits", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 A90.0", {
          target: { x: 10, a: 90 },
        }),
      ];
      const issues = validator.validate(blocks, vmcNoB);
      expect(issues.some((i) => i.ruleId === "A_AXIS_VMC_TILT")).toBe(false);
    });
  });

  describe("C-axis range checks", () => {
    it("warns when C-axis exceeds 360°", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 C380.0", {
          target: { x: 10, c: 380 },
        }),
      ];
      const issues = validator.validate(blocks, vmcNoB);
      expect(issues.some((i) => i.ruleId === "C_AXIS_RANGE")).toBe(true);
    });

    it("does not warn when C-axis is within 0-360°", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 C90.0", {
          target: { x: 10, c: 90 },
        }),
      ];
      const issues = validator.validate(blocks, vmcNoB);
      expect(issues.some((i) => i.ruleId === "C_AXIS_RANGE")).toBe(false);
    });
  });

  describe("axis count checks", () => {
    it("flags rotary axis usage on 3-axis machine", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 Y10.0 A45.0", {
          target: { x: 10, y: 10, a: 45 },
        }),
      ];
      const issues = validator.validate(blocks, vmcNoB, { expectedAxisCount: 3 });
      expect(issues.some((i) => i.ruleId === "AXIS_COUNT_3_WITH_ROTARY")).toBe(true);
    });

    it("does not flag 3-axis motion on 3-axis machine", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 Y10.0 Z-5.0", {
          target: { x: 10, y: 10, z: -5 },
        }),
      ];
      const issues = validator.validate(blocks, vmcNoB, { expectedAxisCount: 3 });
      expect(issues.some((i) => i.ruleId === "AXIS_COUNT_3_WITH_ROTARY")).toBe(false);
    });

    it("flags excessive axes on 4-axis machine", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 Y10.0 Z-5.0 A45.0 B90.0", {
          target: { x: 10, y: 10, z: -5, a: 45, b: 90 },
        }),
      ];
      const issues = validator.validate(blocks, vmcNoB, { expectedAxisCount: 4 });
      expect(issues.some((i) => i.ruleId === "AXIS_COUNT_4_EXCEEDED")).toBe(true);
    });
  });

  describe("kinematic chain checks", () => {
    it("flags simultaneous multi-axis on VMC without trunnion", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 Y10.0 Z-5.0 A45.0 C90.0", {
          target: { x: 10, y: 10, z: -5, a: 45, c: 90 },
        }),
      ];
      const issues = validator.validate(blocks, vmcNoB);
      expect(issues.some((i) => i.ruleId === "KINEMATIC_5AXIS_NO_TRUNNION")).toBe(true);
    });
  });

  describe("kinematic singularity", () => {
    it("warns when B-axis is near 90° with linear axes", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 B90.0", {
          target: { x: 10, b: 90 },
        }),
      ];
      const issues = validator.validate(blocks, vmcWithB);
      expect(issues.some((i) => i.ruleId === "KINEMATIC_SINGULARITY")).toBe(true);
    });

    it("does not warn when B-axis is away from 90°", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 B45.0", {
          target: { x: 10, b: 45 },
        }),
      ];
      const issues = validator.validate(blocks, vmcWithB);
      expect(issues.some((i) => i.ruleId === "KINEMATIC_SINGULARITY")).toBe(false);
    });

    it("does not warn for B-axis near 90° without linear axes", () => {
      const blocks = [
        createIRBlock("linear", "G01 B90.0", {
          target: { b: 90 },
        }),
      ];
      const issues = validator.validate(blocks, vmcWithB);
      expect(issues.some((i) => i.ruleId === "KINEMATIC_SINGULARITY")).toBe(false);
    });
  });

  describe("HMC summary checks", () => {
    it("warns when HMC program uses only linear axes", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 Y10.0 Z-5.0", {
          target: { x: 10, y: 10, z: -5 },
        }),
      ];
      const issues = validator.validate(blocks, hmc);
      expect(issues.some((i) => i.ruleId === "HMC_NO_ROTARY")).toBe(true);
      expect(issues.find((i) => i.ruleId === "HMC_NO_ROTARY")!.severity).toBe("info");
    });

    it("does not warn when HMC program uses B-axis", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 Y10.0 B90.0", {
          target: { x: 10, y: 10, b: 90 },
        }),
      ];
      const issues = validator.validate(blocks, hmc);
      expect(issues.some((i) => i.ruleId === "HMC_NO_ROTARY")).toBe(false);
    });
  });

  describe("edge cases", () => {
    it("handles empty blocks array", () => {
      const issues = validator.validate([], vmcNoB);
      expect(issues).toEqual([]);
    });

    it("handles blocks without targets", () => {
      const blocks = [
        createIRBlock("spindle-forward", "M3 S1000"),
        createIRBlock("coolant-flood", "M8"),
      ];
      const issues = validator.validate(blocks, vmcNoB);
      expect(issues.length).toBe(0);
    });

    it("is reusable between validate calls", () => {
      const badBlocks = [
        createIRBlock("linear", "G01 X10.0 B90.0", {
          target: { x: 10, b: 90 },
        }),
      ];
      const goodBlocks = [
        createIRBlock("linear", "G01 X10.0 Y10.0", {
          target: { x: 10, y: 10 },
        }),
      ];

      const issues1 = validator.validate(badBlocks, vmcNoB);
      expect(issues1.length).toBeGreaterThan(0);

      const issues2 = validator.validate(goodBlocks, vmcNoB);
      expect(issues2.length).toBe(0);
    });

    it("getIssues returns a copy of issues", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 B90.0", {
          target: { x: 10, b: 90 },
        }),
      ];
      validator.validate(blocks, vmcNoB);
      const issues = validator.getIssues();
      expect(issues.length).toBeGreaterThan(0);
      // Modifying the copy should not affect the validator
      issues.length = 0;
      expect(validator.getIssues().length).toBeGreaterThan(0);
    });

    it("reset clears issues", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 B90.0", {
          target: { x: 10, b: 90 },
        }),
      ];
      validator.validate(blocks, vmcNoB);
      expect(validator.getIssues().length).toBeGreaterThan(0);
      validator.reset();
      expect(validator.getIssues().length).toBe(0);
    });

    it("handles U, V, W axes without issues", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 U5.0", {
          target: { x: 10, u: 5 },
        }),
      ];
      // Should not throw
      const issues = validator.validate(blocks, vmcNoB);
      // U/V/W are valid linear axes
      expect(issues.some((i) => i.ruleId === "AXIS_COUNT_3_WITH_ROTARY")).toBe(false);
    });
  });

  describe("options", () => {
    it("respects checkKinematicChain: false", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 Y10.0 Z-5.0 A45.0 B90.0", {
          target: { x: 10, y: 10, z: -5, a: 45, b: 90 },
        }),
      ];
      const issues = validator.validate(blocks, vmcNoB, { checkKinematicChain: false });
      expect(issues.some((i) => i.ruleId === "KINEMATIC_5AXIS_NO_TRUNNION")).toBe(false);
    });

    it("respects checkBRotation: false", () => {
      const blocks = [
        createIRBlock("linear", "G01 X10.0 B450.0", {
          target: { x: 10, b: 450 },
        }),
      ];
      const issues = validator.validate(blocks, hmc, { checkBRotation: false });
      expect(issues.some((i) => i.ruleId === "B_AXIS_RANGE_HMC")).toBe(false);
    });
  });
});
