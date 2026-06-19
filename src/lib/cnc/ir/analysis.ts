import { NeutralIRBlock, AxisTarget } from "./types";

export interface CycleTimeEstimate {
  totalTimeSeconds: number;
  rapidTimeSeconds: number;
  feedTimeSeconds: number;
  dwellTimeSeconds: number;
  toolChangeTimeSeconds: number;
}

export interface CycleTimeOptions {
  rapidFeedRate: number; // mm/min
  toolChangeTime: number; // seconds
  initialPosition?: Partial<AxisTarget>;
}

const DEFAULT_OPTIONS: CycleTimeOptions = {
  rapidFeedRate: 10000,
  toolChangeTime: 10,
  initialPosition: { x: 0, y: 0, z: 0 },
};

/**
 * Estimates the cycle time for a sequence of IR blocks.
 */
export function estimateCycleTime(
  blocks: NeutralIRBlock[],
  options: Partial<CycleTimeOptions> = {},
): CycleTimeEstimate {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  let currentPos: Record<string, number> = {
    X: opts.initialPosition?.x ?? 0,
    Y: opts.initialPosition?.y ?? 0,
    Z: opts.initialPosition?.z ?? 0,
  };

  let rapidTime = 0;
  let feedTime = 0;
  let dwellTime = 0;
  let toolChangeTime = 0;

  let currentFeedRate = 0;

  for (const block of blocks) {
    // 1. Dwells
    if (block.dwell !== undefined) {
      dwellTime += block.dwell;
    }

    // 2. Tool Changes
    if (block.type === "tool-change") {
      toolChangeTime += opts.toolChangeTime;
    }

    // 3. Motion
    if (block.target) {
      const target = block.target;
      const startX = currentPos.X;
      const startY = currentPos.Y;
      const startZ = currentPos.Z;

      const endX = target.x ?? startX;
      const endY = target.y ?? startY;
      const endZ = target.z ?? startZ;

      const distance = Math.sqrt(
        Math.pow(endX - startX, 2) +
        Math.pow(endY - startY, 2) +
        Math.pow(endZ - startZ, 2)
      );

      if (distance > 0) {
        if (block.type === "rapid") {
          rapidTime += (distance / opts.rapidFeedRate) * 60;
        } else if (block.type === "linear" || block.type === "clockwise-arc" || block.type === "counterclockwise-arc") {
          const feed = block.feedRate ?? currentFeedRate;
          if (feed > 0) {
            feedTime += (distance / feed) * 60;
          }
        }
      }

      // Update position
      currentPos.X = endX;
      currentPos.Y = endY;
      currentPos.Z = endZ;
    }

    // Update modal feed rate
    if (block.feedRate !== undefined) {
      currentFeedRate = block.feedRate;
    }

    // Special handling for cycles (simplified estimate)
    if (block.cycle) {
      const c = block.cycle;
      const feed = block.feedRate ?? currentFeedRate;
      if (feed > 0) {
        // Very rough estimate: move to depth and back
        const cycleDist = c.depth * 2;
        feedTime += (cycleDist / feed) * 60;
      }
      if (c.dwell) {
        dwellTime += c.dwell;
      }
    }
  }

  return {
    totalTimeSeconds: rapidTime + feedTime + dwellTime + toolChangeTime,
    rapidTimeSeconds: rapidTime,
    feedTimeSeconds: feedTime,
    dwellTimeSeconds: dwellTime,
    toolChangeTimeSeconds: toolChangeTime,
  };
}
