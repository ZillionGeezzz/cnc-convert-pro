import { CNCBlock, CNCProgram, ControllerFormat } from "./types";

const emptyBlock = (raw: string): CNCBlock => ({
  raw,
  gCodes: [],
  mCodes: [],
  axes: {},
  cycleParams: [],
  qParams: {},
  addresses: {},
});

/**
 * Parse a Siemens 840d program string into blocks
 */
function parseSiemens840d(raw: string): CNCProgram {
  const lines = raw.split("\n");
  const blocks: CNCBlock[] = [];
  const errors: CNCProgram["errors"] = [];
  let isProgramEnd = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const block = parseSiemensLine(line, i + 1);
      if (block) {
        blocks.push(block);
        if (block.isProgramEnd) isProgramEnd = true;
      }
    } catch (e) {
      errors.push({
        line: i + 1,
        message: e instanceof Error ? e.message : "Failed to parse line",
        severity: "warning",
      });
      blocks.push(emptyBlock(line));
    }
  }

  return {
    blocks,
    sourceFormat: "siemens-840d",
    errors,
  };
}

function parseSiemensLine(line: string, lineNum: number): CNCBlock | null {
  const block: CNCBlock = {
    raw: line,
    gCodes: [],
    mCodes: [],
    axes: {},
    cycleParams: [],
    qParams: {},
    addresses: {},
  };

  // Strip comments
  const commentIdx = line.indexOf(";");
  if (commentIdx >= 0) {
    block.comment = line.slice(commentIdx + 1).trim();
    line = line.slice(0, commentIdx).trim();
  }

  if (!line) return block;

  // Match program start: %_N_..._MPF or :_N_...
  if (/^%_N_/.test(line) || /^:_N_/.test(line)) {
    block.isProgramStart = true;
    const match = line.match(/%_N_([^\s_]+)/);
    if (match) block.toolName = match[1];
    return block;
  }

  // Program end
  if (/^M(02|17|30)\b/.test(line) || /^%$/.test(line)) {
    block.isProgramEnd = true;
    const m = line.match(/M(02|17|30)/);
    if (m) block.mCodes.push(`M${m[1]}`);
    return block;
  }

  // Tokenize: split by whitespace but keep quoted strings together
  const tokens = tokenizeLine(line);

  // Handle Siemens cycle calls: CYCLE81(...,...), CYCLE83(...), etc.
  const cycleMatch = line.match(/\b(CYCLE\d+)\s*\(([^)]*)\)/i);
  if (cycleMatch) {
    block.siemensCycleCall = cycleMatch[0];
    block.cycle = cycleMatch[1];
    block.cycleParams = cycleMatch[2]
      .split(",")
      .map((s) => {
        const num = parseFloat(s.trim());
        return isNaN(num) ? 0 : num;
      });
  }

  for (const token of tokens) {
    if (token.startsWith("G")) {
      block.gCodes.push(token);
    } else if (token.startsWith("M")) {
      block.mCodes.push(token);
    } else if (/^[XYZABC]$/i.test(token[0]) && token.length > 1) {
      const axis = token[0].toUpperCase();
      const val = parseFloat(token.slice(1));
      if (!isNaN(val)) block.axes[axis] = val;
    } else if (token[0] === "F" && token.length > 1) {
      block.feed = parseFloat(token.slice(1));
    } else if (token[0] === "S" && token.length > 1) {
      block.spindleSpeed = parseFloat(token.slice(1));
    } else if (token[0] === "T" && token.length > 1) {
      if (token.includes('"')) {
        block.toolName = token.replace(/"/g, "").slice(1);
      } else {
        block.toolNumber = parseInt(token.slice(1), 10);
      }
    } else if (/^[A-Z]$/i.test(token[0]) && token.length > 1) {
      const addr = token[0].toUpperCase();
      const val = parseFloat(token.slice(1));
      block.addresses[addr] = isNaN(val) ? token.slice(1) : val;
    }
  }

  return block;
}

/**
 * Siemens 828D — almost identical to 840D in G-code syntax
 */
function parseSiemens828d(raw: string): CNCProgram {
  return parseSiemens840d(raw);
}

/**
 * Generic Fanuc-style parser for Fanuc 0i, 31i, Mitsubishi, Haas, Brother
 */
function parseFanucStyle(raw: string): CNCProgram {
  const lines = raw.split("\n");
  const blocks: CNCBlock[] = [];
  const errors: CNCProgram["errors"] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const block = parseFanucLine(line, i + 1);
      if (block) blocks.push(block);
    } catch (e) {
      errors.push({
        line: i + 1,
        message: e instanceof Error ? e.message : "Failed to parse line",
        severity: "warning",
      });
      blocks.push(emptyBlock(line));
    }
  }

  return {
    blocks,
    sourceFormat: "fanuc-0i",
    errors,
  };
}

function parseFanucLine(line: string, _lineNum: number): CNCBlock | null {
  const block: CNCBlock = {
    raw: line,
    gCodes: [],
    mCodes: [],
    axes: {},
    cycleParams: [],
    qParams: {},
    addresses: {},
  };

  // Strip comments: (comment) or ; or / (skip block)
  let commentMatch = line.match(/\(([^)]*)\)/);
  if (commentMatch) {
    block.comment = commentMatch[1].trim();
    line = line.replace(/\([^)]*\)/, "").trim();
  }

  const sciIdx = line.indexOf(";");
  if (sciIdx >= 0) {
    if (!block.comment) block.comment = line.slice(sciIdx + 1).trim();
    line = line.slice(0, sciIdx).trim();
  }

  // Skip block character
  if (line.startsWith("/")) {
    line = line.slice(1).trim();
  }

  if (!line) return block;

  // Program start: O0001 or :0001 or O10000
  if (/^O\d{4,5}\b/.test(line) || /^:\d{4,5}\b/.test(line)) {
    block.isProgramStart = true;
    return block;
  }

  // Program end
  if (/^M(02|30)\b/.test(line) || /^%$/.test(line)) {
    block.isProgramEnd = true;
    const m = line.match(/M(02|30)/);
    if (m) block.mCodes.push(`M${m[1]}`);
    return block;
  }

  const tokens = tokenizeLine(line);

  for (const token of tokens) {
    if (token.startsWith("N") && /^\d+$/.test(token.slice(1))) {
      block.lineNumber = parseInt(token.slice(1), 10);
    } else if (token.startsWith("G")) {
      block.gCodes.push(token);
    } else if (token.startsWith("M")) {
      block.mCodes.push(token);
    } else if (/^[XYZABCUVW]$/i.test(token[0]) && token.length > 1) {
      const axis = token[0].toUpperCase();
      const val = parseFloat(token.slice(1));
      if (!isNaN(val)) block.axes[axis] = val;
    } else if (token[0] === "I" && token.length > 1) {
      block.addresses["I"] = parseFloat(token.slice(1));
    } else if (token[0] === "J" && token.length > 1) {
      block.addresses["J"] = parseFloat(token.slice(1));
    } else if (token[0] === "K" && token.length > 1) {
      block.addresses["K"] = parseFloat(token.slice(1));
    } else if (token[0] === "R" && token.length > 1) {
      block.addresses["R"] = parseFloat(token.slice(1));
    } else if (token[0] === "F" && token.length > 1) {
      block.feed = parseFloat(token.slice(1));
    } else if (token[0] === "S" && token.length > 1) {
      block.spindleSpeed = parseFloat(token.slice(1));
    } else if (token[0] === "T" && token.length > 1) {
      block.toolNumber = parseInt(token.slice(1), 10);
    } else if (token[0] === "D" && token.length > 1) {
      block.addresses["D"] = parseFloat(token.slice(1));
    } else if (token[0] === "H" && token.length > 1) {
      block.addresses["H"] = parseFloat(token.slice(1));
    } else if (token[0] === "P" && token.length > 1) {
      block.addresses["P"] = parseFloat(token.slice(1));
    } else if (token[0] === "Q" && token.length > 1) {
      block.addresses["Q"] = parseFloat(token.slice(1));
    } else if (/^[A-Z]$/i.test(token[0]) && token.length > 1) {
      const addr = token[0].toUpperCase();
      const val = parseFloat(token.slice(1));
      block.addresses[addr] = isNaN(val) ? token.slice(1) : val;
    }
  }

  return block;
}

/**
 * Heidenhain TNC 640 parser
 * Heidenhain uses conversational "HEIDENHAIN" language, not standard G-code
 */
function parseHeidenhainTNC640(raw: string): CNCProgram {
  const lines = raw.split("\n");
  const blocks: CNCBlock[] = [];
  const errors: CNCProgram["errors"] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const block = parseHeidenhainLine(line, i + 1);
      if (block) blocks.push(block);
    } catch (e) {
      errors.push({
        line: i + 1,
        message: e instanceof Error ? e.message : "Failed to parse line",
        severity: "warning",
      });
      blocks.push({
        raw: line,
        gCodes: [],
        mCodes: [],
        axes: {},
        cycleParams: [],
        qParams: {},
        addresses: {},
      });
    }
  }

  return {
    blocks,
    sourceFormat: "heidenhain-tnc640",
    errors,
  };
}

function parseHeidenhainLine(line: string, _lineNum: number): CNCBlock | null {
  const block: CNCBlock = {
    raw: line,
    gCodes: [],
    mCodes: [],
    axes: {},
    cycleParams: [],
    qParams: {},
    addresses: {},
  };

  // Strip comments (text after ;)
  const sciIdx = line.indexOf(";");
  if (sciIdx >= 0) {
    block.comment = line.slice(sciIdx + 1).trim();
    line = line.slice(0, sciIdx).trim();
  }

  if (!line) return block;

  // Program start: BEGIN PGM 1 MM
  if (/^BEGIN\s+PGM/i.test(line)) {
    block.isProgramStart = true;
    block.heidenhainCommand = "BEGIN";
    return block;
  }

  // Program end: END PGM 1 MM
  if (/^END\s+PGM/i.test(line)) {
    block.isProgramEnd = true;
    block.heidenhainCommand = "END";
    return block;
  }

  // TOOL CALL 1 Z S5000
  const toolCallMatch = line.match(/^TOOL\s+CALL\s+(\d+)\s+Z\s+S(\d+)/i);
  if (toolCallMatch) {
    block.toolNumber = parseInt(toolCallMatch[1], 10);
    block.spindleSpeed = parseInt(toolCallMatch[2], 10);
    block.heidenhainCommand = "TOOL CALL";
    return block;
  }

  // TOOL DEF 1 L+10 R+5
  const toolDefMatch = line.match(/^TOOL\s+DEF\s+(\d+)/i);
  if (toolDefMatch) {
    block.toolNumber = parseInt(toolDefMatch[1], 10);
    block.heidenhainCommand = "TOOL DEF";
    return block;
  }

  // CYCL DEF 200 DRILLING
  const cyclDefMatch = line.match(/^CYCL\s+DEF\s+(\d+\.?\d*)\s+(.+)/i);
  if (cyclDefMatch) {
    block.cycle = cyclDefMatch[1];
    block.heidenhainCommand = "CYCL DEF";
    block.mCodes = [cyclDefMatch[2].trim()];
    return block;
  }

  // CYCL CALL
  if (/^CYCL\s+CALL/i.test(line)) {
    block.heidenhainCommand = "CYCL CALL";
    return block;
  }

  // LBL 1 / LBL CALL 1
  if (/^LBL\s+/i.test(line)) {
    block.heidenhainCommand = "LBL";
    return block;
  }

  // Q parameters: Q1 = 5, QL, QR, FN...
  const qParamMatch = line.match(/^Q(\d+)\s*=\s*([\d.-]+)/);
  if (qParamMatch) {
    block.qParams[`Q${qParamMatch[1]}`] = parseFloat(qParamMatch[2]);
    block.heidenhainCommand = "Q";
    return block;
  }

  // FN 0: Q5 = +50 (FN0: assignment)
  const fnMatch = line.match(/^FN\s*(\d+)\s*:\s*Q(\d+)\s*=\s*(.+)/i);
  if (fnMatch) {
    block.heidenhainCommand = `FN${fnMatch[1]}`;
    return block;
  }

  // L (linear move): L X+50 Y+25 Z-10 R0 F5000 M3
  const lMoveMatch = line.match(/^L\s+/i);
  if (lMoveMatch) {
    block.heidenhainCommand = "L";
    // Parse axis positions: X+50, Y+25, Z-10
    const axisRegex = /([XYZABCUV])([+-]\d+\.?\d*)/gi;
    let m: RegExpExecArray | null;
    while ((m = axisRegex.exec(line)) !== null) {
      block.axes[m[1].toUpperCase()] = parseFloat(m[2]);
    }
    const fMatch = line.match(/F(\d+)/i);
    if (fMatch) block.feed = parseFloat(fMatch[1]);
    const sMatch = line.match(/S(\d+)/i);
    if (sMatch) block.spindleSpeed = parseFloat(sMatch[1]);
    // M codes
    const mMatch = line.match(/M(\d+)/i);
    if (mMatch) block.mCodes.push(`M${mMatch[1]}`);
    return block;
  }

  // CC (circle center), CP (circular path), CR (circle by radius), CT (circle by tangent)
  if (/^(CC|CP|CR|CT)\s+/i.test(line)) {
    block.heidenhainCommand = line.split(/\s+/)[0].toUpperCase();
    return block;
  }

  // APPR / DEP (approach / departure)
  if (/^APPR\s+/i.test(line)) {
    block.heidenhainCommand = "APPR";
    return block;
  }
  if (/^DEP\s+/i.test(line)) {
    block.heidenhainCommand = "DEP";
    return block;
  }

  // RND / CHF (rounding / chamfer)
  if (/^RND\s+/i.test(line)) {
    block.heidenhainCommand = "RND";
    return block;
  }
  if (/^CHF\s+/i.test(line)) {
    block.heidenhainCommand = "CHF";
    return block;
  }

  // Miscellaneous: MIRROR, ROT, SCALE, TRAFO
  if (/^(MIRROR|ROT|SCALE|TRAFO)\s+/i.test(line)) {
    block.heidenhainCommand = line.split(/\s+/)[0].toUpperCase();
    return block;
  }

  // BLK FORM for blank definition
  if (/^BLK\s+FORM/i.test(line)) {
    block.heidenhainCommand = "BLK FORM";
    return block;
  }

  // M codes standalone
  const mMatch2 = line.match(/M(\d+)/i);
  if (mMatch2) {
    block.mCodes.push(`M${mMatch2[1]}`);
    return block;
  }

  // Plain text
  block.addresses["raw"] = line;
  return block;
}

/**
 * Heidenhain iTNC 530 — very similar to TNC 640
 */
function parseHeidenhainITNC530(raw: string): CNCProgram {
  return parseHeidenhainTNC640(raw);
}

/**
 * Parse a Mitsubishi M80 program string into blocks
 */
function parseMitsubishiM80(raw: string): CNCProgram {
  return parseFanucStyle(raw);
}

/**
 * Parse a Mitsubishi M70 program
 */
function parseMitsubishiM70(raw: string): CNCProgram {
  return parseFanucStyle(raw);
}

/**
 * Parse a Haas program (fanuc-style)
 */
function parseHaas(raw: string): CNCProgram {
  return parseFanucStyle(raw);
}

/**
 * Parse a Brother Speedio program (fanuc-style)
 */
function parseBrotherSpeedio(raw: string): CNCProgram {
  return parseFanucStyle(raw);
}

/**
 * Okuma OSP parser
 * Okuma uses standard G-code with some specific differences:
 * - CALL O### for subprograms
 * - M120 for part catcher
 * - Specific G-codes for the OSP control
 */
function parseOkumaOSP(raw: string): CNCProgram {
  const lines = raw.split("\n");
  const blocks: CNCBlock[] = [];
  const errors: CNCProgram["errors"] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const block = parseFanucLine(line, i + 1);
      // Okuma-specific: CALL O####
      if (block && /^CALL\s+O/i.test(line)) {
        block.addresses["CALL"] = line.replace(/^CALL\s+/i, "").trim();
      }
      if (block && /^CALL\s+O/i.test(line)) {
        block.addresses["CALL"] = line.replace(/^CALL\s+/i, "").trim();
      }
      if (block) blocks.push(block);
      else {
        // Okuma-specific: check for CALL, GOTO, etc
        if (/^CALL\s+O/i.test(line)) {
          blocks.push({ ...emptyBlock(line), mCodes: ["M98"], addresses: { CALL: line.replace(/^CALL\s+/i, "").trim() } });
        } else {
          blocks.push(emptyBlock(line));
        }
      }
    } catch (e) {
      errors.push({
        line: i + 1,
        message: e instanceof Error ? e.message : "Failed to parse line",
        severity: "warning",
      });
    }
  }

  return {
    blocks,
    sourceFormat: "okuma-osp",
    errors,
  };
}

/**
 * Mazak Mazatrol parser
 * Mazatrol is a conversational language — not standard G-code.
 * We parse what we can and mark the rest.
 */
function parseMazakMazatrol(raw: string): CNCProgram {
  const lines = raw.split("\n");
  const blocks: CNCBlock[] = [];
  const errors: CNCProgram["errors"] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const block: CNCBlock = emptyBlock(line);

      // Comments
      const sciIdx = line.indexOf(";");
      if (sciIdx >= 0) {
        block.comment = line.slice(sciIdx + 1).trim();
        line.slice(0, sciIdx).trim();
      }

      // Unit conversion (metric/imperial)
      if (/^G20\b/i.test(line) || /^G21\b/i.test(line)) {
        block.gCodes.push(line.slice(0, 3).toUpperCase());
        continue;
      }

      // Mazatrol specific: program section headers like {UNIT SYSTEM}
      if (line.startsWith("{")) {
        block.addresses["section"] = line;
        blocks.push(block);
        continue;
      }

      // Standard G-code lines in Mazatrol
      const tokens = tokenizeLine(line);
      for (const token of tokens) {
        if (token.startsWith("G")) block.gCodes.push(token);
        else if (token.startsWith("M")) block.mCodes.push(token);
        else if (token.startsWith("F")) block.feed = parseFloat(token.slice(1));
        else if (token.startsWith("S")) block.spindleSpeed = parseFloat(token.slice(1));
        else if (token.startsWith("T")) block.toolNumber = parseInt(token.slice(1), 10);
        else if (/^[XYZ]$/i.test(token[0]) && token.length > 1) {
          const axis = token[0].toUpperCase();
          const val = parseFloat(token.slice(1));
          if (!isNaN(val)) block.axes[axis] = val;
        }
      }

      blocks.push(block);
    } catch (e) {
      errors.push({
        line: i + 1,
        message: e instanceof Error ? e.message : "Failed to parse line",
        severity: "warning",
      });
    }
  }

  return {
    blocks,
    sourceFormat: "mazak-mazatrol",
    errors,
  };
}

/**
 * Mazak SmoothG — similar to Mazatrol
 */
function parseMazakSmooth(raw: string): CNCProgram {
  return parseMazakMazatrol(raw);
}

/**
 * Parse Mazak EIA/ISO (standard G-code mode on Mazak controls)
 * Mostly Fanuc-style, with Mazak-specific handling for:
 * - % headers without O-numbers
 * - Mazak-specific M-codes (M72, M73, etc.)
 * - PAL, PALLET, etc.
 */
function parseMazakEIA(raw: string): CNCProgram {
  const program = parseFanucStyle(raw);
  program.sourceFormat = "mazak-eia";
  return program;
}

/**
 * Fagor 8055 parser
 * ISO + conversational (similar to Heidenhain in some ways)
 */
function parseFagor8055(raw: string): CNCProgram {
  const lines = raw.split("\n");
  const blocks: CNCBlock[] = [];
  const errors: CNCProgram["errors"] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const block = parseFanucLine(line, i + 1);
      if (block) {
        // Fagor-specific: check for conversational commands
        if (/^(T1|T2|T3|T4|T5|T6|T7|T8|T9)\b/i.test(line) && !block.gCodes.length && !block.mCodes.length) {
          // Fagor conversational operation
          block.addresses["fagor-op"] = line;
        }
        blocks.push(block);
      }
    } catch (e) {
      errors.push({
        line: i + 1,
        message: e instanceof Error ? e.message : "Failed to parse line",
        severity: "warning",
      });
      blocks.push(emptyBlock(line));
    }
  }

  return {
    blocks,
    sourceFormat: "fagor-8055",
    errors,
  };
}

/**
 * Bosch Rexroth MTX parser
 * Siemens-style with Bosch-specific cycles
 */
function parseBoschMTX(raw: string): CNCProgram {
  const lines = raw.split("\n");
  const blocks: CNCBlock[] = [];
  const errors: CNCProgram["errors"] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const block = parseSiemensLine(line, i + 1);
      if (block) {
        // Bosch specific: MCALL, G801, etc.
        if (/^MCALL\b/i.test(line)) {
          block.siemensCycleCall = line;
          block.addresses["bosch"] = "MCALL";
        }
        blocks.push(block);
      }
    } catch (e) {
      errors.push({
        line: i + 1,
        message: e instanceof Error ? e.message : "Failed to parse line",
        severity: "warning",
      });
      blocks.push(emptyBlock(line));
    }
  }

  return {
    blocks,
    sourceFormat: "bosch-mtx",
    errors,
  };
}

function tokenizeLine(line: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      current += ch;
    } else if (inQuotes) {
      current += ch;
    } else if (/\s/.test(ch)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
    } else {
      current += ch;
    }
  }
  if (current) tokens.push(current);
  return tokens;
}

export function parseProgram(raw: string, format: ControllerFormat): CNCProgram {
  switch (format) {
    case "siemens-840d":
      return parseSiemens840d(raw);
    case "siemens-828d":
      return parseSiemens828d(raw);
    case "mitsubishi-m80":
      return parseMitsubishiM80(raw);
    case "mitsubishi-m70":
      return parseMitsubishiM70(raw);
    case "fanuc-0i":
    case "fanuc-31i":
      return parseFanucStyle(raw);
    case "heidenhain-tnc640":
      return parseHeidenhainTNC640(raw);
    case "heidenhain-itnc530":
      return parseHeidenhainITNC530(raw);
    case "mazak-mazatrol":
      return parseMazakMazatrol(raw);
    case "mazak-smooth":
      return parseMazakSmooth(raw);
    case "mazak-eia":
      return parseMazakEIA(raw);
    case "okuma-osp":
      return parseOkumaOSP(raw);
    case "haas":
      return parseHaas(raw);
    case "brother-speedio":
      return parseBrotherSpeedio(raw);
    case "fagor-8055":
      return parseFagor8055(raw);
    case "bosch-mtx":
      return parseBoschMTX(raw);
    default:
      // Fallback to Fanuc-style for unknown formats
      return parseFanucStyle(raw);
  }
}
