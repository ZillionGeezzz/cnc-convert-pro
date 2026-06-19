import { NeutralIRBlock, AxisTarget } from "../types";
import { Transformer, TransformerContext } from "./index";

export interface GeometryTransformOptions {
  scale?: { x?: number; y?: number; z?: number; all?: number };
  mirror?: { x?: boolean; y?: boolean; z?: boolean };
  offset?: { x?: number; y?: number; z?: number };
}

/**
 * Creates a transformer that applies geometric transformations (scaling, mirroring, offset)
 * to all position-bearing IR blocks.
 */
export function createGeometryTransformer(options: GeometryTransformOptions): Transformer {
  const mirroredAxesCount = [options.mirror?.x, options.mirror?.y, options.mirror?.z].filter(Boolean).length;
  const shouldFlipArcs = mirroredAxesCount % 2 === 1;

  return (blocks: NeutralIRBlock[], ctx: TransformerContext): NeutralIRBlock[] => {
    return blocks.map((block) => {
      if (!block.target && !block.cycle) return block;

      const newBlock = { ...block };

      if (newBlock.target) {
        newBlock.target = transformTarget(newBlock.target, options);
      }

      // Flip arc direction if mirroring causes coordinate system inversion (odd count of mirrors)
      if (shouldFlipArcs) {
        if (newBlock.type === "clockwise-arc") {
          newBlock.type = "counterclockwise-arc";
        } else if (newBlock.type === "counterclockwise-arc") {
          newBlock.type = "clockwise-arc";
        }
      }

      if (newBlock.cycle) {
        // Cycle depth/planes also need transformation if they are absolute
        // This is a simplification; ideally we'd handle absolute vs relative depth
        const c = newBlock.cycle;
        const scaleZ = options.scale?.z ?? options.scale?.all ?? 1;
        const mirrorZ = options.mirror?.z ? -1 : 1;
        const offsetZ = options.offset?.z ?? 0;

        newBlock.cycle = {
          ...c,
          retractPlane: (c.retractPlane * scaleZ * mirrorZ) + offsetZ,
          depth: c.depth * scaleZ, // depth is usually a positive scalar distance
          absoluteDepth: c.absoluteDepth !== undefined ? (c.absoluteDepth * scaleZ * mirrorZ) + offsetZ : undefined,
          referencePlane: c.referencePlane !== undefined ? (c.referencePlane * scaleZ * mirrorZ) + offsetZ : undefined,
          surfaceCoordinate: c.surfaceCoordinate !== undefined ? (c.surfaceCoordinate * scaleZ * mirrorZ) + offsetZ : undefined,
        };
      }

      return newBlock;
    });
  };
}

function transformTarget(target: AxisTarget, options: GeometryTransformOptions): AxisTarget {
  const result = { ...target };

  const axes: (keyof AxisTarget)[] = ["x", "y", "z", "a", "b", "c", "u", "v", "w"];

  for (const axis of axes) {
    const val = target[axis];
    if (val === undefined) continue;

    let newVal = val;

    // 1. Scale
    const scale = (options.scale as any)?.[axis] ?? options.scale?.all ?? 1;
    newVal *= scale;

    // 2. Mirror
    if ((options.mirror as any)?.[axis]) {
      newVal *= -1;
    }

    // 3. Offset
    const offset = (options.offset as any)?.[axis] ?? 0;
    newVal += offset;

    (result as any)[axis] = newVal;
  }

  // Handle Arcs (I, J, K, R)
  // I, J, K are offsets, so they only scale and mirror, NO offset.
  if (target.i !== undefined) result.i = target.i * (options.scale?.x ?? options.scale?.all ?? 1) * (options.mirror?.x ? -1 : 1);
  if (target.j !== undefined) result.j = target.j * (options.scale?.y ?? options.scale?.all ?? 1) * (options.mirror?.y ? -1 : 1);
  if (target.k !== undefined) result.k = target.k * (options.scale?.z ?? options.scale?.all ?? 1) * (options.mirror?.z ? -1 : 1);

  if (target.r !== undefined) {
    // Radius is a scalar distance, only scale it (absolute value)
    result.r = Math.abs(target.r * (options.scale?.all ?? 1));
  }

  return result;
}
