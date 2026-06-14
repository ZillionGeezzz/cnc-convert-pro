import {
  NeutralIRBlock,
  AxisTarget,
  CycleDefinition,
  createIRBlock,
  BlockTransformation,
  AuditEntry,
} from "./types";
import type { CNCBlock, ControllerFormat } from "../types";
import { getControllerFamily } from "./family";

type CycleIRType =
  | "cycle-drill"
  | "cycle-peck-drill"
  | "cycle-tap"
  | "cycle-bore"
  | "cycle-other";

type Confidence = AuditEntry["confidence"];

interface HeidenhainCycleSemantics {
  irType: CycleIRType;
  cycleType: CycleDefinition["type"];
  confidence: Confidence;
  description: string;
}

/**
 * Normalize a single CNCBlock into its first semantic IR block.
 *
 * Most callers should use normalizeProgram so compound source lines such as
 * "G90 G54 G17 G21" expand into multiple IR blocks.
 */
export function normalizeBlock(
  block: CNCBlock,
  sourceFormat: ControllerFormat,
  index: number,
): NeutralIRBlock {
  void index;
  return normalizeBlocksFromBlock(block, sourceFormat)[0] ?? createUnknownBlock(block);
}

function normalizeBlocksFromBlock(
  block: CNCBlock,
  sourceFormat: ControllerFormat,
): NeutralIRBlock[] {
  const family = getControllerFamily(sourceFormat);

  if (block.isProgramStart) {
    return [createIRBlock("program-start", block.raw, { comment: block.comment })];
  }

  if (block.isProgramEnd) {
    return [
      createIRBlock("program-end", block.raw, {
        comment: block.comment,
        audit: [
          {
            ruleId: "PROGRAM_END",
            description: "Program end marker",
            source: block.raw,
            target: block.raw,
            confidence: "exact",
          },
        ],
      }),
    ];
  }

  if (block.siemensCycleCall) {
    return [normalizeSiemensCycle(block)];
  }

  if (family === "heidenhain" && block.heidenhainCommand) {
    return [normalizeHeidenhainCommand(block)];
  }

  const irBlocks: NeutralIRBlock[] = [];
  const gCodes = block.gCodes || [];
  const mCodes = block.mCodes || [];
  const hasToolLengthComp = gCodes.some((g) => parseCodeNumber(g, "G") === 43);
  const modalIRBlocks: NeutralIRBlock[] = [];
  const motionIRBlocks: NeutralIRBlock[] = [];
  const toolLengthIRBlocks: NeutralIRBlock[] = [];

  for (const g of gCodes) {
    const gNum = parseCodeNumber(g, "G");
    if (gNum === null) continue;

    const modalIR = normalizeModalGCode(gNum, block);
    if (modalIR) {
      if (gNum === 43 || gNum === 49) {
        toolLengthIRBlocks.push(modalIR);
      } else {
        modalIRBlocks.push(modalIR);
      }
      continue;
    }

    const motionIR = normalizeMotionGCode(gNum, block, !(hasToolLengthComp && isStraightMotionGCode(gNum)));
    if (motionIR) {
      motionIRBlocks.push(motionIR);
    }
  }

  irBlocks.push(...modalIRBlocks, ...motionIRBlocks, ...toolLengthIRBlocks);

  if (block.toolNumber !== undefined && !hasMCode(block, 6)) {
    irBlocks.push(
      createIRBlock("tool-definition", block.raw, {
        toolNumber: block.toolNumber,
        toolName: block.toolName,
        audit: [
          {
            ruleId: "TOOL_DEF",
            description: "Tool definition",
            source: block.raw,
            target: block.raw,
            confidence: "exact",
          },
        ],
      }),
    );
  }

  for (const m of mCodes) {
    const mNum = parseCodeNumber(m, "M");
    if (mNum === null) continue;

    const mIR = normalizeMCode(mNum, block);
    if (mIR) {
      irBlocks.push(mIR);
    }
  }

  if (irBlocks.length > 0) {
    return attachCommentOnce(irBlocks, block.comment);
  }

  if (block.comment && gCodes.length === 0 && mCodes.length === 0) {
    return [createIRBlock("comment", block.raw, { comment: block.comment })];
  }

  return [createUnknownBlock(block)];
}

function createUnknownBlock(block: CNCBlock): NeutralIRBlock {
  return createIRBlock("unknown", block.raw, {
    comment: block.comment,
    audit: [
      {
        ruleId: "UNKNOWN_BLOCK",
        description: "Block type not recognized",
        source: block.raw,
        target: block.raw,
        confidence: "manual-review-needed",
      },
    ],
  });
}

function attachCommentOnce(
  blocks: NeutralIRBlock[],
  comment: string | undefined,
): NeutralIRBlock[] {
  if (!comment || blocks.length <= 1) return blocks;
  const lastIndex = blocks.length - 1;
  return blocks.map((block, i) => ({
    ...block,
    comment: i === lastIndex ? comment : undefined,
  }));
}

function parseCodeNumber(code: string, prefix: "G" | "M"): number | null {
  const normalized = code.toUpperCase().replace(prefix, "");
  const parsed = parseInt(normalized, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function hasMCode(block: CNCBlock, mNum: number): boolean {
  return (block.mCodes || []).some(
    (m) => m === `M${mNum}` || m === `M${String(mNum).padStart(2, "0")}`,
  );
}

function extractTarget(block: CNCBlock): AxisTarget | undefined {
  const axes = block.axes || {};
  const hasMotion = Object.keys(axes).length > 0;
  const addr = block.addresses || {};
  const hasArcData =
    addr["I"] !== undefined ||
    addr["J"] !== undefined ||
    addr["K"] !== undefined ||
    addr["R"] !== undefined;

  if (!hasMotion && !hasArcData) return undefined;

  const target: AxisTarget = {};
  for (const [axis, val] of Object.entries(axes)) {
    (target as Record<string, number>)[axis.toLowerCase()] = val;
  }

  if (addr["I"] !== undefined) target.i = addr["I"] as number;
  if (addr["J"] !== undefined) target.j = addr["J"] as number;
  if (addr["K"] !== undefined) target.k = addr["K"] as number;
  if (addr["R"] !== undefined) target.r = addr["R"] as number;

  return target;
}

function extractPositionTarget(block: CNCBlock): AxisTarget | undefined {
  const axes = block.axes || {};
  if (Object.keys(axes).length === 0) return undefined;

  const target: AxisTarget = {};
  for (const [axis, val] of Object.entries(axes)) {
    target[axis.toLowerCase() as keyof AxisTarget] = val;
  }
  return target;
}

function isStraightMotionGCode(gNum: number): boolean {
  return gNum === 0 || gNum === 1;
}

function baseMotionBlock(
  gNum: number,
  block: CNCBlock,
  includeTarget = true,
): Partial<NeutralIRBlock> {
  return {
    raw: block.raw,
    comment: block.comment,
    lineNumber: block.lineNumber,
    target: includeTarget ? extractTarget(block) : undefined,
    feedRate: block.feed,
    spindleSpeed: block.spindleSpeed,
    transformations: [] as BlockTransformation[],
    audit: [
      {
        ruleId: `MOTION_G${gNum}`,
        description: `Motion G${gNum}`,
        source: block.raw,
        target: block.raw,
        confidence: "exact",
      },
    ],
  };
}

function normalizeMotionGCode(gNum: number, block: CNCBlock, includeTarget = true): NeutralIRBlock | null {
  const base = baseMotionBlock(gNum, block, includeTarget);

  switch (gNum) {
    case 0:
      return createIRBlock("rapid", block.raw, base);
    case 1:
      return createIRBlock("linear", block.raw, base);
    case 2:
      return createIRBlock("clockwise-arc", block.raw, base);
    case 3:
      return createIRBlock("counterclockwise-arc", block.raw, base);
    case 81:
      return createIRBlock("cycle-drill", block.raw, {
        ...base,
        cycle: extractCycleFromBlock(block, "drill", "G81"),
      });
    case 82:
      return createIRBlock("cycle-drill", block.raw, {
        ...base,
        cycle: extractCycleFromBlock(block, "drill", "G82", {
          dwell: getNumber(block.addresses["P"]),
        }),
      });
    case 83:
      return createIRBlock("cycle-peck-drill", block.raw, {
        ...base,
        cycle: extractCycleFromBlock(block, "peck-drill", "G83", {
          peckDepth: getNumber(block.addresses["Q"]) ?? 3,
        }),
      });
    case 84:
      return createIRBlock("cycle-tap", block.raw, {
        ...base,
        cycle: extractCycleFromBlock(block, "tap", "G84", {
          feedRate: block.feed,
        }),
      });
    case 85:
      return createIRBlock("cycle-bore", block.raw, {
        ...base,
        cycle: extractCycleFromBlock(block, "bore", "G85"),
      });
    case 86:
      return createIRBlock("cycle-bore", block.raw, {
        ...base,
        cycle: extractCycleFromBlock(block, "bore", "G86"),
      });
    case 87:
      return createIRBlock("cycle-other", block.raw, {
        ...base,
        cycle: extractCycleFromBlock(block, "other", "G87"),
      });
    case 88:
      return createIRBlock("cycle-bore", block.raw, {
        ...base,
        cycle: extractCycleFromBlock(block, "bore", "G88", {
          dwell: getNumber(block.addresses["P"]),
        }),
      });
    case 89:
      return createIRBlock("cycle-bore", block.raw, {
        ...base,
        cycle: extractCycleFromBlock(block, "bore", "G89", {
          dwell: getNumber(block.addresses["P"]),
        }),
      });
    default:
      return null;
  }
}

function normalizeModalGCode(gNum: number, block: CNCBlock): NeutralIRBlock | null {
  const base = { raw: block.raw, comment: block.comment, transformations: [] as BlockTransformation[] };

  switch (gNum) {
    case 4:
      return createIRBlock("dwell", block.raw, {
        ...base,
        dwell: getNumber(block.addresses["P"]) ?? getNumber(block.addresses["X"]) ?? 0,
      });
    case 17:
      return createIRBlock("plane-xy", block.raw, base);
    case 18:
      return createIRBlock("plane-xz", block.raw, base);
    case 19:
      return createIRBlock("plane-yz", block.raw, base);
    case 20:
      return createIRBlock("units-imperial", block.raw, base);
    case 21:
      return createIRBlock("units-metric", block.raw, base);
    case 28:
      return createIRBlock("reference-return", block.raw, base);
    case 30:
      return createIRBlock("reference-return", block.raw, { ...base, referencePoint: 30 });
    case 40:
      return createIRBlock("cutter-comp-off", block.raw, base);
    case 41:
      return createIRBlock("cutter-comp-left", block.raw, base);
    case 42:
      return createIRBlock("cutter-comp-right", block.raw, base);
    case 43:
      return createIRBlock("tool-length-comp", block.raw, {
        ...base,
        target: extractPositionTarget(block),
        feedRate: block.feed,
        spindleSpeed: block.spindleSpeed,
        toolLengthOffset: getNumber(block.addresses["H"]),
        toolOffset: getNumber(block.addresses["H"]),
      });
    case 49:
      return createIRBlock("tool-length-comp-off", block.raw, base);
    case 53:
      return createIRBlock("reference-return", block.raw, { ...base, referencePoint: 53 });
    case 54:
      return createIRBlock("work-offset", block.raw, { ...base, workOffset: 0 });
    case 55:
      return createIRBlock("work-offset", block.raw, { ...base, workOffset: 1 });
    case 56:
      return createIRBlock("work-offset", block.raw, { ...base, workOffset: 2 });
    case 57:
      return createIRBlock("work-offset", block.raw, { ...base, workOffset: 3 });
    case 58:
      return createIRBlock("work-offset", block.raw, { ...base, workOffset: 4 });
    case 59:
      return createIRBlock("work-offset", block.raw, { ...base, workOffset: 5 });
    case 90:
      return createIRBlock("absolute-mode", block.raw, base);
    case 91:
      return createIRBlock("incremental-mode", block.raw, base);
    case 94:
      return createIRBlock("feed-mode", block.raw, { ...base, feedModeValue: "G94" });
    case 95:
      return createIRBlock("feed-mode", block.raw, { ...base, feedModeValue: "G95" });
    case 96:
      return createIRBlock("feed-mode", block.raw, {
        ...base,
        feedModeValue: "G96",
        spindleSpeed: block.spindleSpeed,
      });
    case 97:
      return createIRBlock("feed-mode", block.raw, {
        ...base,
        feedModeValue: "G97",
        spindleSpeed: block.spindleSpeed,
      });
    case 98:
      return createIRBlock("cycle-return-initial", block.raw, base);
    case 99:
      return createIRBlock("cycle-return-r-plane", block.raw, base);
    default:
      return null;
  }
}

function normalizeMCode(mNum: number, block: CNCBlock): NeutralIRBlock | null {
  const base = { raw: block.raw, comment: block.comment, transformations: [] as BlockTransformation[] };
  const spindleSpeed = block.spindleSpeed;

  switch (mNum) {
    case 0:
    case 2:
      return createIRBlock("program-end", block.raw, base);
    case 1:
      return createIRBlock("unknown", block.raw, base);
    case 3:
      return createIRBlock("spindle-forward", block.raw, { ...base, spindleSpeed });
    case 4:
      return createIRBlock("spindle-reverse", block.raw, { ...base, spindleSpeed });
    case 5:
      return createIRBlock("spindle-stop", block.raw, base);
    case 6:
      return createIRBlock("tool-change", block.raw, {
        ...base,
        toolNumber: block.toolNumber,
        toolOffset: getNumber(block.addresses["D"]) ?? block.toolNumber,
      });
    case 7:
      return createIRBlock("coolant-mist", block.raw, base);
    case 8:
      return createIRBlock("coolant-flood", block.raw, base);
    case 9:
      return createIRBlock("coolant-off", block.raw, base);
    case 17:
      return createIRBlock("subprogram-end", block.raw, base);
    case 19:
      return createIRBlock("spindle-orient", block.raw, base);
    case 30:
      return createIRBlock("program-end", block.raw, base);
    case 98:
      return createIRBlock("subprogram-call", block.raw, {
        ...base,
        subprogram: String(block.addresses["P"] || ""),
      });
    case 99:
      return createIRBlock("subprogram-end", block.raw, base);
    default:
      return null;
  }
}

function normalizeSiemensCycle(block: CNCBlock): NeutralIRBlock {
  const cycleName = (block.cycle || "").toUpperCase();
  const params = block.cycleParams || [];
  const target = extractTarget(block);
  const rtp = param(params, 0, 0);
  const rfp = param(params, 1, 0);
  const sdis = param(params, 2, 0);
  const dp = param(params, 3, 0);
  const dpr = param(params, 4, 0);
  const hasAbsoluteDepth = dp !== 0 || dpr === 0;
  const depth = hasAbsoluteDepth ? Math.abs(rfp - dp) : Math.abs(dpr);

  let cycleType: CycleDefinition["type"] = "drill";
  let irType: CycleIRType = "cycle-drill";
  let confidence: Confidence = "exact";
  let cycleExtra: Partial<CycleDefinition> = {};

  switch (cycleName) {
    case "CYCLE81":
      irType = "cycle-drill";
      break;
    case "CYCLE82":
      irType = "cycle-drill";
      cycleExtra.dwell = param(params, 5, 0);
      break;
    case "CYCLE83":
      irType = "cycle-peck-drill";
      cycleType = "peck-drill";
      confidence = "approximate";
      cycleExtra = {
        peckDepth: param(params, 6, param(params, 5, Math.max(depth / 2, 1))),
        chipBreak: param(params, 7, 0),
        dwell: param(params, 8, 0),
      };
      break;
    case "CYCLE84":
      irType = "cycle-tap";
      cycleType = "tap";
      confidence = "approximate";
      cycleExtra = {
        dwell: param(params, 5, 0),
        pitch: param(params, 8, param(params, 7, 1.5)),
        feedRate: block.feed,
      };
      break;
    case "CYCLE85":
      irType = "cycle-bore";
      cycleType = "bore";
      confidence = "approximate";
      cycleExtra = {
        dwell: param(params, 5, 0),
        feedRate: block.feed ?? param(params, 6, undefined),
        retractionFeedRate: param(params, 7, undefined),
      };
      break;
    case "CYCLE86":
    case "CYCLE88":
    case "CYCLE89":
      irType = "cycle-bore";
      cycleType = "bore";
      confidence = "approximate";
      cycleExtra = { dwell: param(params, 5, 0) };
      break;
    case "CYCLE87":
      irType = "cycle-other";
      cycleType = "other";
      confidence = "manual-review-needed";
      break;
    default:
      irType = "cycle-other";
      cycleType = "other";
      confidence = "manual-review-needed";
      break;
  }

  const cycleDef: CycleDefinition = {
    type: cycleType,
    retractPlane: rtp,
    returnPlane: rtp,
    referencePlane: rfp,
    safetyClearance: sdis,
    depth,
    absoluteDepth: hasAbsoluteDepth ? dp : undefined,
    relativeDepth: dpr || undefined,
    originalCycleId: cycleName,
    sourceCycleId: cycleName,
    originalParams: params.join(","),
    ...cycleExtra,
  };

  return createIRBlock(irType, block.raw, {
    comment: block.comment,
    target,
    cycle: cycleDef,
    feedRate: block.feed ?? cycleDef.feedRate,
    spindleSpeed: block.spindleSpeed,
    audit: [
      {
        ruleId: `${cycleName}_TO_IR`,
        description: `Siemens ${cycleName} normalized to IR cycle`,
        source: block.siemensCycleCall || block.raw,
        target: irType,
        confidence,
      },
    ],
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
      const isRapid = block.addresses["R0"] !== undefined;
      return createIRBlock(isRapid ? "rapid" : "linear", block.raw, {
        ...base,
        audit: [
          {
            ruleId: "HH_L_TO_MOTION",
            description: `Heidenhain L to ${isRapid ? "rapid" : "linear"}`,
            source: block.raw,
            target: isRapid ? "rapid" : "linear",
            confidence: "exact",
          },
        ],
      });
    }
    case "CC":
    case "CP":
    case "CR":
    case "CT":
      return createIRBlock(
        cmd === "CC" || cmd === "CR" ? "clockwise-arc" : "counterclockwise-arc",
        block.raw,
        {
          ...base,
          audit: [
            {
              ruleId: `HH_${cmd}_TO_ARC`,
              description: `Heidenhain ${cmd} to arc`,
              source: block.raw,
              target: "arc",
              confidence: "approximate",
            },
          ],
        },
      );

    case "TOOL CALL":
      return createIRBlock("tool-change", block.raw, {
        ...base,
        toolNumber: block.toolNumber || 1,
        audit: [
          {
            ruleId: "HH_TOOL_CALL",
            description: "Heidenhain TOOL CALL to tool-change",
            source: block.raw,
            target: "tool-change",
            confidence: "exact",
          },
        ],
      });

    case "TOOL DEF":
      return createIRBlock("tool-definition", block.raw, {
        ...base,
        toolNumber: block.toolNumber,
        audit: [
          {
            ruleId: "HH_TOOL_DEF",
            description: "Heidenhain TOOL DEF to tool-definition",
            source: block.raw,
            target: "tool-definition",
            confidence: "exact",
          },
        ],
      });

    case "CYCL DEF":
      return normalizeHeidenhainCycleDefinition(block, base);

    case "CYCL CALL":
      return createIRBlock("cycle-call", block.raw, {
        audit: [
          {
            ruleId: "HH_CYCL_CALL",
            description: "Heidenhain CYCL CALL to cycle-call",
            source: block.raw,
            target: "cycle-call",
            confidence: "exact",
          },
        ],
      });

    case "LBL":
      return createIRBlock("label", block.raw, { label: block.raw });

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
        audit: [
          {
            ruleId: `HH_${cmd}`,
            description: `Heidenhain ${cmd} preserved for manual review`,
            source: block.raw,
            target: block.raw,
            confidence: "approximate",
          },
        ],
      });

    default:
      if (cmd.startsWith("FN") || cmd === "Q") {
        return createIRBlock("macro-definition", block.raw, {
          ...base,
          audit: [
            {
              ruleId: "HH_MACRO",
              description: `Heidenhain ${cmd} to macro`,
              source: block.raw,
              target: "macro-definition",
              confidence: "exact",
            },
          ],
        });
      }
      return createIRBlock("unknown", block.raw, {
        ...base,
        audit: [
          {
            ruleId: "HH_UNKNOWN",
            description: `Unrecognized Heidenhain command: ${cmd}`,
            source: block.raw,
            target: "unknown",
            confidence: "manual-review-needed",
          },
        ],
      });
  }
}

function normalizeHeidenhainCycleDefinition(
  block: CNCBlock,
  base: Partial<NeutralIRBlock>,
): NeutralIRBlock {
  const cycleNum = parseInt(block.cycle || "0", 10);
  const semantics = getHeidenhainCycleSemantics(cycleNum);
  const q = block.qParams || {};
  const surface = qValue(q, 203, 0);
  const setup = qValue(q, 200, 2);
  const signedDepth = qValue(q, 201, -10);
  const depth = Math.abs(signedDepth);
  const feedRate = qValue(q, 206, undefined);
  const dwell = qValue(q, 211, undefined);
  const peckDepth = qValue(q, 202, undefined) ?? qValue(q, 257, undefined);
  const pitch = qValue(q, 239, undefined);
  const originalCycleId = `CYCL DEF ${cycleNum}`;

  const cycleDef: CycleDefinition = {
    type: semantics.cycleType,
    retractPlane: surface + setup,
    returnPlane: surface + (qValue(q, 204, setup) ?? setup),
    referencePlane: surface,
    safetyClearance: setup,
    depth,
    absoluteDepth: surface + signedDepth,
    relativeDepth: signedDepth,
    surfaceCoordinate: surface,
    secondSetupClearance: qValue(q, 204, undefined),
    dwell,
    peckDepth,
    pitch,
    feedRate,
    originalCycleId,
    sourceCycleId: originalCycleId,
    originalParams: formatQParams(q),
  };

  return createIRBlock(semantics.irType, block.raw, {
    ...base,
    cycle: cycleDef,
    feedRate: feedRate ?? base.feedRate,
    audit: [
      {
        ruleId: `HH_CYCL_DEF_${cycleNum}`,
        description: semantics.description,
        source: block.raw,
        target: semantics.irType,
        confidence: semantics.confidence,
      },
    ],
  });
}

function getHeidenhainCycleSemantics(cycleNum: number): HeidenhainCycleSemantics {
  switch (cycleNum) {
    case 200:
      return {
        irType: "cycle-drill",
        cycleType: "drill",
        confidence: "exact",
        description: "Heidenhain CYCL DEF 200 drilling normalized to IR cycle",
      };
    case 201:
      return {
        irType: "cycle-bore",
        cycleType: "ream",
        confidence: "approximate",
        description: "Heidenhain CYCL DEF 201 reaming normalized as boring/reaming cycle",
      };
    case 202:
      return {
        irType: "cycle-bore",
        cycleType: "bore",
        confidence: "approximate",
        description: "Heidenhain CYCL DEF 202 boring normalized as boring cycle",
      };
    case 203:
      return {
        irType: "cycle-peck-drill",
        cycleType: "peck-drill",
        confidence: "approximate",
        description: "Heidenhain CYCL DEF 203 universal drilling normalized as peck-drill cycle",
      };
    case 204:
      return {
        irType: "cycle-other",
        cycleType: "other",
        confidence: "manual-review-needed",
        description: "Heidenhain CYCL DEF 204 back boring requires manual review",
      };
    case 205:
      return {
        irType: "cycle-peck-drill",
        cycleType: "peck-drill",
        confidence: "approximate",
        description: "Heidenhain CYCL DEF 205 universal pecking normalized as peck-drill cycle",
      };
    case 206:
      return {
        irType: "cycle-tap",
        cycleType: "tap",
        confidence: "approximate",
        description: "Heidenhain CYCL DEF 206 tapping normalized as tap cycle",
      };
    case 207:
      return {
        irType: "cycle-tap",
        cycleType: "tap",
        confidence: "approximate",
        description: "Heidenhain CYCL DEF 207 rigid tapping normalized as tap cycle",
      };
    default:
      return {
        irType: "cycle-other",
        cycleType: "other",
        confidence: "manual-review-needed",
        description: `Heidenhain CYCL DEF ${cycleNum} is not modeled`,
      };
  }
}

function extractCycleFromBlock(
  block: CNCBlock,
  type: CycleDefinition["type"],
  originalCycleId: string,
  extra?: Partial<CycleDefinition>,
): CycleDefinition {
  const rawZ = block.axes["Z"];
  const z = Math.abs(rawZ ?? 10);
  const r = getNumber(block.addresses["R"]) ?? 2;
  const q = getNumber(block.addresses["Q"]);
  const p = getNumber(block.addresses["P"]);

  return {
    type,
    retractPlane: r,
    returnPlane: r,
    referencePlane: 0,
    safetyClearance: r,
    depth: z,
    absoluteDepth: rawZ,
    peckDepth: type === "peck-drill" ? q ?? 3 : q,
    dwell: p,
    originalCycleId,
    sourceCycleId: originalCycleId,
    feedRate: block.feed,
    ...extra,
  };
}

function getNumber(value: string | number | undefined): number | undefined {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function param(
  params: number[],
  index: number,
  fallback: number,
): number;
function param(
  params: number[],
  index: number,
  fallback: number | undefined,
): number | undefined;
function param(
  params: number[],
  index: number,
  fallback: number | undefined,
): number | undefined {
  const value = params[index];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function qValue(
  params: Record<string, number>,
  num: number,
  fallback: number,
): number;
function qValue(
  params: Record<string, number>,
  num: number,
  fallback: number | undefined,
): number | undefined;
function qValue(
  params: Record<string, number>,
  num: number,
  fallback: number | undefined,
): number | undefined {
  const value = params[`Q${num}`];
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function formatQParams(params: Record<string, number>): string {
  return Object.entries(params)
    .sort(([a], [b]) => parseInt(a.slice(1), 10) - parseInt(b.slice(1), 10))
    .map(([key, value]) => `${key}=${value}`)
    .join(",");
}

function isHeidenhainCycleParamBlock(block: CNCBlock): boolean {
  return block.heidenhainCommand === "Q" && Object.keys(block.qParams || {}).length > 0;
}

/**
 * Normalize an entire parsed program into NeutralIRBlock[].
 */
export function normalizeProgram(
  blocks: CNCBlock[],
  sourceFormat: ControllerFormat,
): NeutralIRBlock[] {
  const family = getControllerFamily(sourceFormat);
  const normalized: NeutralIRBlock[] = [];

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i];

    if (family === "heidenhain" && block.heidenhainCommand === "CYCL DEF") {
      const merged: CNCBlock = {
        ...block,
        qParams: { ...block.qParams },
      };
      const rawLines = [block.raw];
      let j = i + 1;

      while (j < blocks.length && isHeidenhainCycleParamBlock(blocks[j])) {
        Object.assign(merged.qParams, blocks[j].qParams);
        rawLines.push(blocks[j].raw);
        j++;
      }

      merged.raw = rawLines.join("\n");
      normalized.push(...normalizeBlocksFromBlock(merged, sourceFormat));
      i = j - 1;
      continue;
    }

    normalized.push(...normalizeBlocksFromBlock(block, sourceFormat));
  }

  return normalized;
}
