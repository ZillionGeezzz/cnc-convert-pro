import { describe, it, expect } from "vitest";
import { applyTransformations } from "./index";
import { createIRBlock } from "../types";
import type { ControllerFormat } from "../../types";

describe("applyTransformations", () => {
  describe("identity — same source and target", () => {
    it("returns blocks unchanged when source === target", () => {
      const blocks = [createIRBlock("rapid", "G00 X10.0")];
      const result = applyTransformations(blocks, "fanuc-0i", "fanuc-0i");
      expect(result).toBe(blocks);
    });
  });

  describe("Fanuc → Siemens cycle mapping", () => {
    const src: ControllerFormat = "fanuc-0i";
    const tgt: ControllerFormat = "siemens-840d";

    it("maps G81 → CYCLE81", () => {
      const blocks = [
        createIRBlock("cycle-drill", "G81 X10.0 Z-10.0 R2.0", {
          cycle: { type: "drill", retractPlane: 2, depth: 10, originalCycleId: "G81" },
        }),
      ];
      const result = applyTransformations(blocks, src, tgt);
      expect(result[0].cycle!.originalCycleId).toBe("CYCLE81");
    });

    it("maps all G81-G89 cycles correctly", () => {
      const gCodes = ["G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"];
      const siemensCodes = ["CYCLE81", "CYCLE82", "CYCLE83", "CYCLE84", "CYCLE85", "CYCLE86", "CYCLE87", "CYCLE88", "CYCLE89"];

      for (let i = 0; i < gCodes.length; i++) {
        const blocks = [
          createIRBlock("cycle-drill", gCodes[i], {
            cycle: { type: "drill", retractPlane: 2, depth: 10, originalCycleId: gCodes[i] },
          }),
        ];
        const result = applyTransformations(blocks, src, tgt);
        expect(result[0].cycle!.originalCycleId).toBe(siemensCodes[i]);
      }
    });

    it("adds audit and transformation entries", () => {
      const blocks = [
        createIRBlock("cycle-drill", "G81", {
          cycle: { type: "drill", retractPlane: 2, depth: 10, originalCycleId: "G81" },
        }),
      ];
      const result = applyTransformations(blocks, src, tgt);
      expect(result[0].transformations.length).toBeGreaterThan(0);
      expect(result[0].transformations[0].ruleId).toBe("CYCLE_G81_TO_CYCLE81");
      expect(result[0].audit.length).toBeGreaterThan(0);
    });

    it("passes through non-cycle blocks unchanged", () => {
      const blocks = [createIRBlock("rapid", "G00 X10.0", { target: { x: 10 } })];
      const result = applyTransformations(blocks, src, tgt);
      expect(result[0].type).toBe("rapid");
      expect(result[0].target).toEqual({ x: 10 });
    });
  });

  describe("Siemens → Fanuc cycle mapping", () => {
    const src: ControllerFormat = "siemens-840d";
    const tgt: ControllerFormat = "fanuc-0i";

    it("maps CYCLE81 → G81", () => {
      const blocks = [
        createIRBlock("cycle-drill", "CYCLE81(2,0,2,10)", {
          cycle: { type: "drill", retractPlane: 2, depth: 10, originalCycleId: "CYCLE81" },
        }),
      ];
      const result = applyTransformations(blocks, src, tgt);
      expect(result[0].cycle!.originalCycleId).toBe("G81");
    });

    it("maps all CYCLE81-CYCLE89 → G81-G89", () => {
      const siemensCodes = ["CYCLE81", "CYCLE82", "CYCLE83", "CYCLE84", "CYCLE85", "CYCLE86", "CYCLE87", "CYCLE88", "CYCLE89"];
      const gCodes = ["G81", "G82", "G83", "G84", "G85", "G86", "G87", "G88", "G89"];

      for (let i = 0; i < siemensCodes.length; i++) {
        const blocks = [
          createIRBlock("cycle-drill", siemensCodes[i], {
            cycle: { type: "drill", retractPlane: 2, depth: 10, originalCycleId: siemensCodes[i] },
          }),
        ];
        const result = applyTransformations(blocks, src, tgt);
        expect(result[0].cycle!.originalCycleId).toBe(gCodes[i]);
      }
    });
  });

  describe("Heidenhain → Fanuc cycle mapping", () => {
    const src: ControllerFormat = "heidenhain-tnc640";
    const tgt: ControllerFormat = "fanuc-0i";

    it("maps CYCL DEF 200 → G81", () => {
      const blocks = [
        createIRBlock("cycle-drill", "CYCL DEF 200 DRILLING", {
          cycle: { type: "drill", retractPlane: 2, depth: 10, originalCycleId: "CYCL DEF 200" },
        }),
      ];
      const result = applyTransformations(blocks, src, tgt);
      expect(result[0].cycle!.originalCycleId).toBe("G81");
    });

    it("maps CYCL DEF 201-208 → G82-G89", () => {
      const hhCodes = ["200", "201", "202", "203", "204", "205", "206", "207"];
      const gCodes = ["G81", "G85", "G85", "G83", "G87", "G83", "G84", "G84"];

      for (let i = 0; i < hhCodes.length; i++) {
        const blocks = [
          createIRBlock("cycle-drill", `CYCL DEF ${hhCodes[i]}`, {
            cycle: { type: "drill", retractPlane: 2, depth: 10, originalCycleId: `CYCL DEF ${hhCodes[i]}` },
          }),
        ];
        const result = applyTransformations(blocks, src, tgt);
        expect(result[0].cycle!.originalCycleId).toBe(gCodes[i]);
      }
    });

    it("passes through unknown cycle numbers", () => {
      const blocks = [
        createIRBlock("cycle-other", "CYCL DEF 999 CUSTOM", {
          cycle: { type: "other", retractPlane: 2, depth: 10, originalCycleId: "CYCL DEF 999" },
        }),
      ];
      const result = applyTransformations(blocks, src, tgt);
      expect(result[0].cycle!.originalCycleId).toBe("CYCL DEF 999");
    });
  });

  describe("Heidenhain → Siemens cycle mapping", () => {
    const src: ControllerFormat = "heidenhain-tnc640";
    const tgt: ControllerFormat = "siemens-840d";

    it("maps CYCL DEF 200 → CYCLE81", () => {
      const blocks = [
        createIRBlock("cycle-drill", "CYCL DEF 200 DRILLING", {
          cycle: { type: "drill", retractPlane: 2, depth: 10, originalCycleId: "CYCL DEF 200" },
        }),
      ];
      const result = applyTransformations(blocks, src, tgt);
      expect(result[0].cycle!.originalCycleId).toBe("CYCLE81");
    });

    it("maps CYCL DEF 200-204 → CYCLE81-85", () => {
      const hhCodes = ["200", "201", "202", "203", "204", "205", "206", "207"];
      const siemensCodes = ["CYCLE81", "CYCLE85", "CYCLE85", "CYCLE83", "CYCLE87", "CYCLE83", "CYCLE84", "CYCLE84"];

      for (let i = 0; i < hhCodes.length; i++) {
        const blocks = [
          createIRBlock("cycle-drill", `CYCL DEF ${hhCodes[i]}`, {
            cycle: { type: "drill", retractPlane: 2, depth: 10, originalCycleId: `CYCL DEF ${hhCodes[i]}` },
          }),
        ];
        const result = applyTransformations(blocks, src, tgt);
        expect(result[0].cycle!.originalCycleId).toBe(siemensCodes[i]);
      }
    });

    it("passes through unknown cycle numbers (205+)", () => {
      const blocks = [
        createIRBlock("cycle-bore", "CYCL DEF 205 BORING", {
          cycle: { type: "bore", retractPlane: 2, depth: 10, originalCycleId: "CYCL DEF 205" },
        }),
      ];
      const result = applyTransformations(blocks, src, tgt);
      expect(result[0].cycle!.originalCycleId).toBe("CYCLE83");
      expect(result[0].audit[result[0].audit.length - 1]?.confidence).toBe("approximate");
    });
  });

  describe("Fanuc → Heidenhain cycle mapping", () => {
    const src: ControllerFormat = "fanuc-0i";
    const tgt: ControllerFormat = "heidenhain-tnc640";

    it("maps G81 → CYCL DEF 200", () => {
      const blocks = [
        createIRBlock("cycle-drill", "G81 X10.0 Z-10.0 R2.0", {
          cycle: { type: "drill", retractPlane: 2, depth: 10, originalCycleId: "G81" },
        }),
      ];
      const result = applyTransformations(blocks, src, tgt);
      expect(result[0].cycle!.originalCycleId).toBe("CYCL DEF 200");
    });

    it("maps G81-G85 → CYCL DEF 200-204", () => {
      const gCodes = ["G81", "G82", "G83", "G84", "G85"];
      const hhCodes = ["CYCL DEF 200", "CYCL DEF 200", "CYCL DEF 203", "CYCL DEF 206", "CYCL DEF 202"];

      for (let i = 0; i < gCodes.length; i++) {
        const blocks = [
          createIRBlock("cycle-drill", gCodes[i], {
            cycle: { type: "drill", retractPlane: 2, depth: 10, originalCycleId: gCodes[i] },
          }),
        ];
        const result = applyTransformations(blocks, src, tgt);
        expect(result[0].cycle!.originalCycleId).toBe(hhCodes[i]);
      }
    });

    it("passes through unmapped G86-G89", () => {
      const blocks = [
        createIRBlock("cycle-bore", "G86", {
          cycle: { type: "bore", retractPlane: 2, depth: 10, originalCycleId: "G86" },
        }),
      ];
      const result = applyTransformations(blocks, src, tgt);
      expect(result[0].cycle!.originalCycleId).toBe("CYCL DEF 202");
      expect(result[0].audit[result[0].audit.length - 1]?.confidence).toBe("approximate");
    });
  });

  describe("Siemens tool name → comment", () => {
    it("converts Siemens tool name to comment for non-Siemens targets", () => {
      const blocks = [
        createIRBlock("tool-change", "T=\"10MM ENDMILL\" M6", {
          toolName: "10MM ENDMILL",
          toolNumber: 10,
        }),
      ];
      const result = applyTransformations(blocks, "siemens-840d", "fanuc-0i");
      expect(result[0].comment).toBe("Tool: 10MM ENDMILL");
    });

    it("appends tool name comment when block already has a comment", () => {
      const blocks = [
        createIRBlock("tool-change", "T=\"10MM ENDMILL\" M6 (roughing)", {
          toolName: "10MM ENDMILL",
          toolNumber: 10,
          comment: "roughing",
        }),
      ];
      const result = applyTransformations(blocks, "siemens-840d", "fanuc-0i");
      expect(result[0].comment).toBe("Tool: 10MM ENDMILL; roughing");
    });

    it("does not convert tool name when target is also Siemens", () => {
      const blocks = [
        createIRBlock("tool-change", "T=\"10MM ENDMILL\" M6", {
          toolName: "10MM ENDMILL",
          toolNumber: 10,
        }),
      ];
      const result = applyTransformations(blocks, "siemens-840d", "siemens-828d");
      expect(result[0].comment).toBeUndefined();
    });

    it("does not affect blocks without toolName", () => {
      const blocks = [
        createIRBlock("tool-change", "T1 M6", { toolNumber: 1 }),
      ];
      const result = applyTransformations(blocks, "siemens-840d", "fanuc-0i");
      expect(result[0].comment).toBeUndefined();
    });
  });

  describe("pipeline composition", () => {
    it("applies multiple transformations in sequence", () => {
      // Siemens with cycle + tool name → Fanuc
      const blocks = [
        createIRBlock("cycle-drill", "CYCLE81(2,0,2,10)", {
          cycle: { type: "drill", retractPlane: 2, depth: 10, originalCycleId: "CYCLE81" },
          toolName: "DRILL_6MM",
        }),
      ];
      const result = applyTransformations(blocks, "siemens-840d", "fanuc-0i");
      // Cycle mapped
      expect(result[0].cycle!.originalCycleId).toBe("G81");
      // Tool name as comment
      expect(result[0].comment).toBe("Tool: DRILL_6MM");
    });
  });
});
