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

import { CNCProgram, ConversionOptions, ConversionResult } from "./types";
import { parseProgram } from "./parsers";
import { normalizeProgram } from "./ir/normalizer";
import { resolveCoordinates } from "./ir/resolver";
import { applyTransformations } from "./ir/transformers/index";
import { MachineStateMachine } from "./state/machine";
import { SafetyValidator } from "./safety/validator";
import { AuditTrail } from "./audit/trail";
import { getControllerFamily } from "./ir/family";
import { generateProgram } from "./generators";

/**
 * Main conversion function: parse → normalize → resolve → transform → validate → generate
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

  // Step 4: Resolve G91 incremental moves to absolute coordinates
  const { blocks: resolvedBlocks, resolvedCount } =
    resolveCoordinates(irBlocks);
  if (resolvedCount > 0) {
    warnings.push({
      line: 0,
      message: `${resolvedCount} G91 incremental move(s) resolved to absolute coordinates`,
      severity: "warning",
    });
  }

  // Step 5: Apply target-specific IR transformations
  const transformed = applyTransformations(
    resolvedBlocks,
    options.sourceFormat,
    options.targetFormat,
  );

  // Step 6: Safety validation (on transformed blocks)
  const validator = new SafetyValidator();
  const safetyIssues = validator.validate(transformed);
  for (const issue of safetyIssues) {
    const entry = {
      line: issue.blockIndex + 1,
      message: issue.message,
      severity: issue.severity,
    };
    if (issue.severity === "error") errors.push(entry);
    else warnings.push(entry);
  }

  // Step 7: Generate target output
  const output = generateProgram(
    transformed,
    options.targetFormat,
    options,
    machine,
  );

  // Step 8: Collect audit trail
  const audit = new AuditTrail(true);
  audit.collect(transformed);
  const auditSummary = audit.generateSummary(
    options.targetFormat,
    options.sourceFormat,
    transformed,
    options.material,
  );

  // Prepend audit summary as a comment block
  const finalOutput = auditSummary ? auditSummary + "\n" + output : output;

  // Step 9: Add cross-family warning if applicable
  if (options.sourceFormat !== options.targetFormat) {
    const sourceFamily = getControllerFamily(options.sourceFormat);
    const targetFamily = getControllerFamily(options.targetFormat);
    if (sourceFamily !== targetFamily) {
      warnings.push({
        line: 0,
        message: `Cross-family conversion (${sourceFamily} -> ${targetFamily}). Some cycles and features may need manual adjustment.`,
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

// NOTE: Cycle transformations are now handled by applyTransformations
// in ir/transformers/index.ts, which uses a structured Transformer pipeline.
// The old inline functions lookupCycleMappingInline, transformForTarget,
// and transformCycle have been removed.
