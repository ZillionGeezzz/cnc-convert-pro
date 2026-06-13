/**
 * CNC Converter Pipeline.
 *
 * Pipeline: Parse → Normalize → State Machine → Safety Check → Target Convert → Generate
 *
 * The converter now works through a NeutralIRBlock intermediate representation:
 * 1. Parse input format → CNCBlock[]
 * 2. Normalize CNCBlock[] → NeutralIRBlock[]
 * 3. Run MachineStateMachine to track modal state
 * 4. Run SafetyValidator to check for issues
 * 5. Apply target-specific IR transformations
 * 6. Generate target-format string from IR blocks
 * 7. Inject audit trail comments
 */

import {
  CNCBlock,
  CNCProgram,
  ConversionOptions,
  ConversionResult,
  ControllerFormat,
} from "./types";
import { parseProgram } from "./parsers";
import { normalizeProgram } from "./ir/normalizer";
import { NeutralIRBlock, createIRBlock } from "./ir/types";
import { MachineStateMachine } from "./state/machine";
import { SafetyValidator } from "./safety/validator";
import { AuditTrail } from "./audit/trail";
import { getControllerFamily } from "./ir/family";
import { generateProgram } from "./generators";

/**
 * Main conversion function: parse → normalize → validate → generate
 */
export function convertProgram(
  input: string,
  options: ConversionOptions,
): ConversionResult {
  const errors: ConversionResult["errors"] = [];
  const warnings: ConversionResult["warnings"] = [];

  // Step 1: Parse input
  const parsed = parseProgram(input, options.sourceFormat);
  for (const e of parsed.errors) {
    if (e.severity === "error") errors.push(e);
    else warnings.push(e);
  }

  // Step 2: Normalize to IR
  const irBlocks = normalizeProgram(parsed.blocks, options.sourceFormat);

  // Step 3: Run MachineContext state machine
  const machine = new MachineStateMachine(options.sourceFormat);
  for (const block of irBlocks) {
    machine.step(block);
  }

  // Step 4: Safety validation
  const validator = new SafetyValidator();
  const safetyIssues = validator.validate(irBlocks);
  for (const issue of safetyIssues) {
    const entry = {
      line: issue.blockIndex + 1,
      message: issue.message,
      severity: issue.severity,
    };
    if (issue.severity === "error") errors.push(entry);
    else warnings.push(entry);
  }

  // Step 5: Apply target-specific IR transformations
  const transformed = transformForTarget(irBlocks, options.sourceFormat, options.targetFormat);

  // Step 6: Generate target output
  const output = generateProgram(
    transformed,
    options.targetFormat,
    options,
    machine,
  );

  // Step 7: Collect audit trail
  const audit = new AuditTrail(true);
  audit.collect(transformed);
  const auditSummary = audit.generateSummary(options.targetFormat, options.sourceFormat);

  // Prepend audit summary as a comment block
  const finalOutput = auditSummary
    ? auditSummary + "\n" + output
    : output;

  // Step 8: Add cross-family warning if applicable
  if (options.sourceFormat !== options.targetFormat) {
    const sourceFamily = getControllerFamily(options.sourceFormat);
    const targetFamily = getControllerFamily(options.targetFormat);
    if (sourceFamily !== targetFamily) {
      warnings.push({
        line: 0,
        message: `Cross-family conversion (${sourceFamily} → ${targetFamily}). Some cycles and features may need manual adjustment.`,
        severity: "warning",
      });
    }
  }

  // Reconstruct a CNCProgram for the result (use original blocks + target format)
  const program: CNCProgram = {
    blocks: parsed.blocks,
    sourceFormat: options.targetFormat,
    errors: parsed.errors,
  };

  return {
    success: errors.length === 0,
    program,
    output: finalOutput,
    errors,
    warnings,
  };
}

// Inline cycle mapping lookup (avoids ESM require issue)
function lookupCycleMappingInline(
  sourceCycle: string,
  sourceFamily: string,
  targetFamily: string,
): { targetCycle: string; confidence: "exact" | "approximate" | "manual-review-needed"; note: string } | undefined {
  const CYCLE_MAPPINGS = [
    // Siemens → Fanuc
    { sc: "CYCLE81", sf: "siemens", tf: "fanuc", tc: "G81", conf: "exact" as const, note: "Simple drilling" },
    { sc: "CYCLE82", sf: "siemens", tf: "fanuc", tc: "G82", conf: "exact" as const, note: "Drilling with dwell" },
    { sc: "CYCLE83", sf: "siemens", tf: "fanuc", tc: "G83", conf: "exact" as const, note: "Peck drilling" },
    { sc: "CYCLE84", sf: "siemens", tf: "fanuc", tc: "G84", conf: "exact" as const, note: "Tapping" },
    { sc: "CYCLE85", sf: "siemens", tf: "fanuc", tc: "G85", conf: "exact" as const, note: "Boring, feed out" },
    { sc: "CYCLE86", sf: "siemens", tf: "fanuc", tc: "G86", conf: "approximate" as const, note: "Boring, spindle stop" },
    // Heidenhain → Fanuc
    { sc: "CYCL DEF 200", sf: "heidenhain", tf: "fanuc", tc: "G81", conf: "exact" as const, note: "Simple drilling" },
    { sc: "CYCL DEF 201", sf: "heidenhain", tf: "fanuc", tc: "G82", conf: "exact" as const, note: "Reaming / dwelling" },
    { sc: "CYCL DEF 202", sf: "heidenhain", tf: "fanuc", tc: "G83", conf: "exact" as const, note: "Peck drilling" },
    { sc: "CYCL DEF 203", sf: "heidenhain", tf: "fanuc", tc: "G84", conf: "exact" as const, note: "Rigid tapping" },
    // Heidenhain → Siemens
    { sc: "CYCL DEF 200", sf: "heidenhain", tf: "siemens", tc: "CYCLE81", conf: "exact" as const, note: "Simple drilling" },
    { sc: "CYCL DEF 202", sf: "heidenhain", tf: "siemens", tc: "CYCLE83", conf: "exact" as const, note: "Peck drilling" },
    // Fanuc → Siemens
    { sc: "G81", sf: "fanuc", tf: "siemens", tc: "CYCLE81", conf: "exact" as const, note: "Simple drilling" },
    { sc: "G82", sf: "fanuc", tf: "siemens", tc: "CYCLE82", conf: "exact" as const, note: "Drilling with dwell" },
    { sc: "G83", sf: "fanuc", tf: "siemens", tc: "CYCLE83", conf: "exact" as const, note: "Peck drilling" },
    { sc: "G84", sf: "fanuc", tf: "siemens", tc: "CYCLE84", conf: "exact" as const, note: "Tapping" },
    // Fanuc → Heidenhain
    { sc: "G81", sf: "fanuc", tf: "heidenhain", tc: "CYCL DEF 200", conf: "exact" as const, note: "Simple drilling" },
    { sc: "G83", sf: "fanuc", tf: "heidenhain", tc: "CYCL DEF 202", conf: "exact" as const, note: "Peck drilling" },
    { sc: "G84", sf: "fanuc", tf: "heidenhain", tc: "CYCL DEF 203", conf: "exact" as const, note: "Tapping" },
  ];
  const match = CYCLE_MAPPINGS.find(
    (m) => m.sc.toUpperCase() === sourceCycle.toUpperCase() && m.sf === sourceFamily && m.tf === targetFamily,
  );
  if (!match) return undefined;
  return { targetCycle: match.tc, confidence: match.conf, note: match.note };
}

// ==========================================
// IR TRANSFORMATIONS FOR TARGET
// ==========================================

/**
 * Apply target-format-specific transformations to IR blocks.
 * This handles:
 * - Cycle mapping (Siemens CYCLE81 → Fanuc G81 → Heidenhain CYCL DEF 200)
 * - Motion type adaptation
 * - Comment style adaptation
 */
function transformForTarget(
  blocks: NeutralIRBlock[],
  sourceFormat: ControllerFormat,
  targetFormat: ControllerFormat,
): NeutralIRBlock[] {
  if (sourceFormat === targetFormat) return blocks;

  const sourceFamily = getControllerFamily(sourceFormat);
  const targetFamily = getControllerFamily(targetFormat);

  return blocks.map((block) => {
    let transformed = { ...block, transformations: [...block.transformations], audit: [...block.audit] };

    // Apply cycle transformations
    if (block.cycle || block.type.startsWith("cycle-")) {
      transformed = transformCycle(transformed, sourceFamily, targetFamily, sourceFormat, targetFormat);
    }

    // Siemens-specific: T="name" → comment
    if (sourceFamily === "siemens" && block.toolName && targetFamily !== "siemens") {
      const nameComment = `Tool: ${block.toolName}`;
      transformed.comment = transformed.comment
        ? `${nameComment}; ${transformed.comment}`
        : nameComment;
      transformed.transformations.push({
        ruleId: "SIEMENS_TOOL_NAME",
        description: `Converted Siemens tool name to comment: ${block.toolName}`,
        source: `T="${block.toolName}"`,
        target: `;${nameComment}`,
      });
    }

    // Heidenhain R0 → Fanuc G00 marker
    if (sourceFamily === "heidenhain" && block.type === "rapid" && targetFamily !== "heidenhain") {
      // Already mapped to "rapid" by normalizer, but ensure the generator gets it
    }

    return transformed;
  });
}

/**
 * Transform a cycle block from source to target format.
 */
function transformCycle(
  block: NeutralIRBlock,
  sourceFamily: string,
  targetFamily: string,
  sourceFormat: ControllerFormat,
  targetFormat: ControllerFormat,
): NeutralIRBlock {
  if (!block.cycle) return block;

  const cycle = block.cycle;
  const sourceCycleId = cycle.originalCycleId || "";
  const audit: typeof block.audit = [...block.audit];
  const transformations = [...block.transformations];

  // Look up cycle mapping
  // Use inline lookup to avoid ESM require issue
  const mapping = lookupCycleMappingInline(sourceCycleId, sourceFamily, targetFamily);

  if (mapping) {
    audit.push({
      ruleId: `CYCLE_MAP_${sourceCycleId}_TO_${mapping.targetCycle}`,
      description: `Mapped ${sourceCycleId} → ${mapping.targetCycle}`,
      source: sourceCycleId,
      target: mapping.targetCycle,
      confidence: mapping.confidence,
    });
    transformations.push({
      ruleId: `CYCLE_MAP_${sourceCycleId}_TO_${mapping.targetCycle}`,
      description: mapping.note,
      source: `${sourceCycleId}(${cycle.originalParams || ""})`,
      target: mapping.targetCycle,
    });
  }

  // Set the target cycle ID for the generator to use
  const targetCycleId = mapping?.targetCycle || cycle.originalCycleId || "";

  return {
    ...block,
    cycle: {
      ...cycle,
      originalCycleId: targetCycleId,
    },
    audit,
    transformations,
  };
}
