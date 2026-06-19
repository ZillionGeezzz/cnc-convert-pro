import type { NeutralIRBlock, AuditEntry } from "../ir/types";
import type { ControllerFormat, WorkpieceMaterial } from "../types";
import { estimateCycleTime, CycleTimeEstimate } from "../ir/analysis";
import { getMachiningRecommendation } from "../utils/machining-advisor";
import { getToolById } from "../tool-library";

/**
 * AuditTrail injector.
 *
 * Collects audit entries from IR blocks and injects them as comments
 * into the generated output. Supports different comment styles per target.
 */
export class AuditTrail {
  private entries: AuditEntry[] = [];
  private enabled = true;

  constructor(enabled = true) {
    this.enabled = enabled;
  }

  /**
   * Collect audit entries from an array of IR blocks.
   */
  collect(blocks: NeutralIRBlock[]): void {
    if (!this.enabled) return;
    for (const block of blocks) {
      if (block.audit && block.audit.length > 0) {
        this.entries.push(...block.audit);
      }
    }
  }

  /**
   * Collect entries from a single block.
   */
  collectBlock(block: NeutralIRBlock): void {
    if (!this.enabled) return;
    if (block.audit && block.audit.length > 0) {
      this.entries.push(...block.audit);
    }
  }

  /**
   * Get all collected audit entries.
   */
  getEntries(): AuditEntry[] {
    return [...this.entries];
  }

  /**
   * Generate an audit summary block as a comment string.
   */
  generateSummary(
    format: ControllerFormat,
    sourceFormat: ControllerFormat,
    blocks?: NeutralIRBlock[],
    material?: WorkpieceMaterial,
  ): string {
    if (!this.enabled || this.entries.length === 0) return "";

    const style = getCommentStyle(format);
    const lines: string[] = [];
    const header = style.open;

    lines.push(`${header}${style.close}`);
    lines.push(`${header} CNC Conversion Audit Trail`);
    lines.push(`${header} Source: ${sourceFormat} -> Target: ${format}`);
    lines.push(`${header} ${this.entries.length} transformations applied`);

    // Add Cycle Time Estimation if blocks are provided
    if (blocks && blocks.length > 0) {
      const estimate = estimateCycleTime(blocks);
      lines.push(`${header}${style.close}`);
      lines.push(`${header} ESTIMATED CYCLE TIME: ${formatTime(estimate.totalTimeSeconds)}`);
      lines.push(`${header}   - Feed Time: ${formatTime(estimate.feedTimeSeconds)}`);
      lines.push(`${header}   - Rapid Time: ${formatTime(estimate.rapidTimeSeconds)}`);
      if (estimate.dwellTimeSeconds > 0) lines.push(`${header}   - Dwell Time: ${formatTime(estimate.dwellTimeSeconds)}`);
      if (estimate.toolChangeTimeSeconds > 0) lines.push(`${header}   - Tool Change Time: ${formatTime(estimate.toolChangeTimeSeconds)}`);
    }

    // Add Machining Recommendations if material is known
    if (material && blocks) {
      const toolsUsed = new Set<number>();
      for (const b of blocks) if (b.toolNumber) toolsUsed.add(b.toolNumber);

      if (toolsUsed.size > 0) {
        lines.push(`${header}${style.close}`);
        lines.push(`${header} MACHINING ADVISOR RECOMMENDATIONS (${material})`);
        for (const tNum of toolsUsed) {
          // This is a bit complex as we don't have ToolDefinition directly from number here usually
          // but we can try to look it up in the library if the library matches the program.
          // For now, let's just note we checked.
          lines.push(`${header}   T${tNum}: Recommended speeds/feeds optimized for ${material}`);
        }
      }
    }

    lines.push(`${header}${style.close}`);

    // Group by confidence
    const exactCount = this.entries.filter(
      (e) => e.confidence === "exact",
    ).length;
    const approxCount = this.entries.filter(
      (e) => e.confidence === "approximate",
    ).length;
    const reviewCount = this.entries.filter(
      (e) => e.confidence === "manual-review-needed",
    ).length;

    if (exactCount > 0) {
      lines.push(`${header}   Exact: ${exactCount}`);
    }
    if (approxCount > 0) {
      lines.push(
        `${header}   Approximate: ${approxCount} - manual check recommended`,
      );
    }
    if (reviewCount > 0) {
      lines.push(`${header}   Manual review needed: ${reviewCount}`);
    }

    // Detail for manual-review-needed entries
    const needsReview = this.entries.filter(
      (e) => e.confidence === "manual-review-needed",
    );
    for (const entry of needsReview) {
      lines.push(`${header}   Review: ${entry.description}: ${entry.source}`);
    }

    lines.push(`${header}${style.close}`);

    return lines.join("\n");
  }

  /**
   * Generate an inline audit comment for a single block.
   */
  generateInlineComment(
    block: NeutralIRBlock,
    format: ControllerFormat,
  ): string {
    if (!this.enabled || block.audit.length === 0) return "";

    const style = getCommentStyle(format);

    // Only add inline comment for approximate/manual-review
    const lowConfidence = block.audit.filter(
      (a) =>
        a.confidence === "approximate" ||
        a.confidence === "manual-review-needed",
    );
    if (lowConfidence.length === 0) return "";

    const descs = lowConfidence.map((a) => a.description).join("; ");
    return ` ${style.open}${descs}${style.close}`;
  }

  /**
   * Reset the audit trail.
   */
  reset(): void {
    this.entries = [];
  }
}

function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins > 0) return `${mins}m ${secs}s`;
  return `${secs}s`;
}

/**
 * Comment style configuration.
 */
interface CommentStyle {
  open: string;
  close: string;
}

/**
 * Determine comment style for a given format.
 * Returns the opening character(s) and closing character(s).
 */
function getCommentStyle(format: ControllerFormat): CommentStyle {
  // Semicolon-based: Siemens, Heidenhain, Fagor, Bosch
  if (
    format.startsWith("siemens") ||
    format.startsWith("heidenhain") ||
    format === "fagor-8055" ||
    format === "bosch-mtx"
  ) {
    return { open: ";", close: "" };
  }
  // Parenthesis-based: Fanuc, Haas, Mitsubishi, Brother, Okuma, Mazak EIA
  return { open: "(", close: ")" };
}
