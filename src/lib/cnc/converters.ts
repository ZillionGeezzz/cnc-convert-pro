import {
  CNCBlock,
  CNCProgram,
  ConversionOptions,
  ConversionResult,
  ControllerFormat,
} from "./types";
import { parseProgram } from "./parsers";
import { generateProgram } from "./generators";

/** Siemens G-code to standard Fanuc-style G-code mapping */
const SIEMENS_TO_STANDARD_G: Record<string, string> = {
  G0: "G00", G1: "G01", G2: "G02", G3: "G03", G4: "G04",
  G33: "G33", G40: "G40", G41: "G41", G42: "G42",
  G53: "G53", G54: "G54", G55: "G55", G56: "G56", G57: "G57",
  G60: "G60", G63: "G63", G64: "G64",
  G90: "G90", G91: "G91", G94: "G94", G95: "G95", G96: "G96", G97: "G97",
  G500: "G54", // G500 = disable offsets → G54
};

/** Standard to Siemens G-code mapping */
const STANDARD_TO_SIEMENS_G: Record<string, string> = {
  G00: "G0", G01: "G1", G02: "G2", G03: "G3", G04: "G4",
};

/**
 * Map standard Fanuc G-codes to Heidenhain equivalent
 */
const STANDARD_TO_HEIDENHAIN: Record<string, string> = {
  G00: "L", G01: "L", G02: "CR", G03: "CR",
  G90: "MM", G91: "INCH",
};

/**
 * Map standard Fanuc G-codes to Mazak equivalent
 */
const STANDARD_TO_MAZAK: Record<string, string> = {
  G00: "G00", G01: "G01", G02: "G02", G03: "G03",
};

/**
 * Convert blocks between formats with semantic transformations
 */
function convertBlocks(
  program: CNCProgram,
  targetFormat: ControllerFormat,
): CNCProgram {
  const sourceFamily = getControllerFamily(program.sourceFormat);
  const targetFamily = getControllerFamily(targetFormat);
  const convertedBlocks: CNCBlock[] = [];

  for (const block of program.blocks) {
    const newBlock: CNCBlock = {
      ...block,
      gCodes: [...(block.gCodes || [])],
      mCodes: [...(block.mCodes || [])],
      axes: { ...(block.axes || {}) },
      qParams: { ...(block.qParams || {}) },
      cycleParams: [...(block.cycleParams || [])],
      addresses: { ...(block.addresses || {}) },
    };

    // Siemens → anything
    if (sourceFamily === "siemens" && targetFamily !== "siemens") {
      convertSiemensToStandard(newBlock);
    }

    // Anything → Siemens
    if (targetFamily === "siemens" && sourceFamily !== "siemens") {
      convertStandardToSiemens(newBlock);
    }

    // Heidenhain → anything
    if (sourceFamily === "heidenhain" && targetFamily !== "heidenhain") {
      convertHeidenhainToStandard(newBlock);
    }

    // Anything → Heidenhain
    if (targetFamily === "heidenhain" && sourceFamily !== "heidenhain") {
      convertStandardToHeidenhain(newBlock);
    }

    // Mazak specific
    if (sourceFamily === "mazak" && targetFamily !== "mazak") {
      convertMazakToStandard(newBlock);
    }

    // Anything → Mazak (for Mazatrol/Smooth, handle EIA separately)
    if (targetFamily === "mazak" && sourceFamily !== "mazak") {
      convertStandardToMazak(newBlock);
    }

    // Okuma specific
    if (sourceFamily === "okuma" && targetFamily !== "okuma") {
      convertStandardToSiemens(newBlock);
    }

    // Fagor specific
    if (sourceFamily === "fagor" && targetFamily !== "fagor") {
      convertStandardToSiemens(newBlock);
    }

    // Bosch (Siemens-like)
    if (sourceFamily === "bosch" && targetFamily === "siemens") {
      // Already compatible
    }

    convertedBlocks.push(newBlock);
  }

  return {
    ...program,
    blocks: convertedBlocks,
    sourceFormat: targetFormat,
  };
}

function getControllerFamily(format: ControllerFormat): string {
  if (format.startsWith("siemens")) return "siemens";
  if (format.startsWith("mitsubishi")) return "fanuc";
  if (format.startsWith("fanuc")) return "fanuc";
  if (format.startsWith("heidenhain")) return "heidenhain";    if (format.startsWith("mazak")) return "mazak";
  if (format === "okuma-osp") return "okuma";
  if (format === "haas") return "fanuc";
  if (format === "brother-speedio") return "fanuc";
  if (format === "fagor-8055") return "fagor";
  if (format === "bosch-mtx") return "bosch";
  return "fanuc";
}

function convertSiemensToStandard(block: CNCBlock): void {
  // Map G-codes
  block.gCodes = block.gCodes.map((g) => SIEMENS_TO_STANDARD_G[g] || g);

  // Keep cycle info as it will be handled by generators
  if (block.toolName) {
    block.comment = block.comment
      ? `Tool: ${block.toolName}; ${block.comment}`
      : `Tool: ${block.toolName}`;
  }
}

function convertStandardToSiemens(block: CNCBlock): void {
  // Map G-codes
  block.gCodes = block.gCodes.map((g) => STANDARD_TO_SIEMENS_G[g] || g);

  // Detect fixed cycles (G81-G89) and convert to Siemens cycles
  const gNum = block.gCodes[0] ? parseInt(block.gCodes[0].replace("G", ""), 10) : -1;

  if (!isNaN(gNum) && gNum >= 81 && gNum <= 89) {
    const cycleName = getSiemensCycleName(gNum);
    const rfp = (block.addresses["R"] as number) || 10;
    const dp = Math.abs(block.axes["Z"] || 10);
    const sdip = 1;

    let cycleCall: string;
    switch (gNum) {
      case 81:
        cycleCall = `CYCLE81(${rfp},${rfp - sdip},${sdip},${dp})`;
        break;
      case 82:
        cycleCall = `CYCLE82(${rfp},${rfp - sdip},${sdip},${dp},0)`; // Dwell at DP
        break;
      case 83:
        cycleCall = `CYCLE83(${rfp},${rfp - sdip},${sdip},${dp},0,${Math.min(dp / 2, 3)},,${(block.addresses["Q"] as number) || 3})`;
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
    81: "CYCLE81", 82: "CYCLE82", 83: "CYCLE83", 84: "CYCLE84",
    85: "CYCLE85", 86: "CYCLE86", 87: "CYCLE87", 88: "CYCLE88", 89: "CYCLE89",
  };
  return map[gNum] || "CYCLE81";
}

function convertHeidenhainToStandard(block: CNCBlock): void {
  // Heidenhain L moves → standard G-code
  if (block.heidenhainCommand === "L") {
    if (block.addresses["R0"] !== undefined) {
      block.gCodes = ["G00"];
    } else {
      block.gCodes = ["G01"];
    }
  }

  // TOOL CALL → T word
  if (block.heidenhainCommand === "TOOL CALL" && block.toolNumber) {
    block.gCodes = ["G00"];
    block.mCodes = ["M6"];
  }
}

function convertStandardToHeidenhain(block: CNCBlock): void {
  // G0/G1 → L move
  const gNum = block.gCodes[0] ? parseInt(block.gCodes[0].replace("G", ""), 10) : -1;
  if (!isNaN(gNum) && (gNum === 0 || gNum === 1)) {
    block.heidenhainCommand = "L";
    if (gNum === 0) {
      block.addresses["R0"] = 1; // Rapid traverse
    }
    block.gCodes = [];
  }

  // G81-G89 → CYCL DEF
  if (!isNaN(gNum) && gNum >= 81 && gNum <= 89) {
    const heidenhainCycles: Record<number, string> = {
      81: "200", 82: "201", 83: "202", 84: "203",
      85: "204", 86: "205", 87: "206", 88: "207", 89: "208",
    };
    block.cycle = heidenhainCycles[gNum] || "200";
    block.heidenhainCommand = "CYCL DEF";

    // Extract Q parameters from cycle
    const z = Math.abs(block.axes["Z"] || 10);
    const r = (block.addresses["R"] as number) || 2;
    const q = (block.addresses["Q"] as number) || 3;
    block.qParams = {
      "QL200": r,     // Set-up clearance
      "QL201": -z,    // Depth
      "QL202": 2,     // Feed
      "QL210": q,     // Peck depth
    };
    block.gCodes = [];
  }

  // Tool change → TOOL CALL
  if (block.toolNumber !== undefined && block.heidenhainCommand !== "TOOL CALL") {
    block.heidenhainCommand = "TOOL CALL";
    block.gCodes = [];
  }
}

function convertMazakToStandard(block: CNCBlock): void {
  // Mazatrol section headers → comments
  if (block.addresses["section"]) {
    block.comment = block.comment
      ? `Mazatrol: ${block.addresses["section"]}; ${block.comment}`
      : `Mazatrol: ${block.addresses["section"]}`;
  }
}

function convertStandardToMazak(block: CNCBlock): void {
  // Heidenhain L moves → standard G-code (already handled by convertHeidenhainToStandard)
  // Siemens cycles → already converted by convertSiemensToStandard
  // For Mazak EIA/ISO (standard G-code), blocks pass through as-is
  // For Mazak Mazatrol/Smooth, the generator handles conversational formatting
  
  // Handle any remaining Heidenhain-specific items
  if (block.heidenhainCommand === "TOOL CALL" && block.toolNumber) {
    block.gCodes = ["G00"];
    block.mCodes = ["M6"];
    block.heidenhainCommand = undefined;
  }
}

/**
 * Main conversion function: parse → convert blocks → generate output
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

  // Check for cross-family conversions that need warnings
  if (options.sourceFormat !== options.targetFormat) {
    const sourceFamily = getControllerFamily(options.sourceFormat);
    const targetFamily = getControllerFamily(options.targetFormat);
    if (sourceFamily !== targetFamily) {
      warnings.push({
        line: 0,
        message: `Converting between different controller families (${sourceFamily} → ${targetFamily}). Some cycles and features may need manual adjustment.`,
        severity: "warning",
      });
    }
  }

  return {
    success: errors.length === 0 || errors.every((e) => e.severity === "warning"),
    program: converted,
    output,
    errors: errors.filter((e) => e.severity === "error"),
    warnings: [...warnings, ...errors.filter((e) => e.severity === "warning")],
  };
}
