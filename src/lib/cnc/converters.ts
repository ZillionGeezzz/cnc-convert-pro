import {
  CNCBlock,
  CNCProgram,
  ConversionOptions,
  ConversionResult,
  ControllerFormat,
} from "./types";
import { parseProgram } from "./parsers";
import { generateProgram } from "./generators";

/** Mapping of Siemens G-codes to standard (for Mitsubishi conversion) */
const SIEMENS_TO_STANDARD_G: Record<string, string> = {
  G0: "G00",
  G1: "G01",
  G2: "G02",
  G3: "G03",
  G4: "G04",
  G33: "G33",
  G40: "G40",
  G41: "G41",
  G42: "G42",
  G53: "G53",
  G54: "G54",
  G55: "G55",
  G56: "G56",
  G57: "G57",
  G60: "G60",
  G63: "G63",
  G64: "G64",
  G90: "G90",
  G91: "G91",
  G94: "G94",
  G95: "G95",
  G96: "G96",
  G97: "G97",
  G500: "G54",
};

/** Mapping of standard G-codes to Siemens */
const STANDARD_TO_SIEMENS_G: Record<string, string> = {
  G00: "G0",
  G01: "G1",
  G02: "G2",
  G03: "G3",
  G04: "G4",
};

/** Standard M-code mapping */
const M_CODE_MAP: Record<string, string> = {
  M3: "M3",
  M4: "M4",
  M5: "M5",
  M6: "M6",
  M8: "M8",
  M9: "M9",
  M17: "M17",
  M30: "M30",
};

/**
 * Convert a parsed program from one format to another at the block level.
 * This handles semantic transformations beyond simple G-code mapping.
 */
function convertBlocks(program: CNCProgram, targetFormat: ControllerFormat): CNCProgram {
  const convertedBlocks: CNCBlock[] = [];

  for (const block of program.blocks) {
    const newBlock: CNCBlock = { ...block, addresses: { ...block.addresses } };
    newBlock.gCodes = [...block.gCodes];
    newBlock.mCodes = [...block.mCodes];
    newBlock.axes = { ...block.axes };

    if (program.sourceFormat === "siemens-840d" && targetFormat === "mitsubishi-m80") {
      convertSiemensToMitsubishiBlock(newBlock);
    } else if (program.sourceFormat === "mitsubishi-m80" && targetFormat === "siemens-840d") {
      convertMitsubishiToSiemensBlock(newBlock);
    }

    convertedBlocks.push(newBlock);
  }

  return {
    ...program,
    blocks: convertedBlocks,
    sourceFormat: targetFormat,
  };
}

function convertSiemensToMitsubishiBlock(block: CNCBlock): void {
  // Map G-codes: G0→G00, G1→G01, etc.
  block.gCodes = block.gCodes.map((g) => SIEMENS_TO_STANDARD_G[g] || g);

  // Convert axis format: Siemens uses = for axis values, Mitsubishi doesn't
  // (handled in generators)

  // Convert Siemens tool call format
  if (block.toolName) {
    // Try to look up tool number from name (handled elsewhere)
    // Keep the tool name as a comment
    block.comment = block.comment
      ? `Tool: ${block.toolName}; ${block.comment}`
      : `Tool: ${block.toolName}`;
  }

  // Keep M-codes (mostly compatible)
  // Remove M17 (subprogram end), keep M30 for program end
}

function convertMitsubishiToSiemensBlock(block: CNCBlock): void {
  // Map G-codes: G00→G0, G01→G1, etc.
  block.gCodes = block.gCodes.map((g) => STANDARD_TO_SIEMENS_G[g] || g);

  // Convert fixed cycles to Siemens cycles (handled in generators via cycle detection)
  const gNum = block.gCodes[0] ? parseInt(block.gCodes[0].replace("G", ""), 10) : -1;

  if (!isNaN(gNum) && gNum >= 81 && gNum <= 89) {
    // Convert fixed cycle to Siemens cycle
    const cycleName = getSiemensCycleName(gNum);
    const rfp = block.axes["R"] || 10; // Retract plane (default)
    const dp = Math.abs(block.axes["Z"] || 10); // Depth
    const sdip = 1; // Safety distance

    let cycleCall: string;
    switch (gNum) {
      case 81:
        cycleCall = `CYCLE81(${rfp},${rfp - sdip},${sdip},${dp})`;
        break;
      case 83:
        cycleCall = `CYCLE83(${rfp},${rfp - sdip},${sdip},${dp},0,${Math.min(dp / 2, 3)},,${block.axes["Q"] || 3})`;
        break;
      case 84:
        cycleCall = `CYCLE84(${rfp},${rfp - sdip},${sdip},${dp},0,,3,1.5,,,,)`;
        break;
      case 85:
        cycleCall = `CYCLE85(${rfp},${rfp - sdip},${sdip},${dp})`;
        break;
      default:
        cycleCall = `; Fixed cycle G${gNum} — manual conversion needed`;
        break;
    }

    block.siemensCycleCall = cycleCall;
    block.cycle = cycleName;
  }
}

function getSiemensCycleName(gNum: number): string {
  const map: Record<number, string> = {
    81: "CYCLE81",
    82: "CYCLE82",
    83: "CYCLE83",
    84: "CYCLE84",
    85: "CYCLE85",
    86: "CYCLE86",
    87: "CYCLE87",
    88: "CYCLE88",
    89: "CYCLE89",
  };
  return map[gNum] || "CYCLE81";
}

/**
 * High-level conversion function.
 * Parses input → converts blocks → generates output.
 */
export function convertProgram(
  input: string,
  options: ConversionOptions,
): ConversionResult {
  const errors: ConversionResult["errors"] = [];
  const warnings: ConversionResult["warnings"] = [];

  // Step 1: Parse input
  const parsed = parseProgram(input, options.sourceFormat);
  errors.push(
    ...parsed.errors.map((e) => ({
      ...e,
      severity: e.severity as "warning" | "error",
    })),
  );

  // Step 2: Convert (if formats differ)
  let converted: CNCProgram;
  if (options.sourceFormat === options.targetFormat) {
    converted = parsed;
    converted.sourceFormat = options.targetFormat;
  } else {
    converted = convertBlocks(parsed, options.targetFormat);
  }

  // Step 3: Generate output
  const output = generateProgram(converted, options.targetFormat, options);

  return {
    success: errors.length === 0 || errors.every((e) => e.severity === "warning"),
    program: converted,
    output,
    errors: errors.filter((e) => e.severity === "error"),
    warnings: [...warnings, ...errors.filter((e) => e.severity === "warning")],
  };
}
