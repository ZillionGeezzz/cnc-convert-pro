import {
  NeutralIRBlock,
  IRBlockType,
  AxisTarget,
  CycleDefinition,
  createIRBlock,
  BlockTransformation,
} from "./types";
import type { CNCBlock, ControllerFormat } from "../types";
import { getControllerFamily } from "./family";

/**
 * Normalize a CNCBlock (from any parser) into a NeutralIRBlock.
 *
 * This is the core semantic mapping layer. Every parser output becomes
 * a vendor-neutral NeutralIRBlock with:
 * - Canonical type (rapid, linear, clockwise-arc, etc.)
 * - Normalized axis targets
 * - Normalized cycle definitions
 * - Transformation audit trail
 */
export function normalizeBlock(
  block: CNCBlock,
  sourceFormat: ControllerFormat,
  index: number,
): NeutralIRBlock {
  const family = getControllerFamily(sourceFormat);

  // ==========================================
  // PROGRAM START / END
  // ==========================================
  if (block.isProgramStart) {
    return createIRBlock("program-start", block.raw, {
      comment: block.comment,
    });
  }
  if (block.isProgramEnd) {
    return createIRBlock("program-end", block.raw, {
      comment: block.comment,
      audit: [{ ruleId: "PROGRAM_END", description: "Program end marker", source: block.raw, target: block.raw, confidence: "exact" }],
    });
  }

  // ==========================================
  // SIEMENS-SPECIFIC CYCLE CALLS
  // ==========================================
  if (block.siemensCycleCall) {
    return normalizeSiemensCycle(block);
  }

  // ==========================================
  // HEIDENHAIN-SPECIFIC COMMANDS
  // ==========================================
  if (family === "heidenhain" && block.heidenhainCommand) {
    return normalizeHeidenhainCommand(block);
  }

  // ==========================================
  // G-CODE ANALYSIS
  // ==========================================
  const gCodes = block.gCodes || [];
  const mCodes = block.mCodes || [];

  // G-codes sorted by precedence
  for (const g of gCodes) {
    const gNum = parseInt(g.replace("G", ""), 10);
    if (isNaN(gNum)) continue;

    // Motion codes (Group 01)
    const motionIR = normalizeMotionGCode(gNum, block);
    if (motionIR) return motionIR;

    // Modal state codes (Groups 02-14)
    const modalIR = normalizeModalGCode(gNum, block);
    if (modalIR) return modalIR;
  }

  // ==========================================
  // M-CODE ANALYSIS
  // ==========================================
  for (const m of mCodes) {
    const mNum = parseInt(m.replace("M", ""), 10);
    if (isNaN(mNum)) continue;

    const mIR = normalizeMCode(mNum, block);
    if (mIR) return mIR;
  }

  // ==========================================
  // TOOL (standalone T word without M6)
  // ==========================================
  if (block.toolNumber !== undefined && !hasMCode(block, 6)) {
    return createIRBlock("tool-definition", block.raw, {
      comment: block.comment,
      toolNumber: block.toolNumber,
      toolName: block.toolName,
      audit: [{ ruleId: "TOOL_DEF", description: "Tool definition", source: block.raw, target: block.raw, confidence: "exact" }],
    });
  }

  // ==========================================
  // COMMENT ONLY
  // ==========================================
  if (block.comment && gCodes.length === 0 && mCodes.length === 0) {
    return createIRBlock("comment", block.raw, {
      comment: block.comment,
    });
  }

  // ==========================================
  // FALLBACK — unknown
  // ==========================================
  return createIRBlock("unknown", block.raw, {
    comment: block.comment,
    audit: [{ ruleId: "UNKNOWN_BLOCK", description: "Block type not recognized", source: block.raw, target: block.raw, confidence: "manual-review-needed" }],
  });
}

// ==========================================
// NORMALIZER HELPERS
// ==========================================

function hasMCode(block: CNCBlock, mNum: number): boolean {
  return (block.mCodes || []).some((m) => m === `M${mNum}` || m === `M${String(mNum).padStart(2, "0")}`);
}

function extractTarget(block: CNCBlock): AxisTarget | undefined {
  const axes = block.axes || {};
  const hasMotion = Object.keys(axes).length > 0;
  if (!hasMotion) return undefined;

  const target: AxisTarget = {};
  for (const [axis, val] of Object.entries(axes)) {
    (target as any)[axis.toLowerCase()] = val;
  }
  // Also extract I, J, K from addresses
  const addr = block.addresses || {};
  if (addr["I"] !== undefined) target.i = addr["I"] as number;
  if (addr["J"] !== undefined) target.j = addr["J"] as number;
  if (addr["K"] !== undefined) target.k = addr["K"] as number;
  if (addr["R"] !== undefined) target.r = addr["R"] as number;
  return target;
}

function normalizeMotionGCode(gNum: number, block: CNCBlock): NeutralIRBlock | null {
  const target = extractTarget(block);
  const feedRate = block.feed;
  const spindleSpeed = block.spindleSpeed;
  const base = {
    raw: block.raw,
    comment: block.comment,
    lineNumber: block.lineNumber,
    target,
    feedRate,
    spindleSpeed,
    transformations: [] as BlockTransformation[],
    audit: [{ ruleId: `MOTION_G${gNum}`, description: `Motion G${gNum}`, source: block.raw, target: block.raw, confidence: "exact" } as const],
  };

  switch (gNum) {
    case 0: return createIRBlock("rapid", block.raw, base);
    case 1: return createIRBlock("linear", block.raw, base);
    case 2: return createIRBlock("clockwise-arc", block.raw, base);
    case 3: return createIRBlock("counterclockwise-arc", block.raw, base);

    // Fixed cycles (G81-G89)
    case 81: return createIRBlock("cycle-drill", block.raw, {
      ...base,
      cycle: extractCycleFromBlock(block, "drill", "G81"),
    });
    case 82: return createIRBlock("cycle-drill", block.raw, {
      ...base,
      cycle: extractCycleFromBlock(block, "drill", "G82", { dwell: (block.addresses["P"] as number) || 1 }),
    });
    case 83: return createIRBlock("cycle-peck-drill", block.raw, {
      ...base,
      cycle: extractCycleFromBlock(block, "peck-drill", "G83", { peckDepth: (block.addresses["Q"] as number) || 3 }),
    });
    case 84: return createIRBlock("cycle-tap", block.raw, {
      ...base,
      cycle: extractCycleFromBlock(block, "tap", "G84", { pitch: (block.addresses["P"] as number) || 1.5, feedRate: block.feed }),
    });
    case 85: return createIRBlock("cycle-bore", block.raw, {
      ...base,
      cycle: extractCycleFromBlock(block, "bore", "G85"),
    });
    case 86: return createIRBlock("cycle-bore", block.raw, {
      ...base,
      cycle: extractCycleFromBlock(block, "bore", "G86", { dwell: (block.addresses["P"] as number) || 0 }),
    });
    case 87: return createIRBlock("cycle-other", block.raw, {
      ...base,
      cycle: extractCycleFromBlock(block, "other", "G87"),
    });
    case 88: return createIRBlock("cycle-bore", block.raw, {
      ...base,
      cycle: extractCycleFromBlock(block, "bore", "G88", { dwell: (block.addresses["P"] as number) || 0 }),
    });
    case 89: return createIRBlock("cycle-bore", block.raw, {
      ...base,
      cycle: extractCycleFromBlock(block, "bore", "G89"),
    });

    default:
      return null; // Not a motion G-code, try modal
  }
}

function normalizeModalGCode(gNum: number, block: CNCBlock): NeutralIRBlock | null {
  const base = { raw: block.raw, comment: block.comment, transformations: [] as BlockTransformation[] };

  switch (gNum) {
    case 17: return createIRBlock("plane-xy", block.raw, base);
    case 18: return createIRBlock("plane-xz", block.raw, base);
    case 19: return createIRBlock("plane-yz", block.raw, base);
    case 20: return createIRBlock("units-imperial", block.raw, base);
    case 21: return createIRBlock("units-metric", block.raw, base);
    case 28: return createIRBlock("reference-return", block.raw, base);
    case 30: return createIRBlock("reference-return", block.raw, { ...base, referencePoint: 30 });
    case 40: return createIRBlock("cutter-comp-off", block.raw, base);
    case 41: return createIRBlock("cutter-comp-left", block.raw, base);
    case 42: return createIRBlock("cutter-comp-right", block.raw, base);
    case 43: return createIRBlock("unknown", block.raw, base); // tool length compensation +H
    case 49: return createIRBlock("unknown", block.raw, base); // cancel tool length comp
    case 53: return createIRBlock("reference-return", block.raw, { ...base, referencePoint: 53 });
    case 54: return createIRBlock("work-offset", block.raw, { ...base, workOffset: 0 });
    case 55: return createIRBlock("work-offset", block.raw, { ...base, workOffset: 1 });
    case 56: return createIRBlock("work-offset", block.raw, { ...base, workOffset: 2 });
    case 57: return createIRBlock("work-offset", block.raw, { ...base, workOffset: 3 });
    case 58: return createIRBlock("work-offset", block.raw, { ...base, workOffset: 4 });
    case 59: return createIRBlock("work-offset", block.raw, { ...base, workOffset: 5 });
    case 90: return createIRBlock("absolute-mode", block.raw, base);
    case 91: return createIRBlock("incremental-mode", block.raw, base);
    case 92: return createIRBlock("unknown", block.raw, base); // position register
    case 94: return createIRBlock("feed-mode", block.raw, { ...base, feedModeValue: "G94" });
    case 95: return createIRBlock("feed-mode", block.raw, { ...base, feedModeValue: "G95" });
    case 96: return createIRBlock("feed-mode", block.raw, { ...base, feedModeValue: "G96", spindleSpeed: block.spindleSpeed });
    case 97: return createIRBlock("feed-mode", block.raw, { ...base, feedModeValue: "G97", spindleSpeed: block.spindleSpeed });
    case 98: return createIRBlock("unknown", block.raw, base); // return to initial level
    case 99: return createIRBlock("unknown", block.raw, base); // return to R level
    default: return null;
  }
}

function normalizeMCode(mNum: number, block: CNCBlock): NeutralIRBlock | null {
  const base = { raw: block.raw, comment: block.comment, transformations: [] as BlockTransformation[] };
  const spindleSpeed = block.spindleSpeed;

  switch (mNum) {
    case 0: return createIRBlock("program-end", block.raw, base);
    case 1: return createIRBlock("unknown", block.raw, base); // optional stop
    case 2: return createIRBlock("program-end", block.raw, base);
    case 3: return createIRBlock("spindle-forward", block.raw, { ...base, spindleSpeed });
    case 4: return createIRBlock("spindle-reverse", block.raw, { ...base, spindleSpeed });
    case 5: return createIRBlock("spindle-stop", block.raw, base);
    case 6: return createIRBlock("tool-change", block.raw, {
      ...base,
      toolNumber: block.toolNumber,
      toolOffset: (block.addresses["D"] as number) || block.toolNumber,
    });
    case 7: return createIRBlock("coolant-mist", block.raw, base);
    case 8: return createIRBlock("coolant-flood", block.raw, base);
    case 9: return createIRBlock("coolant-off", block.raw, base);
    case 17: return createIRBlock("spindle-stop", block.raw, base); // sometimes M17 = end of sub
    case 19: return createIRBlock("spindle-orient", block.raw, base);
    case 30: return createIRBlock("program-end", block.raw, base);
    case 98: return createIRBlock("subprogram-call", block.raw, { ...base, subprogram: String(block.addresses["P"] || "") });
    case 99: return createIRBlock("subprogram-end", block.raw, base);
    default: return null;
  }
}

function normalizeSiemensCycle(block: CNCBlock): NeutralIRBlock {
  const cycleName = (block.cycle || "").toUpperCase();
  const params = block.cycleParams || [];
  const target = extractTarget(block);

  // Parse Siemens cycle parameters
  // Standard: CYCLE81(RTP, RFP, SDIS, DP, DPR)
  // Standard: CYCLE83(RTP, RFP, SDIS, DP, DPR, FDEP, FDPR, DAM, DTB, DTS, FRF, VARI)
  // Standard: CYCLE84(RTP, RFP, SDIS, DP, DPR, DTB, SDAC, MPIT, PIT, POS, SST, SST1)
  // Standard: CYCLE85(RTP, RFP, SDIS, DP, DPR, FFR, RFF)

  const rtp = params[0] || 0; // Retract plane
  const rfp = params[1] || 0; // Reference plane
  const sdis = params[2] || 0; // Safety distance
  const dp = params[3] || 0; // Depth
  const retract = rfp + sdis; // Effective retract plane

  let cycleType: CycleDefinition["type"] = "drill";
  let irType: "cycle-drill" | "cycle-peck-drill" | "cycle-tap" | "cycle-bore" | "cycle-other";
  let cycleExtra: Partial<CycleDefinition> = {};

  switch (cycleName) {
    case "CYCLE81":
      irType = "cycle-drill";
      break;
    case "CYCLE82":
      irType = "cycle-drill";
      cycleExtra.dwell = params[4] || 0;
      break;
    case "CYCLE83":
      irType = "cycle-peck-drill";
      cycleType = "peck-drill";
      cycleExtra = {
        peckDepth: params[6] || params[7] || Math.min(dp / 2, 3),
        chipBreak: params[7] || 0,
      };
      break;
    case "CYCLE84":
      irType = "cycle-tap";
      cycleType = "tap";
      cycleExtra = {
        pitch: (params[8] || params[7]) as number || 1.5,
        feedRate: block.feed || (block.spindleSpeed || 500) * (params[8] || 1.5),
      };
      break;
    case "CYCLE85":
      irType = "cycle-bore";
      cycleType = "bore";
      break;
    default:
      irType = "cycle-other";
      cycleType = "other";
      break;
  }

  const cycleDef: CycleDefinition = {
    type: cycleType,
    retractPlane: retract,
    depth: Math.abs(dp),
    originalCycleId: cycleName,
    originalParams: params.join(","),
    ...cycleExtra,
  };

  return createIRBlock(irType, block.raw, {
    comment: block.comment,
    target,
    cycle: cycleDef,
    feedRate: block.feed,
    spindleSpeed: block.spindleSpeed,
    audit: [{ ruleId: `${cycleName}_TO_IR`, description: `Siemens ${cycleName} normalized to IR cycle`, source: block.siemensCycleCall || block.raw, target: irType, confidence: "exact" }],
  });
}

function normalizeHeidenhainCommand(block: CNCBlock): NeutralIRBlock {
  const cmd = block.heidenhainCommand!;
  const target = extractTarget(block);
  const base = {
    raw: block.raw,
    comment: block.comment,
    target,
    feedRate: block.feed,
    spindleSpeed: block.spindleSpeed,
    toolNumber: block.toolNumber,
    toolName: block.toolName,
    transformations: [] as BlockTransformation[],
  };

  switch (cmd) {
    case "L": {
      // L with R0 = rapid, without = linear
      const isRapid = block.addresses["R0"] !== undefined;
      return createIRBlock(isRapid ? "rapid" : "linear", block.raw, {
        ...base,
        audit: [{ ruleId: "HH_L_TO_MOTION", description: `Heidenhain L → ${isRapid ? "rapid" : "linear"}`, source: block.raw, target: isRapid ? "rapid" : "linear", confidence: "exact" }],
      });
    }
    case "CC":
    case "CP":
    case "CR":
    case "CT":
      return createIRBlock(cmd === "CC" ? "clockwise-arc" : cmd === "CR" ? "clockwise-arc" : "counterclockwise-arc", block.raw, {
        ...base,
        audit: [{ ruleId: `HH_${cmd}_TO_ARC`, description: `Heidenhain ${cmd} → arc`, source: block.raw, target: "arc", confidence: "approximate" }],
      });

    case "TOOL CALL":
      return createIRBlock("tool-change", block.raw, {
        toolNumber: block.toolNumber || 1,
        spindleSpeed: block.spindleSpeed,
        audit: [{ ruleId: "HH_TOOL_CALL", description: "Heidenhain TOOL CALL → tool-change", source: block.raw, target: "tool-change", confidence: "exact" }],
      });

    case "TOOL DEF":
      return createIRBlock("tool-definition", block.raw, {
        toolNumber: block.toolNumber,
        audit: [{ ruleId: "HH_TOOL_DEF", description: "Heidenhain TOOL DEF → tool-definition", source: block.raw, target: "tool-definition", confidence: "exact" }],
      });

    case "CYCL DEF": {
      const cycleNum = parseFloat(block.cycle || "0");
      const operation = block.mCodes?.[0] || "DRILLING";
      const irType: IRBlockType = cycleNum >= 203 ? "cycle-tap"
        : cycleNum >= 202 ? "cycle-peck-drill"
        : "cycle-drill";

      const cycleDef: CycleDefinition = {
        type: irType === "cycle-tap" ? "tap" : irType === "cycle-peck-drill" ? "peck-drill" : "drill",
        retractPlane: block.qParams["QL200"] || 2,
        depth: Math.abs(block.qParams["QL201"] || 10),
        peckDepth: block.qParams["QL210"] || 3,
        dwell: block.qParams["QL213"] || 0,
        originalCycleId: `CYCL DEF ${cycleNum}`,
      };

      return createIRBlock(irType, block.raw, {
        ...base,
        cycle: cycleDef,
        audit: [{ ruleId: `HH_CYCL_DEF_${cycleNum}`, description: `Heidenhain CYCL DEF ${cycleNum} → IR cycle`, source: block.raw, target: irType, confidence: "exact" }],
      });
    }

    case "CYCL CALL":
      return createIRBlock("cycle-call", block.raw, {
        audit: [{ ruleId: "HH_CYCL_CALL", description: "Heidenhain CYCL CALL → cycle-call", source: block.raw, target: "cycle-call", confidence: "exact" }],
      });

    case "LBL":
      return createIRBlock("label", block.raw, {
        label: block.raw,
      });

    case "BEGIN":
      return createIRBlock("program-start", block.raw);

    case "END":
      return createIRBlock("program-end", block.raw);

    case "APPR":
    case "DEP":
    case "RND":
    case "CHF":
    case "MIRROR":
    case "ROT":
    case "SCALE":
    case "TRAFO":
    case "BLK FORM":
      return createIRBlock("unknown", block.raw, {
        ...base,
        audit: [{ ruleId: `HH_${cmd}`, description: `Heidenhain ${cmd} — preserved as-is`, source: block.raw, target: block.raw, confidence: "approximate" }],
      });

    default:
      if (cmd.startsWith("FN") || cmd === "Q") {
        return createIRBlock("macro-definition", block.raw, {
          ...base,
          audit: [{ ruleId: "HH_MACRO", description: `Heidenhain ${cmd} → macro`, source: block.raw, target: "macro-definition", confidence: "exact" }],
        });
      }
      return createIRBlock("unknown", block.raw, {
        ...base,
        audit: [{ ruleId: "HH_UNKNOWN", description: `Unrecognized Heidenhain command: ${cmd}`, source: block.raw, target: "unknown", confidence: "manual-review-needed" }],
      });
  }
}

function extractCycleFromBlock(
  block: CNCBlock,
  type: CycleDefinition["type"],
  originalCycleId: string,
  extra?: Partial<CycleDefinition>,
): CycleDefinition {
  const z = Math.abs(block.axes["Z"] || 10);
  const r = (block.addresses["R"] as number) || 2;
  const q = (block.addresses["Q"] as number) || 3;
  const p = (block.addresses["P"] as number) || 0;

  return {
    type,
    retractPlane: r,
    depth: z,
    peckDepth: q !== 3 || type === "peck-drill" ? q : undefined,
    dwell: p || undefined,
    originalCycleId,
    feedRate: block.feed,
    ...extra,
  };
}

/**
 * Normalize an entire parsed program into NeutralIRBlock[].
 */
export function normalizeProgram(
  blocks: CNCBlock[],
  sourceFormat: ControllerFormat,
): NeutralIRBlock[] {
  return blocks.map((block, i) => normalizeBlock(block, sourceFormat, i));
}
