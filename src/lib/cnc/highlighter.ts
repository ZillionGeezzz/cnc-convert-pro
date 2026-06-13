/**
 * G-code syntax highlighting tokenizer.
 * Parses G-code into colored tokens for rendering.
 */

export type GCodeTokenType =
  | "comment"
  | "g-code"
  | "m-code"
  | "axis"
  | "feed"
  | "speed"
  | "tool"
  | "number"
  | "function"
  | "operator"
  | "string"
  | "label"
  | "parameter"
  | "cycle"
  | "heidenhain-keyword"
  | "error"
  | "whitespace"
  | "plain";

export interface GCodeToken {
  type: GCodeTokenType;
  value: string;
  start: number;
  end: number;
}

/**
 * Color scheme for G-code tokens.
 * Uses CSS class names that map to Tailwind classes.
 */
export const TOKEN_COLORS: Record<GCodeTokenType, string> = {
  "g-code": "text-blue-600 dark:text-blue-400",         // G0, G01, G90
  "m-code": "text-purple-600 dark:text-purple-400",       // M3, M6, M30
  "axis": "text-amber-600 dark:text-amber-400",           // X, Y, Z, A, B, C
  "feed": "text-green-600 dark:text-green-400",           // F word
  "speed": "text-orange-600 dark:text-orange-400",        // S word
  "tool": "text-cyan-600 dark:text-cyan-400",             // T word
  "comment": "text-zinc-400 dark:text-zinc-600 italic",   // ; comments
  "number": "text-rose-500 dark:text-rose-400",           // numeric values
  "function": "text-sky-600 dark:text-sky-400",           // CYCLE81, etc
  "operator": "text-zinc-500 dark:text-zinc-400",         // =, -, +, /
  "string": "text-emerald-600 dark:text-emerald-400",     // "tool name"
  "label": "text-yellow-600 dark:text-yellow-400",         // line labels, N numbers
  "parameter": "text-indigo-500 dark:text-indigo-400",     // Q parameters
  "cycle": "text-violet-600 dark:text-violet-400",        // G81, G83, G84
  "heidenhain-keyword": "text-rose-600 dark:text-rose-400", // TOOL CALL, CYCL DEF, etc
  "error": "text-red-500 dark:text-red-400 bg-red-50 dark:bg-red-950/30",
  "whitespace": "",
  "plain": "text-foreground",
};

/**
 * Tokenize a line of G-code into colored tokens.
 */
export function tokenizeLine(line: string): GCodeToken[] {
  const tokens: GCodeToken[] = [];
  let i = 0;

  while (i < line.length) {
    // Whitespace
    if (/^\s/.test(line[i])) {
      const start = i;
      while (i < line.length && /\s/.test(line[i])) i++;
      tokens.push({ type: "whitespace", value: line.slice(start, i), start, end: i });
      continue;
    }

    // Comments: ; or (
    if (line[i] === ";" || line[i] === "(") {
      const start = i;
      if (line[i] === "(") {
        // Parenthetical comment
        const endParen = line.indexOf(")", i);
        i = endParen >= 0 ? endParen + 1 : line.length;
      } else {
        // Semicolon comment — rest of line
        i = line.length;
      }
      tokens.push({ type: "comment", value: line.slice(start, i), start, end: i });
      continue;
    }

    // Closing paren for comment (already handled above)
    if (line[i] === ")") {
      tokens.push({ type: "comment", value: ")", start: i, end: i + 1 });
      i++;
      continue;
    }

    // Strings
    if (line[i] === '"') {
      const start = i;
      i++;
      while (i < line.length && line[i] !== '"') i++;
      if (i < line.length) i++;
      tokens.push({ type: "string", value: line.slice(start, i), start, end: i });
      continue;
    }

    // G-codes: G0, G01, G00, G90, etc.
    if (line[i] === "G" || line[i] === "g") {
      const start = i;
      i++;
      while (i < line.length && /[\d.]/.test(line[i])) i++;
      const value = line.slice(start, i);
      const gNum = parseInt(value.slice(1), 10);
      // Check if it's a cycle (G81-G89)
      if (gNum >= 81 && gNum <= 89) {
        tokens.push({ type: "cycle", value, start, end: i });
      } else {
        tokens.push({ type: "g-code", value, start, end: i });
      }
      continue;
    }

    // M-codes: M0, M3, M30, etc.
    if (line[i] === "M" || line[i] === "m") {
      const start = i;
      i++;
      while (i < line.length && /[\d.]/.test(line[i])) i++;
      tokens.push({ type: "m-code", value: line.slice(start, i), start, end: i });
      continue;
    }

    // Axis words: X, Y, Z, A, B, C, U, V, W
    if (/^[XYZABCUVW]$/i.test(line[i])) {
      const start = i;
      const axisChar = line[i].toUpperCase();
      i++;
      // Check for = (Siemens format X=...)
      if (i < line.length && line[i] === "=") {
        i++; // consume =
        tokens.push({ type: "axis", value: `${axisChar}=`, start, end: i });
        // Collect the number
        const numStart = i;
        while (i < line.length && /[\d.-]/.test(line[i])) i++;
        if (i > numStart) {
          tokens.push({ type: "number", value: line.slice(numStart, i), start: numStart, end: i });
        }
      } else {
        // Standard format X...
        const numStart = i;
        while (i < line.length && /[\d.-]/.test(line[i])) i++;
        tokens.push({ type: "axis", value: axisChar, start, end: numStart || start + 1 });
        if (i > numStart) {
          tokens.push({ type: "number", value: line.slice(numStart, i), start: numStart, end: i });
        }
        // Re-adjust if no number followed (just axis letter)
        if (numStart === i) {
          tokens[tokens.length - 1] = { type: "axis", value: axisChar, start, end: start + 1 };
        }
      }
      continue;
    }

    // Feed word: F
    if (line[i] === "F" || line[i] === "f") {
      const start = i;
      i++;
      // Check for = (Siemens F=...)
      if (i < line.length && line[i] === "=") {
        i++;
        tokens.push({ type: "feed", value: "F=", start, end: i });
      } else {
        tokens.push({ type: "feed", value: "F", start, end: i });
      }
      const numStart = i;
      while (i < line.length && /[\d.]/.test(line[i])) i++;
      if (i > numStart) {
        tokens.push({ type: "number", value: line.slice(numStart, i), start: numStart, end: i });
      }
      continue;
    }

    // Speed word: S
    if (line[i] === "S" || line[i] === "s") {
      const start = i;
      i++;
      if (i < line.length && line[i] === "=") {
        i++;
        tokens.push({ type: "speed", value: "S=", start, end: i });
      } else {
        tokens.push({ type: "speed", value: "S", start, end: i });
      }
      const numStart = i;
      while (i < line.length && /[\d.]/.test(line[i])) i++;
      if (i > numStart) {
        tokens.push({ type: "number", value: line.slice(numStart, i), start: numStart, end: i });
      }
      continue;
    }

    // Tool word: T
    if (line[i] === "T" || line[i] === "t") {
      const start = i;
      i++;
      tokens.push({ type: "tool", value: "T", start, end: i });
      const numStart = i;
      while (i < line.length && /[\d.]/.test(line[i])) i++;
      if (i > numStart) {
        tokens.push({ type: "number", value: line.slice(numStart, i), start: numStart, end: i });
      }
      continue;
    }

    // D word (tool radius compensation)
    if (line[i] === "D" || line[i] === "d") {
      const start = i;
      i++;
      const numStart = i;
      while (i < line.length && /[\d.]/.test(line[i])) i++;
      if (i > numStart) {
        tokens.push({ type: "parameter", value: `D${line.slice(numStart, i)}`, start, end: i });
      } else {
        tokens.push({ type: "plain", value: "D", start, end: i });
      }
      continue;
    }

    // H word (tool length offset)
    if (line[i] === "H" || line[i] === "h") {
      const start = i;
      i++;
      const numStart = i;
      while (i < line.length && /[\d.]/.test(line[i])) i++;
      if (i > numStart) {
        tokens.push({ type: "parameter", value: `H${line.slice(numStart, i)}`, start, end: i });
      } else {
        tokens.push({ type: "plain", value: "H", start, end: i });
      }
      continue;
    }

    // Heidenhain keywords
    if (i < line.length - 3 && /^[A-Z]/.test(line[i])) {
      const start = i;
      while (i < line.length && /[A-Za-z]/.test(line[i])) i++;
      const word = line.slice(start, i);
      const heidenhainKeywords = [
        "TOOL", "CALL", "CYCL", "DEF", "LBL", "CALL", "FN", "QL",
        "Q", "TK", "TOOL", "DEF", "BLK", "FORM", "MULTIPLY",
        "END", "PGM", "BEGIN", "MM", "INCH", "PLANE", "MOVE",
        "L", "CC", "CP", "CR", "CT", "APPR", "DEP",
        "RND", "CHF", "MIRROR", "ROT", "SCALE", "TRAFO",
      ];
      if (heidenhainKeywords.includes(word)) {
        tokens.push({ type: "heidenhain-keyword", value: word, start, end: i });
      } else if (/^[A-Z]+$/.test(word)) {
        tokens.push({ type: "plain", value: word, start, end: i });
      } else {
        tokens.push({ type: "plain", value: word, start, end: i });
      }
      continue;
    }

    // Siemens cycles: CYCLE81, CYCLE83, etc.
    if (/^CYCLE/i.test(line.slice(i))) {
      const start = i;
      while (i < line.length && /[A-Za-z]/.test(line[i])) i++;
      tokens.push({ type: "function", value: line.slice(start, i), start, end: i });
      continue;
    }

    // Q parameters: Q1, Q100, QL1, etc.
    if (line[i] === "Q" || (i + 1 < line.length && line[i] === "Q" && /[A-Z]/.test(line[i]))) {
      const start = i;
      if (line[i] === "Q" && i + 1 < line.length && /[A-Z]/.test(line[i + 1])) {
        i++;
      }
      i++;
      while (i < line.length && /[\d]/.test(line[i])) i++;
      tokens.push({ type: "parameter", value: line.slice(start, i), start, end: i });
      continue;
    }

    // N numbers (line labels)
    if (line[i] === "N" || line[i] === "n") {
      const start = i;
      i++;
      while (i < line.length && /[\d]/.test(line[i])) i++;
      tokens.push({ type: "label", value: line.slice(start, i), start, end: i });
      continue;
    }

    // Operators
    if (/[=+\-*/%<>]/.test(line[i])) {
      const start = i;
      i++;
      tokens.push({ type: "operator", value: line.slice(start, i), start, end: i });
      continue;
    }

    // Numbers
    if (/[\d]/.test(line[i]) || (line[i] === "." && i + 1 < line.length && /\d/.test(line[i + 1]))) {
      const start = i;
      while (i < line.length && /[\d.eE+\-]/.test(line[i])) i++;
      tokens.push({ type: "number", value: line.slice(start, i), start, end: i });
      continue;
    }

    // Percent / program markers
    if (line[i] === "%" || line[i] === ":") {
      tokens.push({ type: "label", value: line[i], start: i, end: i + 1 });
      i++;
      continue;
    }

    // Plain text (anything else)
    const start = i;
    i++;
    tokens.push({ type: "plain", value: line[start], start, end: i });
  }

  return tokens;
}

/**
 * Tokenize a full program into an array of line-token arrays.
 */
export function tokenizeProgram(code: string): GCodeToken[][] {
  return code.split("\n").map((line) => tokenizeLine(line));
}

/**
 * Render tokens to HTML with inline styles/classes.
 */
export function tokensToHtml(tokens: GCodeToken[]): string {
  return tokens
    .map((token) => {
      const className = TOKEN_COLORS[token.type];
      if (!className) return escapeHtml(token.value);
      return `<span class="${className}">${escapeHtml(token.value)}</span>`;
    })
    .join("");
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
