/**
 * Kinematic Integrity Validator.
 *
 * Validates CNC program kinematics against machine capabilities:
 * - HMC B-axis limitations vs VMC constraints
 * - Axis count mismatches (3-axis program on 5-axis machine, etc.)
 * - Kinematic chain violations (e.g., B-axis on VMC without trunnion)
 * - Out-of-range rotary axis commands
 *
 * Usage:
 *   import { KinematicValidator } from "./kinematic/validator";
 *   const issues = new KinematicValidator().validate(blocks, machineProfile);
 */

import type { NeutralIRBlock } from "../ir/types";
import type { MachineProfile } from "../types";

export type KinematicSeverity = "error" | "warning" | "info";

export interface KinematicIssue {
  ruleId: string;
  blockIndex: number;
  message: string;
  severity: KinematicSeverity;
  source: string;
  suggestion?: string;
}

export interface KinematicValidationOptions {
  /** Expected number of axes (3, 4, or 5) */
  expectedAxisCount?: number;
  /** Whether to require B-axis for HMC programs */
  checkBRotation?: boolean;
  /** Whether to flag kinematic chain issues */
  checkKinematicChain?: boolean;
}

const DEFAULT_OPTIONS: KinematicValidationOptions = {
  expectedAxisCount: undefined,
  checkBRotation: true,
  checkKinematicChain: true,
};

export class KinematicValidator {
  private issues: KinematicIssue[] = [];

  /**
   * Validate IR blocks against a machine profile.
   */
  validate(
    blocks: NeutralIRBlock[],
    profile?: MachineProfile,
    options?: KinematicValidationOptions,
  ): KinematicIssue[] {
    this.issues = [];
    const opts = { ...DEFAULT_OPTIONS, ...options };

    const usedAxes = this.collectUsedAxes(blocks);

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];

      // Check axis count expectations
      if (opts.expectedAxisCount !== undefined) {
        this.checkAxisCount(block, i, opts.expectedAxisCount, usedAxes);
      }

      // Check profile-specific kinematics
      if (profile) {
        if (opts.checkBRotation) {
          this.checkBaxisOnProfile(block, i, profile);
        }
        this.checkRotaryRange(block, i, profile);
      }

      // Check kinematic chain (e.g., B-axis without trunnion on VMC)
      if (opts.checkKinematicChain && profile) {
        this.checkKinematicChain(block, i, profile);
      }
    }

    // Add summary-level issues
    this.addAxisSummary(usedAxes, profile, opts);

    return this.issues;
  }

  /**
   * Get the issues found.
   */
  getIssues(): KinematicIssue[] {
    return [...this.issues];
  }

  // ==========================================
  // PRIVATE CHECKS
  // ==========================================

  /**
   * Collect all axes used across motion blocks.
   */
  private collectUsedAxes(blocks: NeutralIRBlock[]): Set<string> {
    const axes = new Set<string>();
    for (const block of blocks) {
      if (!block.target) continue;
      for (const axis of Object.keys(block.target)) {
        const key = axis.toUpperCase();
        if (["X", "Y", "Z", "A", "B", "C", "U", "V", "W"].includes(key)) {
          axes.add(key);
        }
      }
    }
    return axes;
  }

  /**
   * Check if the block uses axes that exceed the expected count.
   */
  private checkAxisCount(
    block: NeutralIRBlock,
    blockIndex: number,
    expectedAxisCount: number,
    usedAxes: Set<string>,
  ): void {
    if (!block.target) return;

    const linearAxes = ["X", "Y", "Z"];
    const rotaryAxes = ["A", "B", "C"];
    const blockLinear = linearAxes.filter((a) => block.target![a.toLowerCase() as keyof typeof block.target] !== undefined);
    const blockRotary = rotaryAxes.filter((a) => block.target![a.toLowerCase() as keyof typeof block.target] !== undefined);

    // Count axes used simultaneously
    const simultaneousAxes = blockLinear.length + blockRotary.length;

    if (expectedAxisCount === 3 && blockRotary.length > 0) {
      this.issues.push({
        ruleId: "AXIS_COUNT_3_WITH_ROTARY",
        blockIndex,
        message: `Rotary axis ${blockRotary.join(", ")} in program configured for 3-axis machine`,
        severity: "error",
        source: block.raw,
        suggestion: "Remove rotary axis moves or change machine profile to 4/5-axis",
      });
    }

    if (expectedAxisCount === 4 && blockRotary.length > 0 && usedAxes.size > 4) {
      this.issues.push({
        ruleId: "AXIS_COUNT_4_EXCEEDED",
        blockIndex,
        message: `Program uses ${usedAxes.size} axes (${[...usedAxes].join(", ")}) but machine is configured for 4-axis`,
        severity: "error",
        source: block.raw,
        suggestion: "Reduce to 4 simultaneous axes or configure as 5-axis",
      });
    }
  }

  /**
   * Check B-axis usage against machine profile (HMC vs VMC).
   */
  private checkBaxisOnProfile(
    block: NeutralIRBlock,
    blockIndex: number,
    profile: MachineProfile,
  ): void {
    if (!block.target) return;      const bVal = block.target.b;
      if (bVal === undefined) return;

    // B-axis commanded on VMC without B-axis
    if (profile.type === "vmc" && !profile.bAxis) {
      this.issues.push({
        ruleId: "B_AXIS_ON_VMC",
        blockIndex,
        message: `B-axis rotation (B${bVal}) on VMC without B-axis capability`,
        severity: "error",
        source: block.raw,
        suggestion: "Remove B-axis commands or configure machine with B-axis trunnion",
      });
    }

    // B-axis on HMC — valid, but check rotation range
    if (profile.type === "hmc") {
      // HMCs typically have full 360° B-axis rotation
      const absB = Math.abs(bVal);
      if (absB > 360) {
        this.issues.push({
          ruleId: "B_AXIS_RANGE_HMC",
          blockIndex,
          message: `B-axis rotation angle ${bVal}° exceeds full rotation (360°)`,
          severity: "warning",
          source: block.raw,
          suggestion: `Normalize B-axis to 0-360° range`,
        });
      }
    }
  }

  /**
   * Check rotary axis ranges.
   */
  private checkRotaryRange(
    block: NeutralIRBlock,
    blockIndex: number,
    profile: MachineProfile,
  ): void {
    if (!block.target) return;

    // A-axis range: typically -120° to +120° for trunnion, or full 360° for rotary
    if (block.target.a !== undefined) {
      const a = Math.abs(block.target.a);
      if (a > 360) {
        this.issues.push({
          ruleId: "A_AXIS_RANGE",
          blockIndex,
          message: `A-axis rotation angle ${block.target.a}° exceeds typical range`,
          severity: "warning",
          source: block.raw,
          suggestion: `Normalize A-axis to ±360° range`,
        });
      }

      // Check VMC trunnion limits (typically -120° to +120°)
      if (profile.type === "vmc" && a > 120) {
        this.issues.push({
          ruleId: "A_AXIS_VMC_TILT",
          blockIndex,
          message: `A-axis tilt angle ${block.target.a}° may exceed VMC trunnion limits (±120°)`,
          severity: "warning",
          source: block.raw,
          suggestion: "Verify trunnion tilt range for the specific machine",
        });
      }
    }

    // C-axis range
    if (block.target.c !== undefined) {
      const c = Math.abs(block.target.c);
      if (c > 360) {
        this.issues.push({
          ruleId: "C_AXIS_RANGE",
          blockIndex,
          message: `C-axis rotation angle ${block.target.c}° exceeds full rotation`,
          severity: "warning",
          source: block.raw,
          suggestion: `Normalize C-axis to 0-360° range`,
        });
      }
    }
  }

  /**
   * Check kinematic chain violations.
   */
  private checkKinematicChain(
    block: NeutralIRBlock,
    blockIndex: number,
    profile: MachineProfile,
  ): void {
    if (!block.target) return;

    const hasTrunnionAxes =
      (block.target.a !== undefined || block.target.b !== undefined) &&
      (block.target.c !== undefined);

    // Simultaneous 5-axis on VMC without 5-axis capability
    if (profile.type === "vmc" && hasTrunnionAxes && !profile.bAxis) {
      // VMC with trunnion needs at least one rotary axis
      const rotaryAxes = ["a", "b", "c"].filter(
        (a) => (block.target as any)[a] !== undefined,
      );
      if (rotaryAxes.length >= 2) {
        this.issues.push({
          ruleId: "KINEMATIC_5AXIS_NO_TRUNNION",
          blockIndex,
          message: `Simultaneous multi-axis (${rotaryAxes.join(", ")}) on VMC without trunnion/rotary capability`,
          severity: "warning",
          source: block.raw,
          suggestion: "Ensure machine has trunnion table or swivel head for multi-axis moves",
        });
      }
    }

    // Check for kinematic singularity (e.g., B=90° on tilting head)
    if (block.target.b !== undefined) {
      const bVal = Math.abs(block.target.b);
      if (bVal > 85 && bVal < 95 && (block.target.x !== undefined || block.target.y !== undefined)) {
        this.issues.push({
          ruleId: "KINEMATIC_SINGULARITY",
          blockIndex,
          message: `B-axis at ${block.target.b}° (near 90° singularity) with linear axes — possible kinematic singularity`,
          severity: "warning",
          source: block.raw,
          suggestion: "Adjust B-axis to avoid 90° position during linear motion, or verify post-processor handles singularity",
        });
      }
    }
  }

  /**
   * Add summary-level issues based on all collected axes.
   */
  private addAxisSummary(
    usedAxes: Set<string>,
    profile?: MachineProfile,
    opts?: KinematicValidationOptions,
  ): void {
    if (usedAxes.size === 0) return;

    // Check for unused axes (e.g., 5-axis machine but only 3 axes used)
    if (profile && opts?.checkKinematicChain) {
      if (profile.type === "hmc" && profile.bAxis) {
        const usesRotary = [...usedAxes].some((a) => ["A", "B", "C"].includes(a));
        if (!usesRotary && usedAxes.size <= 3) {
          this.issues.push({
            ruleId: "HMC_NO_ROTARY",
            blockIndex: 0,
            message: `HMC program uses only linear axes (${[...usedAxes].join(", ")}) — B-axis rotary not utilized`,
            severity: "info",
            source: "(program summary)",
            suggestion: "Consider using B-axis for multi-side machining to maximize HMC productivity",
          });
        }
      }
    }
  }

  reset(): void {
    this.issues = [];
  }
}
