/**
 * G91 → G90 Coordinate Resolution.
 *
 * Resolves incremental (G91) moves into absolute positions so that
 * target-format generators can always emit absolute coordinates regardless
 * of the source format's distance mode.
 *
 * Usage:
 *   import { resolveCoordinates } from "./ir/resolver";
 *   const resolved = resolveCoordinates(irBlocks, machineContext);
 *
 * The resolver walks through blocks, tracks the current distance mode,
 * and converts incremental axis targets to absolute positions.
 * It also attaches a transformation audit entry for each resolved move.
 */

import type { NeutralIRBlock, AxisTarget } from "./types";

export interface ResolutionResult {
  blocks: NeutralIRBlock[];
  resolvedCount: number;
}

/**
 * Resolve incremental moves into absolute coordinates.
 *
 * @param blocks - IR blocks (pre-processed by the state machine)
 * @param initialPosition - optional starting position (defaults to {})
 * @returns blocks with G91 targets converted to absolute + audit trail
 */
export function resolveCoordinates(
  blocks: NeutralIRBlock[],
  initialPosition: Record<string, number> = {},
): ResolutionResult {
  let resolvedCount = 0;
  const currentPosition: Record<string, number> = { ...initialPosition };
  let isIncremental = false;

  const resolved = blocks.map((block) => {
    // Track distance mode changes
    if (block.type === "incremental-mode") {
      isIncremental = true;
      return {
        ...block,
        transformations: [
          ...block.transformations,
          {
            ruleId: "G91_MODE",
            description: "Incremental mode — subsequent moves will be resolved to absolute",
            source: block.raw,
            target: block.raw,
          },
        ],
      };
    }

    if (block.type === "absolute-mode") {
      isIncremental = false;
      return block;
    }

    // Only resolve motion blocks with targets when in incremental mode
    if (
      isIncremental &&
      block.target &&
      isMotionBlock(block.type)
    ) {
      const originalTarget = { ...block.target };
      const resolvedTarget: AxisTarget = {};

      for (const [axis, value] of Object.entries(block.target)) {
        const key = axis.toLowerCase() as keyof AxisTarget;
        if (typeof value !== "number") {
          (resolvedTarget as Record<string, any>)[key] = value;
          continue;
        }

        const currentVal = currentPosition[key.toUpperCase()] ?? 0;
        const absoluteValue = currentVal + value;
        (resolvedTarget as Record<string, any>)[key] = absoluteValue;
      }

      // Update position tracker
      for (const [axis, value] of Object.entries(resolvedTarget)) {
        if (typeof value === "number") {
          currentPosition[axis.toUpperCase()] = value;
        }
      }

      resolvedCount++;

      const auditEntry: import("./types").AuditEntry = {
        ruleId: "G91_TO_G90",
        description: `Incremental → absolute coordinate resolution`,
        source: formatDelta(originalTarget),
        target: formatTarget(resolvedTarget),
        confidence: "exact" as const,
      };

      return {
        ...block,
        target: resolvedTarget,
        transformations: [
          ...block.transformations,
          {
            ruleId: "G91_TO_G90",
            description: `Resolved G91 incremental move to absolute: ${formatDelta(originalTarget)} → ${formatTarget(resolvedTarget)}`,
            source: block.raw,
            target: `(resolved) ${block.raw}`,
          },
        ],
        audit: [
          ...block.audit,
          auditEntry,
        ],
      };
    }

    // Update position for absolute moves as well
    if (block.target && !isIncremental && isMotionBlock(block.type)) {
      for (const [axis, value] of Object.entries(block.target)) {
        if (typeof value === "number") {
          currentPosition[axis.toUpperCase()] = value;
        }
      }
    }

    // Handle reference return / program start (reset position)
    if (block.type === "reference-return" || block.type === "program-start") {
      for (const key of Object.keys(currentPosition)) {
        delete currentPosition[key];
      }
    }

    return block;
  });

  return { blocks: resolved, resolvedCount };
}

function isMotionBlock(type: string): boolean {
  return [
    "rapid",
    "linear",
    "clockwise-arc",
    "counterclockwise-arc",
    "helical",
  ].includes(type);
}

function formatTarget(target: AxisTarget): string {
  return Object.entries(target)
    .filter(([_, v]) => typeof v === "number")
    .map(([k, v]) => `${k.toUpperCase()}${(v as number).toFixed(3)}`)
    .join(" ");
}

function formatDelta(target: AxisTarget): string {
  return Object.entries(target)
    .filter(([_, v]) => typeof v === "number")
    .map(([k, v]) => `${k.toUpperCase()}${(v as number) >= 0 ? "+" : ""}${(v as number).toFixed(3)}`)
    .join(" ");
}
