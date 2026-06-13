import type { NeutralIRBlock } from "../ir/types";
import type { MachineProfile } from "../types";
import type { SafetyIssue } from "./rules";
import {
  checkTravelLimits,
  checkSpindleSpeed,
  checkToolBeforeSpindle,
  checkToolChangeWithM6,
  checkCycleConfidence,
  checkArcParameters,
  checkCoolantBeforeSpindle,
} from "./rules";
import type { MachineContext } from "../state/types";

/**
 * SafetyValidator runs a set of safety rules against IR blocks.
 * It maintains internal state (e.g., spindle on/off, previous tool)
 * to support contextual checks.
 */
export class SafetyValidator {
  private spindleOn = false;
  private previousTool: number | null = null;
  private issues: SafetyIssue[] = [];

  /**
   * Validate an array of IR blocks against a machine profile.
   * Returns all issues found.
   */
  validate(
    blocks: NeutralIRBlock[],
    profile?: MachineProfile,
    contextHistory?: MachineContext[],
  ): SafetyIssue[] {
    this.spindleOn = false;
    this.previousTool = null;
    this.issues = [];

    for (let i = 0; i < blocks.length; i++) {
      const block = blocks[i];
      this.validateBlock(block, profile, i);
      this.updateInternalState(block);
    }

    return this.issues;
  }

  /**
   * Validate a single block against all applicable rules.
   */
  private validateBlock(
    block: NeutralIRBlock,
    profile: MachineProfile | undefined,
    blockIndex: number,
  ): void {
    this.addIssue(checkCycleConfidence(block, profile, blockIndex));
    this.addIssue(checkArcParameters(block, profile, blockIndex));
    this.addIssue(checkToolBeforeSpindle(block, profile, blockIndex, this.previousTool));
    this.addIssue(checkToolChangeWithM6(block, profile, blockIndex, this.previousTool));
    this.addIssue(checkCoolantBeforeSpindle(block, profile, blockIndex, this.spindleOn));

    if (profile) {
      this.addIssue(checkTravelLimits(block, profile, blockIndex));
      this.addIssue(checkSpindleSpeed(block, profile, blockIndex));
    }
  }

  /**
   * Update internal state based on block type.
   */
  private updateInternalState(block: NeutralIRBlock): void {
    switch (block.type) {
      case "spindle-forward":
      case "spindle-reverse":
        this.spindleOn = true;
        break;
      case "spindle-stop":
      case "spindle-orient":
        this.spindleOn = false;
        break;
      case "tool-change":
      case "tool-definition":
        if (block.toolNumber !== undefined) {
          this.previousTool = block.toolNumber;
        }
        break;
    }
  }

  private addIssue(issue: SafetyIssue | null): void {
    if (issue) {
      this.issues.push(issue);
    }
  }

  /**
   * Get the issues found and reset.
   */
  getIssues(): SafetyIssue[] {
    return [...this.issues];
  }

  /**
   * Clear all issues and reset state.
   */
  reset(): void {
    this.spindleOn = false;
    this.previousTool = null;
    this.issues = [];
  }
}
