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

type CycleReturnMode = "initial" | "r-plane";

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
  const currentPosition = normalizePosition(initialPosition);
  let isIncremental = false;
  let cycleReturnMode: CycleReturnMode = "initial";

  const resolved = blocks.map((block) => {
    // Track distance mode changes
    if (block.type === "incremental-mode") {
      isIncremental = true;
      return {
        ...block,
        type: "absolute-mode" as const,
        transformations: [
          ...block.transformations,
          {
            ruleId: "G91_MODE_TO_G90_OUTPUT",
            description: "Incremental mode resolved to absolute output mode for subsequent moves",
            source: block.raw,
            target: "G90",
          },
        ],
        audit: [
          ...block.audit,
          {
            ruleId: "G91_MODE_TO_G90_OUTPUT",
            description: "G91 incremental source mode converted to G90 output mode after coordinate resolution",
            source: block.raw,
            target: "G90",
            confidence: "exact" as const,
          },
        ],
      };
    }

    if (block.type === "absolute-mode") {
      isIncremental = false;
      return block;
    }

    if (block.type === "cycle-return-initial") {
      cycleReturnMode = "initial";
      return block;
    }

    if (block.type === "cycle-return-r-plane") {
      cycleReturnMode = "r-plane";
      return block;
    }

    // Check if block has explicit incremental axes (IX, IY, etc.)
    const hasExplicitIncremental = block.target && Object.keys(block.target).some(k => k.startsWith("i") && isPositionAxis(k.slice(1)));

    // Resolve any output-bearing position block when in incremental mode OR has explicit incremental axes.
    if (
      (isIncremental || hasExplicitIncremental) &&
      isPositionBearingBlock(block.type) &&
      (block.target || block.cycle)
    ) {
      const originalTarget = block.target ? { ...block.target } : {};
      const resolvedTarget = block.target
        ? resolveTarget(block.target, currentPosition, isIncremental)
        : undefined;
      const auditTarget = resolvedTarget ?? {};
      const resolvedCycle = block.cycle
        ? resolveIncrementalCycle(block, currentPosition, cycleReturnMode)
        : undefined;

      // Update position tracker
      updateCurrentPosition(currentPosition, resolvedTarget, resolvedCycle);

      resolvedCount++;

      const auditEntry: import("./types").AuditEntry = {
        ruleId: "G91_TO_G90",
        description: `Incremental → absolute coordinate resolution`,
        source: formatDelta(originalTarget),
        target: formatTarget(auditTarget),
        confidence: "exact" as const,
      };

      return {
        ...block,
        target: resolvedTarget ?? block.target,
        cycle: resolvedCycle ?? block.cycle,
        transformations: [
          ...block.transformations,
          {
            ruleId: "G91_TO_G90",
            description: `Resolved G91 incremental move to absolute: ${formatDelta(originalTarget)} → ${formatTarget(auditTarget)}`,
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

    // Update position for absolute output-bearing blocks as well.
    if (!isIncremental && isPositionBearingBlock(block.type) && (block.target || block.cycle)) {
      const cycleWithReturnPlane = block.cycle
        ? applyCycleReturnPlane(block.cycle, currentPosition, cycleReturnMode)
        : undefined;
      updateCurrentPosition(currentPosition, block.target, cycleWithReturnPlane);
      if (cycleWithReturnPlane && cycleWithReturnPlane !== block.cycle) {
        return {
          ...block,
          cycle: cycleWithReturnPlane,
        };
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

function isPositionAxis(axis: string): boolean {
  return ["x", "y", "z", "a", "b", "c", "u", "v", "w"].includes(axis.toLowerCase());
}

function isPositionBearingBlock(type: string): boolean {
  return [
    "rapid",
    "linear",
    "clockwise-arc",
    "counterclockwise-arc",
    "helical",
    "tool-length-comp",
    "cycle-drill",
    "cycle-peck-drill",
    "cycle-tap",
    "cycle-bore",
    "cycle-other",
  ].includes(type);
}

function normalizePosition(position: Record<string, number>): Record<string, number> {
  return Object.fromEntries(
    Object.entries(position).map(([axis, value]) => [axis.toUpperCase(), value]),
  );
}

function resolveTarget(target: AxisTarget, currentPosition: Record<string, number>, isModalIncremental: boolean): AxisTarget {
  const resolvedTarget: AxisTarget = {};

  // First, resolve explicit incremental fields (IX, IY, etc.) regardless of modal G90/G91
  for (const [axis, value] of Object.entries(target)) {
    const key = axis.toLowerCase() as keyof AxisTarget;
    if (typeof value !== "number") continue;

    if (key.startsWith("i") && isPositionAxis(key.slice(1))) {
      const baseAxis = key.slice(1).toUpperCase();
      const currentVal = currentPosition[baseAxis] ?? 0;
      const targetKey = baseAxis.toLowerCase() as keyof AxisTarget;
      resolvedTarget[targetKey] = currentVal + value;
      continue;
    }

    // Standard axes: incremental only when modal G91 is active
    if (isPositionAxis(key)) {
      if (isModalIncremental) {
        const currentVal = currentPosition[key.toUpperCase()] ?? 0;
        resolvedTarget[key] = currentVal + value;
      } else {
        // Absolute mode — use the value directly
        resolvedTarget[key] = value;
      }
    } else {
      resolvedTarget[key] = value;
    }
  }

  return resolvedTarget;
}

function resolveIncrementalCycle(
  block: NeutralIRBlock,
  currentPosition: Record<string, number>,
  cycleReturnMode: CycleReturnMode,
): NeutralIRBlock["cycle"] {
  if (!block.cycle) return undefined;
  if (!isFanucStyleCycle(block.cycle.originalCycleId)) return block.cycle;

  const currentZ = currentPosition.Z;
  const coordinateBaseZ = currentZ ?? 0;
  const absoluteDepth = block.cycle.absoluteDepth !== undefined
    ? coordinateBaseZ + block.cycle.absoluteDepth
    : undefined;
  const retractPlane = coordinateBaseZ + block.cycle.retractPlane;
  const referencePlane = coordinateBaseZ;

  return {
    ...block.cycle,
    retractPlane,
    returnPlane: cycleReturnMode === "r-plane" ? retractPlane : currentZ,
    referencePlane,
    safetyClearance: Math.abs(retractPlane - referencePlane),
    depth: absoluteDepth !== undefined
      ? Math.abs(referencePlane - absoluteDepth)
      : block.cycle.depth,
    absoluteDepth,
    relativeDepth: undefined,
  };
}

function applyCycleReturnPlane(
  cycle: NonNullable<NeutralIRBlock["cycle"]>,
  currentPosition: Record<string, number>,
  cycleReturnMode: CycleReturnMode,
): NonNullable<NeutralIRBlock["cycle"]> {
  if (!isFanucStyleCycle(cycle.originalCycleId)) {
    return cycle.returnPlane !== undefined ? cycle : { ...cycle, returnPlane: cycle.retractPlane };
  }

  if (cycleReturnMode === "r-plane") {
    return { ...cycle, returnPlane: cycle.retractPlane };
  }

  return currentPosition.Z !== undefined
    ? { ...cycle, returnPlane: currentPosition.Z }
    : { ...cycle, returnPlane: undefined };
}

function isFanucStyleCycle(originalCycleId: string | undefined): boolean {
  return !!originalCycleId && /^G0?8[1-9]$/i.test(originalCycleId.trim());
}

function updateCurrentPosition(
  currentPosition: Record<string, number>,
  target?: AxisTarget,
  cycle?: NeutralIRBlock["cycle"],
): void {
  if (target) {
    for (const [axis, value] of Object.entries(target)) {
      if (typeof value === "number" && isPositionAxis(axis)) {
        if (cycle && axis.toLowerCase() === "z") continue;
        currentPosition[axis.toUpperCase()] = value;
      }
    }
  }

  if (cycle?.returnPlane !== undefined) {
    currentPosition.Z = cycle.returnPlane;
  }
}

function formatTarget(target: AxisTarget): string {
  return Object.entries(target)
    .flatMap(([k, v]) => (typeof v === "number" ? [`${k.toUpperCase()}${v.toFixed(3)}`] : []))
    .join(" ");
}

function formatDelta(target: AxisTarget): string {
  return Object.entries(target)
    .flatMap(([k, v]) => (typeof v === "number" ? [`${k.toUpperCase()}${v >= 0 ? "+" : ""}${v.toFixed(3)}`] : []))
    .join(" ");
}
