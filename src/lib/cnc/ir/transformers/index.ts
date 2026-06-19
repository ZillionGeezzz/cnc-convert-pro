/**
 * IR Transformers - Per-Format Transformation Pipeline.
 *
 * Transformers operate on already-normalized semantic IR. They should change
 * target-specific identity and audit confidence, not re-parse raw source text.
 */

import type { NeutralIRBlock, AuditEntry } from "../types";
import type { ControllerFormat } from "../../types";
import { getControllerFamily } from "../family";
import { getToolById } from "../../tool-library";

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

type Confidence = AuditEntry["confidence"];

interface CycleMapping {
  source: string;
  target: string;
  confidence: Confidence;
  description: string;
}

const transformers: Transformer[] = [
  transformFanucToSiemensCycles,
  transformSiemensToFanucCycles,
  transformHeidenhainToFanucCycles,
  transformHeidenhainToSiemensCycles,
  transformFanucToHeidenhainCycles,
  transformSiemensToolNameToComment,
  applyBSPTTaper,
];

// NOTE: Custom dynamic transformers like createGeometryTransformer are not part
// of the static array above. They should be passed or applied separately
// if the UI layer wants to use them.

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

  return transformers.reduce((result, transformer) => transformer(result, ctx), blocks);
}

const FANUC_TO_SIEMENS: CycleMapping[] = [
  { source: "G81", target: "CYCLE81", confidence: "exact", description: "Simple drilling" },
  { source: "G82", target: "CYCLE82", confidence: "exact", description: "Drilling with dwell" },
  { source: "G83", target: "CYCLE83", confidence: "approximate", description: "Peck drilling parameters are simplified" },
  { source: "G84", target: "CYCLE84", confidence: "approximate", description: "Tapping parameters are simplified" },
  { source: "G85", target: "CYCLE85", confidence: "approximate", description: "Boring feed-out parameters are simplified" },
  { source: "G86", target: "CYCLE86", confidence: "approximate", description: "Boring stop/retract behavior requires review" },
  { source: "G87", target: "CYCLE87", confidence: "manual-review-needed", description: "Back boring behavior requires review" },
  { source: "G88", target: "CYCLE88", confidence: "manual-review-needed", description: "Manual-retract boring behavior requires review" },
  { source: "G89", target: "CYCLE89", confidence: "approximate", description: "Boring dwell/feed-out parameters are simplified" },
];

const SIEMENS_TO_FANUC: CycleMapping[] = [
  { source: "CYCLE81", target: "G81", confidence: "exact", description: "Simple drilling" },
  { source: "CYCLE82", target: "G82", confidence: "exact", description: "Drilling with dwell" },
  { source: "CYCLE83", target: "G83", confidence: "approximate", description: "Deep-hole cycle has parameters not modeled in Fanuc G83" },
  { source: "CYCLE84", target: "G84", confidence: "approximate", description: "Tapping cycle has Siemens parameters not modeled in Fanuc G84" },
  { source: "CYCLE85", target: "G85", confidence: "approximate", description: "Boring feed/retraction fields are simplified" },
  { source: "CYCLE86", target: "G86", confidence: "approximate", description: "Boring stop/retract behavior requires review" },
  { source: "CYCLE87", target: "G87", confidence: "manual-review-needed", description: "Back boring behavior requires review" },
  { source: "CYCLE88", target: "G88", confidence: "manual-review-needed", description: "Manual-retract boring behavior requires review" },
  { source: "CYCLE89", target: "G89", confidence: "approximate", description: "Boring dwell/feed-out parameters are simplified" },
];

const HEIDENHAIN_TO_FANUC: CycleMapping[] = [
  { source: "CYCL DEF 200", target: "G81", confidence: "exact", description: "Simple drilling" },
  { source: "CYCL DEF 201", target: "G85", confidence: "approximate", description: "Reaming mapped to boring/reaming cycle" },
  { source: "CYCL DEF 202", target: "G85", confidence: "approximate", description: "Boring mapped to basic boring cycle" },
  { source: "CYCL DEF 203", target: "G83", confidence: "approximate", description: "Universal drilling mapped to peck drilling" },
  { source: "CYCL DEF 204", target: "G87", confidence: "manual-review-needed", description: "Back boring requires manual review" },
  { source: "CYCL DEF 205", target: "G83", confidence: "approximate", description: "Universal pecking mapped to peck drilling" },
  { source: "CYCL DEF 206", target: "G84", confidence: "approximate", description: "Tapping mapped to Fanuc tapping" },
  { source: "CYCL DEF 207", target: "G84", confidence: "approximate", description: "Rigid tapping mapped to Fanuc tapping" },
];

const HEIDENHAIN_TO_SIEMENS: CycleMapping[] = [
  { source: "CYCL DEF 200", target: "CYCLE81", confidence: "exact", description: "Simple drilling" },
  { source: "CYCL DEF 201", target: "CYCLE85", confidence: "approximate", description: "Reaming mapped to boring/reaming cycle" },
  { source: "CYCL DEF 202", target: "CYCLE85", confidence: "approximate", description: "Boring mapped to boring cycle" },
  { source: "CYCL DEF 203", target: "CYCLE83", confidence: "approximate", description: "Universal drilling mapped to deep-hole cycle" },
  { source: "CYCL DEF 204", target: "CYCLE87", confidence: "manual-review-needed", description: "Back boring requires manual review" },
  { source: "CYCL DEF 205", target: "CYCLE83", confidence: "approximate", description: "Universal pecking mapped to deep-hole cycle" },
  { source: "CYCL DEF 206", target: "CYCLE84", confidence: "approximate", description: "Tapping mapped to Siemens tapping" },
  { source: "CYCL DEF 207", target: "CYCLE84", confidence: "approximate", description: "Rigid tapping mapped to Siemens tapping" },
];

const FANUC_TO_HEIDENHAIN: CycleMapping[] = [
  { source: "G81", target: "CYCL DEF 200", confidence: "exact", description: "Simple drilling" },
  { source: "G82", target: "CYCL DEF 200", confidence: "exact", description: "Drilling with dwell via Q211" },
  { source: "G83", target: "CYCL DEF 203", confidence: "approximate", description: "Peck drilling mapped to universal drilling" },
  { source: "G84", target: "CYCL DEF 206", confidence: "approximate", description: "Tapping mapped to Heidenhain tapping" },
  { source: "G85", target: "CYCL DEF 202", confidence: "approximate", description: "Boring mapped to Heidenhain boring" },
  { source: "G86", target: "CYCL DEF 202", confidence: "approximate", description: "Bore-and-stop behavior simplified" },
  { source: "G87", target: "CYCL DEF 204", confidence: "manual-review-needed", description: "Back boring requires manual review" },
  { source: "G88", target: "CYCL DEF 204", confidence: "manual-review-needed", description: "Manual-retract boring requires manual review" },
  { source: "G89", target: "CYCL DEF 202", confidence: "approximate", description: "Boring dwell/feed-out behavior simplified" },
];

function transformFanucToSiemensCycles(
  blocks: NeutralIRBlock[],
  ctx: TransformerContext,
): NeutralIRBlock[] {
  if (ctx.sourceFamily !== "fanuc" || ctx.targetFamily !== "siemens") return blocks;
  return mapCycles(blocks, FANUC_TO_SIEMENS, "Fanuc", "Siemens");
}

function transformSiemensToFanucCycles(
  blocks: NeutralIRBlock[],
  ctx: TransformerContext,
): NeutralIRBlock[] {
  if (ctx.sourceFamily !== "siemens" || ctx.targetFamily !== "fanuc") return blocks;
  return mapCycles(blocks, SIEMENS_TO_FANUC, "Siemens", "Fanuc");
}

function transformHeidenhainToFanucCycles(
  blocks: NeutralIRBlock[],
  ctx: TransformerContext,
): NeutralIRBlock[] {
  if (ctx.sourceFamily !== "heidenhain" || ctx.targetFamily !== "fanuc") return blocks;
  return mapCycles(blocks, HEIDENHAIN_TO_FANUC, "Heidenhain", "Fanuc");
}

function transformHeidenhainToSiemensCycles(
  blocks: NeutralIRBlock[],
  ctx: TransformerContext,
): NeutralIRBlock[] {
  if (ctx.sourceFamily !== "heidenhain" || ctx.targetFamily !== "siemens") return blocks;
  return mapCycles(blocks, HEIDENHAIN_TO_SIEMENS, "Heidenhain", "Siemens");
}

function transformFanucToHeidenhainCycles(
  blocks: NeutralIRBlock[],
  ctx: TransformerContext,
): NeutralIRBlock[] {
  if (ctx.sourceFamily !== "fanuc" || ctx.targetFamily !== "heidenhain") return blocks;
  return mapCycles(blocks, FANUC_TO_HEIDENHAIN, "Fanuc", "Heidenhain");
}

function mapCycles(
  blocks: NeutralIRBlock[],
  mappings: CycleMapping[],
  sourceLabel: string,
  targetLabel: string,
): NeutralIRBlock[] {
  return blocks.map((block) => {
    if (!block.cycle?.originalCycleId) return block;

    const mapping = findCycleMapping(block.cycle.originalCycleId, mappings);
    if (!mapping) return block;

    const ruleId = `CYCLE_${sanitize(mapping.source)}_TO_${sanitize(mapping.target)}`;
    return {
      ...block,
      cycle: {
        ...block.cycle,
        sourceCycleId: block.cycle.sourceCycleId ?? block.cycle.originalCycleId,
        originalCycleId: mapping.target,
      },
      transformations: [
        ...block.transformations,
        {
          ruleId,
          description: `${sourceLabel} ${mapping.source} to ${targetLabel} ${mapping.target}`,
          source: mapping.source,
          target: mapping.target,
        },
      ],
      audit: [
        ...block.audit,
        {
          ruleId,
          description: `Cycle mapping: ${mapping.source} to ${mapping.target} (${mapping.description})`,
          source: mapping.source,
          target: mapping.target,
          confidence: mapping.confidence,
        },
      ],
    };
  });
}

function applyBSPTTaper(
  blocks: NeutralIRBlock[],
  ctx: TransformerContext,
): NeutralIRBlock[] {
  // If we find a BSPT tool being used in a tapping cycle, we should ensure the taper is noted
  let currentToolIsBSPT = false;
  let currentToolName = "";

  return blocks.map((block) => {
    if (block.type === "tool-change" || block.type === "tool-definition") {
      currentToolName = block.toolName || "";
      currentToolIsBSPT = /BSPT/i.test(block.raw) || /BSPT/i.test(currentToolName);
    }

    if (currentToolIsBSPT && block.cycle && block.type === "cycle-tap") {
      const isFanucTarget = ctx.targetFamily === "fanuc" || ctx.targetFamily === "haas" || ctx.targetFamily === "mitsubishi";

      const newBlock = {
        ...block,
        cycle: {
          ...block.cycle,
          taperRatio: 0.0625, // 1:16
        },
        audit: [
          ...block.audit,
          {
            ruleId: "BSPT_TAPER_APPLIED",
            description: "Applied 1:16 taper ratio for BSPT tool",
            source: block.raw,
            target: "cycle with taperRatio 0.0625",
            confidence: "approximate" as const,
          },
        ],
      };

      // If target is Fanuc G84, it doesn't natively support taper in most versions
      // so we should add a warning.
      if (isFanucTarget && block.cycle.originalCycleId === "G84") {
        newBlock.audit.push({
          ruleId: "G84_TAPER_WARNING",
          description: "Fanuc G84 does not natively support tapered threads. Machine might require a specialized cycle or helical interpolation.",
          source: "G84",
          target: "G84",
          confidence: "manual-review-needed" as const,
        });
      }

      return newBlock;
    }

    return block;
  });
}

function findCycleMapping(
  sourceCycle: string,
  mappings: CycleMapping[],
): CycleMapping | undefined {
  const normalizedSource = normalizeCycleId(sourceCycle);
  return mappings.find((mapping) => normalizeCycleId(mapping.source) === normalizedSource);
}

function normalizeCycleId(cycle: string): string {
  const upper = cycle.toUpperCase().trim();
  const hh = upper.match(/CYCL\s+DEF\s+(\d+)/);
  if (hh) return `CYCL DEF ${hh[1]}`;
  const siemens = upper.match(/CYCLE(\d+)/);
  if (siemens) return `CYCLE${siemens[1]}`;
  const fanuc = upper.match(/G0?(\d+)/);
  if (fanuc) return `G${fanuc[1]}`;
  return upper;
}

function sanitize(value: string): string {
  return value.replace(/[^A-Z0-9]+/gi, "_").replace(/^_+|_+$/g, "");
}

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
