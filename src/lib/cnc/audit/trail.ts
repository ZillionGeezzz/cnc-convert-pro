import type { NeutralIRBlock, AuditEntry } from "../ir/types";
import type { ControllerFormat } from "../types";

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
  ): string {
    if (!this.enabled || this.entries.length === 0) return "";

    const commentChar = getCommentChar(format);
    const lines: string[] = [];
    const closeChar = format === "fanuc-0i" || format === "haas" ? ")" : "";

    lines.push(`${commentChar}${closeChar}`);
    lines.push(`${getHeader(format)} CNC Conversion Audit Trail`);
    lines.push(`${getHeader(format)} Source: ${sourceFormat} → Target: ${format}`);
    lines.push(`${getHeader(format)} ${this.entries.length} transformations applied`);
    lines.push(`${commentChar}${closeChar}`);

    // Group by confidence
    const exactCount = this.entries.filter((e) => e.confidence === "exact").length;
    const approxCount = this.entries.filter((e) => e.confidence === "approximate").length;
    const reviewCount = this.entries.filter((e) => e.confidence === "manual-review-needed").length;

    if (exactCount > 0) {
      lines.push(`${getHeader(format)}   Exact: ${exactCount}`);
    }
    if (approxCount > 0) {
      lines.push(`${getHeader(format)}   Approximate: ${approxCount} — manual check recommended`);
    }
    if (reviewCount > 0) {
      lines.push(`${getHeader(format)}   Manual review needed: ${reviewCount}`);
    }

    // Detail for manual-review-needed entries
    const needsReview = this.entries.filter((e) => e.confidence === "manual-review-needed");
    for (const entry of needsReview) {
      lines.push(`${getHeader(format)}   ⚠ ${entry.description}: ${entry.source}`);
    }

    lines.push(`${commentChar}${closeChar}`);

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

    const commentChar = getCommentChar(format);
    const closeChar = (format === "fanuc-0i" || format === "haas") ? ")" : "";

    // Only add inline comment for approximate/manual-review
    const lowConfidence = block.audit.filter(
      (a) => a.confidence === "approximate" || a.confidence === "manual-review-needed",
    );
    if (lowConfidence.length === 0) return "";

    const descs = lowConfidence.map((a) => a.description).join("; ");
    return ` ${commentChar}${descs}${closeChar}`;
  }

  /**
   * Reset the audit trail.
   */
  reset(): void {
    this.entries = [];
  }
}

/**
 * Determine comment character for a given format.
 */
function getCommentChar(format: ControllerFormat): string {
  if (format.startsWith("siemens") || format.startsWith("heidenhain") || format === "fagor-8055" || format === "bosch-mtx") {
    return ";";
  }
  // Fanuc, Haas, Mitsubishi, Brother, Okuma — use parens by default
  return "(";
}

/**
 * Get header prefix character per format.
 */
function getHeader(format: ControllerFormat): string {
  const c = getCommentChar(format);
  return c === "(" ? "(" : c;
}
