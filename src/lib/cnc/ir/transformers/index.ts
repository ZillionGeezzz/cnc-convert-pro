/**
 * IR Transformers — Per-Format Transformation Pipeline.
 *
 * Each transformer takes an array of NeutralIRBlock and applies
 * target-format-specific transformations. This architecture separates
 * the "what to transform" (generators) from "how to transform" (transformers).
 *
 * Usage:
 *   import { applyTransformations } from "./ir/transformers";
 *   const transformed = applyTransformations(irBlocks, sourceFormat, targetFormat);
 */

import type { NeutralIRBlock } from "../types";
import type { ControllerFormat } from "../../types";
import { getControllerFamily } from "../family";

export type TransformerContext = {
  sourceFormat: ControllerFormat;
  targetFormat: ControllerFormat;
  sourceFamily: string;
  targetFamily: string;
};

export type Transformer = (
  blocks: NeutralIRBlock[],
  ctx: TransformerContext,
) => NeutralIRBlock[];

// ==========================================
// TRANSFORMER REGISTRY
// ==========================================

const transformers: Transformer[] = [
  transformFanucToSiemensCycles,
  transformSiemensToFanucCycles,
  transformHeidenhainToFanucCycles,
  transformHeidenhainToSiemensCycles,
  transformFanucToHeidenhainCycles,
  transformSiemensToolNameToComment,
];

/**
 * Apply all applicable transformations for the given source/target formats.
 */
export function applyTransformations(
  blocks: NeutralIRBlock[],
  sourceFormat: ControllerFormat,
  targetFormat: ControllerFormat,
): NeutralIRBlock[] {
  if (sourceFormat === targetFormat) return blocks;

  const ctx: TransformerContext = {
    sourceFormat,
    targetFormat,
    sourceFamily: getControllerFamily(sourceFormat),
    targetFamily: getControllerFamily(targetFormat),
  };

  let result = blocks;
  for (const transformer of transformers) {
    result = transformer(result, ctx);
  }

  return result;
}

// ==========================================
// INDIVIDUAL TRANSFORMERS
// ==========================================

/**
 * Fanuc G81-G89 → Siemens CYCLE81-CYCLE89.
 */
function transformFanucToSiemensCycles(
  blocks: NeutralIRBlock[],
  ctx: TransformerContext,
): NeutralIRBlock[] {
  if (ctx.sourceFamily !== "fanuc" || ctx.targetFamily !== "siemens") return blocks;

  const cycleMap: Record<string, string> = {
    G81: "CYCLE81",
    G82: "CYCLE82",
    G83: "CYCLE83",
    G84: "CYCLE84",
    G85: "CYCLE85",
    G86: "CYCLE86",
    G87: "CYCLE87",
    G88: "CYCLE88",
    G89: "CYCLE89",
  };

  return blocks.map((block) => {
    if (!block.cycle) return block;
    const origId = block.cycle.originalCycleId?.toUpperCase() ?? "";
    const targetId = cycleMap[origId];
    if (!targetId) return block;

    return {
      ...block,
      cycle: {
        ...block.cycle,
        originalCycleId: targetId,
      },
      transformations: [
        ...block.transformations,
        {
          ruleId: `CYCLE_${origId}_TO_${targetId}`,
          description: `Fanuc ${origId} → Siemens ${targetId}`,
          source: origId,
          target: targetId,
        },
      ],
      audit: [
        ...block.audit,
        {
          ruleId: `CYCLE_${origId}_TO_${targetId}`,
          description: `Cycle mapping: ${origId} → ${targetId}`,
          source: origId,
          target: targetId,
          confidence: "exact",
        },
      ],
    };
  });
}

/**
 * Siemens CYCLE81-CYCLE89 → Fanuc G81-G89.
 */
function transformSiemensToFanucCycles(
  blocks: NeutralIRBlock[],
  ctx: TransformerContext,
): NeutralIRBlock[] {
  if (ctx.sourceFamily !== "siemens" || ctx.targetFamily !== "fanuc") return blocks;

  const cycleMap: Record<string, string> = {
    CYCLE81: "G81",
    CYCLE82: "G82",
    CYCLE83: "G83",
    CYCLE84: "G84",
    CYCLE85: "G85",
    CYCLE86: "G86",
    CYCLE87: "G87",
    CYCLE88: "G88",
    CYCLE89: "G89",
  };

  return blocks.map((block) => {
    if (!block.cycle) return block;
    const origId = block.cycle.originalCycleId?.toUpperCase() ?? "";
    const targetId = cycleMap[origId];
    if (!targetId) return block;

    return {
      ...block,
      cycle: {
        ...block.cycle,
        originalCycleId: targetId,
        // Rename original ID for audit
      },
      transformations: [
        ...block.transformations,
        {
          ruleId: `CYCLE_${origId}_TO_${targetId}`,
          description: `Siemens ${origId} → Fanuc ${targetId}`,
          source: origId,
          target: targetId,
        },
      ],
      audit: [
        ...block.audit,
        {
          ruleId: `CYCLE_${origId}_TO_${targetId}`,
          description: `Cycle mapping: ${origId} → ${targetId}`,
          source: origId,
          target: targetId,
          confidence: "exact",
        },
      ],
    };
  });
}

/**
 * Heidenhain CYCL DEF → Fanuc G81-G89.
 */
function transformHeidenhainToFanucCycles(
  blocks: NeutralIRBlock[],
  ctx: TransformerContext,
): NeutralIRBlock[] {
  if (ctx.sourceFamily !== "heidenhain" || ctx.targetFamily !== "fanuc") return blocks;

  const cycleMap: Record<string, string> = {
    "200": "G81",
    "201": "G82",
    "202": "G83",
    "203": "G84",
    "204": "G85",
    "205": "G86",
    "206": "G87",
    "207": "G88",
    "208": "G89",
  };

  return blocks.map((block) => {
    if (!block.cycle) return block;
    const origId = block.cycle.originalCycleId ?? "";
    const numMatch = origId.match(/\d+/);
    const num = numMatch ? numMatch[0] : "";
    const targetId = cycleMap[num];
    if (!targetId) return block;

    return {
      ...block,
      cycle: {
        ...block.cycle,
        originalCycleId: targetId,
      },
      transformations: [
        ...block.transformations,
        {
          ruleId: `HH_CYCL_DEF_${num}_TO_${targetId}`,
          description: `Heidenhain CYCL DEF ${num} → Fanuc ${targetId}`,
          source: origId,
          target: targetId,
        },
      ],
      audit: [
        ...block.audit,
        {
          ruleId: `HH_CYCL_DEF_${num}_TO_${targetId}`,
          description: `Cycle mapping: CYCL DEF ${num} → ${targetId}`,
          source: origId,
          target: targetId,
          confidence: "exact",
        },
      ],
    };
  });
}

/**
 * Heidenhain CYCL DEF → Siemens CYCLE81-89.
 */
function transformHeidenhainToSiemensCycles(
  blocks: NeutralIRBlock[],
  ctx: TransformerContext,
): NeutralIRBlock[] {
  if (ctx.sourceFamily !== "heidenhain" || ctx.targetFamily !== "siemens") return blocks;

  const cycleMap: Record<string, string> = {
    "200": "CYCLE81",
    "201": "CYCLE82",
    "202": "CYCLE83",
    "203": "CYCLE84",
    "204": "CYCLE85",
  };

  return blocks.map((block) => {
    if (!block.cycle) return block;
    const origId = block.cycle.originalCycleId ?? "";
    const numMatch = origId.match(/\d+/);
    const num = numMatch ? numMatch[0] : "";
    const targetId = cycleMap[num];
    if (!targetId) return block;

    return {
      ...block,
      cycle: {
        ...block.cycle,
        originalCycleId: targetId,
      },
      transformations: [
        ...block.transformations,
        {
          ruleId: `HH_CYCL_DEF_${num}_TO_${targetId}`,
          description: `Heidenhain CYCL DEF ${num} → Siemens ${targetId}`,
          source: origId,
          target: targetId,
        },
      ],
      audit: [
        ...block.audit,
        {
          ruleId: `HH_CYCL_DEF_${num}_TO_${targetId}`,
          description: `Cycle mapping: CYCL DEF ${num} → ${targetId}`,
          source: origId,
          target: targetId,
          confidence: "exact",
        },
      ],
    };
  });
}

/**
 * Fanuc G81-G89 → Heidenhain CYCL DEF 200-208.
 */
function transformFanucToHeidenhainCycles(
  blocks: NeutralIRBlock[],
  ctx: TransformerContext,
): NeutralIRBlock[] {
  if (ctx.sourceFamily !== "fanuc" || ctx.targetFamily !== "heidenhain") return blocks;

  const cycleMap: Record<string, string> = {
    G81: "CYCL DEF 200",
    G82: "CYCL DEF 201",
    G83: "CYCL DEF 202",
    G84: "CYCL DEF 203",
    G85: "CYCL DEF 204",
  };

  return blocks.map((block) => {
    if (!block.cycle) return block;
    const origId = block.cycle.originalCycleId?.toUpperCase() ?? "";
    const targetId = cycleMap[origId];
    if (!targetId) return block;

    return {
      ...block,
      cycle: {
        ...block.cycle,
        originalCycleId: targetId,
        type: block.cycle.type,
        retractPlane: block.cycle.retractPlane,
        depth: block.cycle.depth,
      },
      transformations: [
        ...block.transformations,
        {
          ruleId: `CYCLE_${origId}_TO_HH`,
          description: `Fanuc ${origId} → Heidenhain ${targetId}`,
          source: origId,
          target: targetId,
        },
      ],
      audit: [
        ...block.audit,
        {
          ruleId: `CYCLE_${origId}_TO_HH`,
          description: `Cycle mapping: ${origId} → ${targetId}`,
          source: origId,
          target: targetId,
          confidence: "exact",
        },
      ],
    };
  });
}

/**
 * Siemens T="name" → comment for non-Siemens targets.
 */
function transformSiemensToolNameToComment(
  blocks: NeutralIRBlock[],
  ctx: TransformerContext,
): NeutralIRBlock[] {
  if (ctx.sourceFamily !== "siemens" || ctx.targetFamily === "siemens") return blocks;

  return blocks.map((block) => {
    if (!block.toolName) return block;

    const nameComment = `Tool: ${block.toolName}`;
    const newComment = block.comment
      ? `${nameComment}; ${block.comment}`
      : nameComment;

    return {
      ...block,
      comment: newComment,
      transformations: [
        ...block.transformations,
        {
          ruleId: "SIEMENS_TOOL_NAME",
          description: `Converted Siemens tool name to comment: ${block.toolName}`,
          source: `T="${block.toolName}"`,
          target: `;${nameComment}`,
        },
      ],
    };
  });
}
