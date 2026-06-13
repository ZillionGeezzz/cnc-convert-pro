import { CNCBlock, CNCProgram, ControllerFormat, CNCBlock as CNCBlockType } from "./types";

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
      // Still add raw block
      blocks.push({
        raw: line,
        gCodes: [],
        mCodes: [],
        axes: {},
        cycleParams: [],
        addresses: {},
      });
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
      // Check if it's a tool name in quotes
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
 * Parse a Mitsubishi M80 program string into blocks
 */
function parseMitsubishiM80(raw: string): CNCProgram {
  const lines = raw.split("\n");
  const blocks: CNCBlock[] = [];
  const errors: CNCProgram["errors"] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    try {
      const block = parseMitsubishiLine(line, i + 1);
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
        addresses: {},
      });
    }
  }

  return {
    blocks,
    sourceFormat: "mitsubishi-m80",
    errors,
  };
}

function parseMitsubishiLine(line: string, _lineNum: number): CNCBlock | null {
  const block: CNCBlock = {
    raw: line,
    gCodes: [],
    mCodes: [],
    axes: {},
    cycleParams: [],
    addresses: {},
  };

  // Strip comments: (comment) or ; comment
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

  if (!line) return block;

  // Program start: O0001 or O00001
  if (/^O\d{4,5}\b/.test(line)) {
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
    if (token.startsWith("G")) {
      block.gCodes.push(token);
    } else if (token.startsWith("M")) {
      block.mCodes.push(token);
    } else if (/^[XYZABC]$/i.test(token[0]) && token.length > 1) {
      const axis = token[0].toUpperCase();
      // Handle decimal without leading zero
      const valStr = token.slice(1);
      const val = parseFloat(valStr);
      if (!isNaN(val)) block.axes[axis] = val;
    } else if (token[0] === "F" && token.length > 1) {
      block.feed = parseFloat(token.slice(1));
    } else if (token[0] === "S" && token.length > 1) {
      block.spindleSpeed = parseFloat(token.slice(1));
    } else if (token[0] === "T" && token.length > 1) {
      block.toolNumber = parseInt(token.slice(1), 10);
      // Check if next token is M6
    } else if (/^[A-Z]$/i.test(token[0]) && token.length > 1) {
      const addr = token[0].toUpperCase();
      const val = parseFloat(token.slice(1));
      block.addresses[addr] = isNaN(val) ? token.slice(1) : val;
    }
  }

  // Check for tool change with M6 right after T
  if (block.toolNumber && tokens.some((t) => t.toUpperCase() === "M6")) {
    // Tool change - keep as is
  }

  return block;
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
    case "mitsubishi-m80":
      return parseMitsubishiM80(raw);
  }
}
