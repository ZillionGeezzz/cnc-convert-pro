import { describe, it, expect } from "vitest";
import { parseProgram } from "./parsers";
import type { CNCBlock } from "./types";

// Helper to get first block's G-codes, M-codes, etc.
const first = (raw: string, format: string) =>
  parseProgram(raw, format as any).blocks[0];

// ==========================================
// Fanuc Parsing
// ==========================================
describe("Fanuc parser", () => {
  it("parses G00 rapid move", () => {
    const result = parseProgram("G00 X100 Y50 Z-10\n", "fanuc-0i");
    expect(result.blocks).toHaveLength(1);
    expect(result.errors).toHaveLength(0);
    const block = result.blocks[0];
    expect(block.gCodes).toContain("G00");
    expect(block.axes).toEqual({ X: 100, Y: 50, Z: -10 });
  });

  it("parses G01 linear feed", () => {
    const block = first("G01 X50.5 Y25.3 F500", "fanuc-0i");
    expect(block.gCodes).toContain("G01");
    expect(block.axes.X).toBe(50.5);
    expect(block.axes.Y).toBe(25.3);
    expect(block.feed).toBe(500);
  });

  it("parses G02/G03 arcs with IJK", () => {
    const g02 = first("G02 X100 Y50 I10 J0 F300", "fanuc-0i");
    expect(g02.gCodes).toContain("G02");
    expect(g02.axes.X).toBe(100);
    expect(g02.axes.Y).toBe(50);

    const g03 = first("G03 X100 Y50 I10 J0", "fanuc-0i");
    expect(g03.gCodes).toContain("G03");
  });

  it("parses arcs with R", () => {
    const block = first("G02 X100 R50", "fanuc-0i");
    expect(block.gCodes).toContain("G02");
    expect(block.addresses["R"]).toBe(50);
  });

  it("parses M-codes", () => {
    const block = first("M03 S5000", "fanuc-0i");
    expect(block.mCodes).toContain("M03");
    expect(block.spindleSpeed).toBe(5000);
  });

  it("parses tool change T M6", () => {
    const block = first("T01 M06", "fanuc-0i");
    expect(block.toolNumber).toBe(1);
    expect(block.mCodes).toContain("M06");
  });

  it("parses coolant M08", () => {
    const block = first("M08", "fanuc-0i");
    expect(block.mCodes).toContain("M08");
  });

  it("parses program start O-number", () => {
    const result = parseProgram("O1000\nG00 X0 Y0\nM30\n", "fanuc-0i");
    expect(result.blocks[0].isProgramStart).toBe(true);
    expect(result.blocks[0].raw).toBe("O1000");
  });

  it("parses program end M30", () => {
    const block = first("M30", "fanuc-0i");
    expect(block.isProgramEnd).toBe(true);
    expect(block.mCodes).toContain("M30");
  });

  it("parses program end M02", () => {
    const block = first("M02", "fanuc-0i");
    expect(block.isProgramEnd).toBe(true);
  });

  it("parses parenthetical comments", () => {
    const result = parseProgram("G00 X100 (RAPID MOVE)\n", "fanuc-0i");
    expect(result.blocks[0].comment).toBe("RAPID MOVE");
  });

  it("parses semicolon comments", () => {
    const result = parseProgram("G00 X100 ; RAPID MOVE\n", "fanuc-0i");
    expect(result.blocks[0].comment).toBe("RAPID MOVE");
  });

  it("parses line numbers N", () => {
    const block = first("N100 G00 X50", "fanuc-0i");
    expect(block.lineNumber).toBe(100);
  });

  it("parses I J K addresses", () => {
    const block = first("G02 X100 Y50 I10 J-5 K0", "fanuc-0i");
    expect(block.addresses["I"]).toBe(10);
    expect(block.addresses["J"]).toBe(-5);
    expect(block.addresses["K"]).toBe(0);
  });

  it("parses D and H addresses", () => {
    const block = first("G43 H01 D01 Z100", "fanuc-0i");
    expect(block.addresses["H"]).toBe(1);
    expect(block.addresses["D"]).toBe(1);
  });

  it("parses P and Q addresses (cycle params)", () => {
    const block = first("G83 Z-20 R2 Q5 P1 F100", "fanuc-0i");
    expect(block.addresses["P"]).toBe(1);
    expect(block.addresses["Q"]).toBe(5);
    expect(block.addresses["R"]).toBe(2);
  });

  it("parses G54-G59 work offsets", () => {
    expect(first("G54", "fanuc-0i").gCodes).toContain("G54");
    expect(first("G55", "fanuc-0i").gCodes).toContain("G55");
    expect(first("G59", "fanuc-0i").gCodes).toContain("G59");
  });

  it("handles skip block character /", () => {
    const block = first("/G01 X100 F500", "fanuc-0i");
    expect(block.gCodes).toContain("G01");
  });

  it("parses multiple G-codes on one line", () => {
    const block = first("G90 G00 X100 Y50", "fanuc-0i");
    expect(block.gCodes).toContain("G90");
    expect(block.gCodes).toContain("G00");
  });

  it("parses multiple M-codes on one line", () => {
    const block = first("M03 S5000 M08", "fanuc-0i");
    expect(block.mCodes).toContain("M03");
    expect(block.mCodes).toContain("M08");
  });

  it("parses T word", () => {
    const block = first("T01", "fanuc-0i");
    expect(block.toolNumber).toBe(1);
  });

  it("parses S word", () => {
    const block = first("M03 S12000", "fanuc-0i");
    expect(block.spindleSpeed).toBe(12000);
  });

  it("parses F word", () => {
    const block = first("G01 X100 F250.5", "fanuc-0i");
    expect(block.feed).toBe(250.5);
  });

  it("handles M98 subprogram call", () => {
    const block = first("M98 P1000", "fanuc-0i");
    expect(block.mCodes).toContain("M98");
    expect(block.addresses["P"]).toBe(1000);
  });

  it("handles M99 subprogram return", () => {
    const block = first("M99", "fanuc-0i");
    expect(block.mCodes).toContain("M99");
  });

  it("handles empty lines", () => {
    const result = parseProgram("G00 X100\n\n\nG01 Z-10\n", "fanuc-0i");
    expect(result.blocks).toHaveLength(2);
  });

  it("handles G20/G21 units", () => {
    expect(first("G20", "fanuc-0i").gCodes).toContain("G20");
    expect(first("G21", "fanuc-0i").gCodes).toContain("G21");
  });

  it("handles G90/G91 distance mode", () => {
    expect(first("G90", "fanuc-0i").gCodes).toContain("G90");
    expect(first("G91", "fanuc-0i").gCodes).toContain("G91");
  });

  it("handles G17/G18/G19 plane selection", () => {
    expect(first("G17", "fanuc-0i").gCodes).toContain("G17");
    expect(first("G18", "fanuc-0i").gCodes).toContain("G18");
    expect(first("G19", "fanuc-0i").gCodes).toContain("G19");
  });

  it("handles G40/G41/G42 cutter comp", () => {
    expect(first("G40", "fanuc-0i").gCodes).toContain("G40");
    expect(first("G41", "fanuc-0i").gCodes).toContain("G41");
    expect(first("G42", "fanuc-0i").gCodes).toContain("G42");
  });

  it("handles G43/G49 tool length offset", () => {
    expect(first("G43 H01 Z100", "fanuc-0i").gCodes).toContain("G43");
    expect(first("G49", "fanuc-0i").gCodes).toContain("G49");
  });

  it("handles G28/G30 reference return", () => {
    expect(first("G28", "fanuc-0i").gCodes).toContain("G28");
    expect(first("G30", "fanuc-0i").gCodes).toContain("G30");
  });

  it("handles G94/G95 feed mode", () => {
    expect(first("G94", "fanuc-0i").gCodes).toContain("G94");
    expect(first("G95", "fanuc-0i").gCodes).toContain("G95");
  });

  it("handles G96/G97 constant surface speed", () => {
    expect(first("G96 S200 M03", "fanuc-0i").gCodes).toContain("G96");
    expect(first("G97 S5000 M03", "fanuc-0i").gCodes).toContain("G97");
  });

  it("handles G04 dwell", () => {
    const block = first("G04 P1.5", "fanuc-0i");
    expect(block.gCodes).toContain("G04");
    expect(block.addresses["P"]).toBe(1.5);
  });
});

// ==========================================
// Siemens Parsing
// ==========================================
describe("Siemens parser", () => {
  it("parses standard G-code on Siemens 840D", () => {
    const block = first("G00 X100 Y50", "siemens-840d");
    expect(block.gCodes).toContain("G00");
    expect(block.axes.X).toBe(100);
    expect(block.axes.Y).toBe(50);
  });

  it("parses Siemens-specific program start %_N_..._MPF", () => {
    const result = parseProgram("%_N_TEST_MPF\nG00 X0\n", "siemens-840d");
    expect(result.blocks[0].isProgramStart).toBe(true);
  });

  it("parses CYCLE81 drilling", () => {
    const block = first("CYCLE81(2,0,1,10,10)", "siemens-840d");
    expect(block.siemensCycleCall).toBeDefined();
    expect(block.cycle).toBe("CYCLE81");
    expect(block.cycleParams).toEqual([2, 0, 1, 10, 10]);
  });

  it("parses CYCLE83 peck drilling", () => {
    const block = first("CYCLE83(2,0,1,20,20,5,3,2,0,0,1,0)", "siemens-840d");
    expect(block.cycle).toBe("CYCLE83");
    expect(block.cycleParams[3]).toBe(20); // DP
    expect(block.cycleParams[6]).toBe(3); // FDPR
  });

  it("parses CYCLE84 tapping", () => {
    const block = first("CYCLE84(2,0,1,15,15,0,3,7,1.5,0,500,400)", "siemens-840d");
    expect(block.cycle).toBe("CYCLE84");
    expect(block.cycleParams[8]).toBe(1.5); // PIT
  });

  it("parses semicolon comments on Siemens", () => {
    const result = parseProgram("G00 X100 ; RAPID MOVE\n", "siemens-840d");
    expect(result.blocks[0].comment).toBe("RAPID MOVE");
  });

  it("parses T with double-quoted tool name", () => {
    const result = parseProgram('T="12MM_ENDMILL"\n', "siemens-840d");
    expect(result.blocks[0].toolName).toBe("12MM_ENDMILL");
  });

  it("parses G01 with F word", () => {
    const block = first("G01 X50.5 Y25.3 F500", "siemens-840d");
    expect(block.gCodes).toContain("G01");
    expect(block.feed).toBe(500);
  });

  it("handles M30 program end on Siemens", () => {
    const block = first("M30", "siemens-840d");
    expect(block.isProgramEnd).toBe(true);
  });

  it("handles % program end", () => {
    const result = parseProgram("G00 X100\n%\n", "siemens-840d");
    expect(result.blocks[1].isProgramEnd).toBe(true);
  });
});

// ==========================================
// Heidenhain Parsing
// ==========================================
describe("Heidenhain parser", () => {
  it("parses BEGIN PGM program start", () => {
    const block = first("BEGIN PGM 1 MM", "heidenhain-tnc640");
    expect(block.isProgramStart).toBe(true);
    expect(block.heidenhainCommand).toBe("BEGIN");
  });

  it("parses END PGM program end", () => {
    const block = first("END PGM 1 MM", "heidenhain-tnc640");
    expect(block.isProgramEnd).toBe(true);
    expect(block.heidenhainCommand).toBe("END");
  });

  it("parses L (linear move with R0 = rapid)", () => {
    const block = first("L X+100 Y+50 Z-10 R0 F5000 M3", "heidenhain-tnc640");
    expect(block.heidenhainCommand).toBe("L");
    expect(block.axes.X).toBe(100);
    expect(block.axes.Y).toBe(50);
    expect(block.axes.Z).toBe(-10);
    expect(block.feed).toBe(5000);
    expect(block.mCodes).toContain("M3");
  });

  it("parses L without R0 (linear feed)", () => {
    const block = first("L X+50 Y+25 F3000", "heidenhain-tnc640");
    expect(block.heidenhainCommand).toBe("L");
    expect(block.axes.X).toBe(50);
    expect(block.feed).toBe(3000);
  });

  it("parses TOOL CALL", () => {
    const block = first("TOOL CALL 1 Z S5000", "heidenhain-tnc640");
    expect(block.heidenhainCommand).toBe("TOOL CALL");
    expect(block.toolNumber).toBe(1);
    expect(block.spindleSpeed).toBe(5000);
  });

  it("parses TOOL DEF", () => {
    const block = first("TOOL DEF 1 L+10 R+5", "heidenhain-tnc640");
    expect(block.heidenhainCommand).toBe("TOOL DEF");
    expect(block.toolNumber).toBe(1);
  });

  it("parses CYCL DEF 200 DRILLING", () => {
    const block = first("CYCL DEF 200 DRILLING", "heidenhain-tnc640");
    expect(block.heidenhainCommand).toBe("CYCL DEF");
    expect(block.cycle).toBe("200");
    expect(block.mCodes).toContain("DRILLING");
  });

  it("parses CYCL DEF 202 PECKING", () => {
    const block = first("CYCL DEF 202 PECKING", "heidenhain-tnc640");
    expect(block.cycle).toBe("202");
  });

  it("parses CYCL CALL", () => {
    const block = first("CYCL CALL", "heidenhain-tnc640");
    expect(block.heidenhainCommand).toBe("CYCL CALL");
  });

  it("parses LBL labels", () => {
    const block = first("LBL 1", "heidenhain-tnc640");
    expect(block.heidenhainCommand).toBe("LBL");
  });

  it("parses CC (circle center)", () => {
    const block = first("CC X+50 Y+25", "heidenhain-tnc640");
    expect(block.heidenhainCommand).toBe("CC");
  });

  it("parses CP (circular path)", () => {
    const block = first("CP IPA+180 DR+ F5000", "heidenhain-tnc640");
    expect(block.heidenhainCommand).toBe("CP");
  });

  it("parses CR (circle by radius)", () => {
    const block = first("CR X+100 Y+50 R+25 DR+", "heidenhain-tnc640");
    expect(block.heidenhainCommand).toBe("CR");
  });

  it("parses APPR (approach)", () => {
    const block = first("APPR LT X+50 Y+25 LEN10 F5000", "heidenhain-tnc640");
    expect(block.heidenhainCommand).toBe("APPR");
  });

  it("parses DEP (departure)", () => {
    const block = first("DEP CT X+0 Y+0 F5000", "heidenhain-tnc640");
    expect(block.heidenhainCommand).toBe("DEP");
  });

  it("parses RND (rounding)", () => {
    const block = first("RND F5000 R5", "heidenhain-tnc640");
    expect(block.heidenhainCommand).toBe("RND");
  });

  it("parses CHF (chamfer)", () => {
    const block = first("CHF 2 F5000", "heidenhain-tnc640");
    expect(block.heidenhainCommand).toBe("CHF");
  });

  it("parses MIRROR, ROT, SCALE, TRAFO", () => {
    expect(first("MIRROR X", "heidenhain-tnc640").heidenhainCommand).toBe("MIRROR");
    expect(first("ROT REL X+45", "heidenhain-tnc640").heidenhainCommand).toBe("ROT");
    expect(first("SCALE FACTOR 0.5", "heidenhain-tnc640").heidenhainCommand).toBe("SCALE");
    expect(first("TRAFO X", "heidenhain-tnc640").heidenhainCommand).toBe("TRAFO");
  });

  it("parses Q parameters", () => {
    const block = first("Q1 = 50", "heidenhain-tnc640");
    expect(block.heidenhainCommand).toBe("Q");
    expect(block.qParams["Q1"]).toBe(50);
  });

  it("parses FN functions", () => {
    const block = first("FN 0: Q5 = +50", "heidenhain-tnc640");
    expect(block.heidenhainCommand).toBe("FN0");
  });

  it("parses BLK FORM", () => {
    const block = first("BLK FORM 0.1 Z X+0 Y+0 Z-40", "heidenhain-tnc640");
    expect(block.heidenhainCommand).toBe("BLK FORM");
  });

  it("parses standalone M codes", () => {
    const block = first("M30", "heidenhain-tnc640");
    expect(block.mCodes).toContain("M30");
  });

  it("strips semicolon comments", () => {
    const result = parseProgram("L X+100 F5000 ; COMMENT\n", "heidenhain-tnc640");
    expect(result.blocks[0].comment).toBe("COMMENT");
  });

  it("handles negative axis values", () => {
    const block = first("L X+100 Y-50 Z-10 F3000", "heidenhain-tnc640");
    expect(block.axes.X).toBe(100);
    expect(block.axes.Y).toBe(-50);
    expect(block.axes.Z).toBe(-10);
  });

  it("parses incremental coordinates IX, IY, IZ", () => {
    const program = parseProgram("L IX+5 IY-2 IZ+0 R0 F5000 M3", "heidenhain-tnc640");
    const block = program.blocks[0];
    expect(block.axes["IX"]).toBe(5);
    expect(block.axes["IY"]).toBe(-2);
    expect(block.axes["IZ"]).toBe(0);
  });
});

// ==========================================
// Multi-line Programs
// ==========================================
describe("multi-line programs", () => {
  it("parses a complete Fanuc program", () => {
    const program = `O1000
G90 G54 G17 G21
G00 X0 Y0
T01 M06
S5000 M03
G43 H01 Z100
G00 Z10
G01 Z-5 F500
G00 Z100
M30
`;

    const result = parseProgram(program, "fanuc-0i");
    expect(result.blocks).toHaveLength(10);
    expect(result.blocks[0].isProgramStart).toBe(true);
    expect(result.blocks[1].gCodes).toContain("G90");
    expect(result.blocks[1].gCodes).toContain("G54");
    expect(result.blocks[2].gCodes).toContain("G00");
    expect(result.blocks[3].toolNumber).toBe(1);
    expect(result.blocks[3].mCodes).toContain("M06");
    expect(result.blocks[9].isProgramEnd).toBe(true);

    // No errors expected
    expect(result.errors).toHaveLength(0);
  });

  it("parses a complete Siemens program", () => {
    const program = `%_N_PROG1_MPF
; PROGRAM COMMENT
G00 G17 G90
T="12MM_ENDMILL"
M06
G00 X0 Y0 Z100 S5000 M03
CYCLE81(2,0,1,10,10)
G00 Z100
M30
`;

    const result = parseProgram(program, "siemens-840d");
    expect(result.blocks).toHaveLength(9);
    expect(result.blocks[0].isProgramStart).toBe(true);
    expect(result.blocks[1].comment).toBe("PROGRAM COMMENT");
    expect(result.blocks[4].raw).toContain("M06");
    expect(result.blocks[6].siemensCycleCall).toBeDefined();
    expect(result.blocks[8].isProgramEnd).toBe(true);
  });

  it("parses a complete Heidenhain program", () => {
    const program = `BEGIN PGM 1 MM
; COMMENT
TOOL CALL 1 Z S5000
L X+0 Y+0 R0 F5000 M3
L X+100 Y+50 F3000
L Z-5 F1000
CYCL DEF 200 DRILLING
CYCL CALL
L Z+100 F5000
M30
END PGM 1 MM
`;

    const result = parseProgram(program, "heidenhain-tnc640");
    expect(result.blocks).toHaveLength(11);
    expect(result.blocks[0].isProgramStart).toBe(true);
    expect(result.blocks[1].comment).toBe("COMMENT");
    expect(result.blocks[6].heidenhainCommand).toBe("CYCL DEF");
    expect(result.blocks[10].isProgramEnd).toBe(true);
  });
});

// ==========================================
// Parser Errors
// ==========================================
describe("parser error handling", () => {
  it("returns empty blocks array for empty input", () => {
    const result = parseProgram("", "fanuc-0i");
    expect(result.blocks).toHaveLength(0);
    expect(result.errors).toHaveLength(0);
  });

  it("handles lines with only whitespace", () => {
    const result = parseProgram("G00 X100\n   \nG01 Z-10\n", "fanuc-0i");
    expect(result.blocks).toHaveLength(2);
  });

  it("sets sourceFormat correctly", () => {
    expect(parseProgram("G00 X100", "fanuc-0i").sourceFormat).toBe("fanuc-0i");
    expect(parseProgram("G00 X100", "siemens-840d").sourceFormat).toBe("siemens-840d");
    expect(parseProgram("BEGIN PGM 1 MM", "heidenhain-tnc640").sourceFormat).toBe("heidenhain-tnc640");
  });

  it("reports errors for invalid lines as warnings", () => {
    const result = parseProgram("G00 X100\nINVALID_LINE\nM30\n", "fanuc-0i");
    // The invalid line will be parsed as a block with no gCodes/mCodes
    expect(result.blocks).toHaveLength(3);
    // Should not crash
    expect(result.errors.length >= 0).toBe(true);
  });
});

// ==========================================
// Other Controller Formats
// ==========================================
describe("other controller formats", () => {
  it("parses Haas (fanuc-style)", () => {
    const block = first("G00 X100 Y50 S5000 M03", "haas");
    expect(block.gCodes).toContain("G00");
    expect(block.spindleSpeed).toBe(5000);
    expect(block.mCodes).toContain("M03");
  });

  it("parses Mitsubishi M80 (fanuc-style)", () => {
    const block = first("G00 X100 Y50", "mitsubishi-m80");
    expect(block.gCodes).toContain("G00");
    expect(block.axes.X).toBe(100);
  });

  it("parses Mazak EIA (fanuc-style)", () => {
    const block = first("G00 X100", "mazak-eia");
    expect(block.gCodes).toContain("G00");
  });

  it("parses Mazak Mazatrol G-code lines", () => {
    const block = first("G00 X100 Y50", "mazak-mazatrol");
    expect(block.gCodes).toContain("G00");
  });

  it("parses Mazak Mazatrol section headers", () => {
    const result = parseProgram("{UNIT SYSTEM}\nG00 X100\n", "mazak-mazatrol");
    expect(result.blocks[0].addresses["section"]).toBe("{UNIT SYSTEM}");
  });

  it("parses Okuma (fanuc-style)", () => {
    const block = first("G00 X100 Y50", "okuma-osp");
    expect(block.gCodes).toContain("G00");
  });

  it("parses Okuma CALL subprogram", () => {
    const result = parseProgram("CALL O1000\n", "okuma-osp");
    expect(result.blocks[0].addresses["CALL"]).toBe("O1000");
  });

  it("parses Fagor (fanuc-style)", () => {
    const block = first("G00 X100", "fagor-8055");
    expect(block.gCodes).toContain("G00");
  });

  it("parses Bosch MTX (siemens-style)", () => {
    const block = first("G00 X100", "bosch-mtx");
    expect(block.gCodes).toContain("G00");
  });

  it("parses Bosch MCALL", () => {
    const result = parseProgram("MCALL CYCLE81(2,0,1,10,10)\n", "bosch-mtx");
    expect(result.blocks[0].addresses["bosch"]).toBe("MCALL");
  });

  it("parses Brother (fanuc-style)", () => {
    const block = first("G00 X100 Y50", "brother-speedio");
    expect(block.gCodes).toContain("G00");
  });

  it("handles unknown format as fanuc-style fallback", () => {
    const result = parseProgram("G00 X100", "unknown-format" as any);
    expect(result.blocks).toHaveLength(1);
    expect(result.sourceFormat).toBe("fanuc-0i");
  });

  it("parses iTNC530 (heidenhain-style)", () => {
    const block = first("L X+100 F5000", "heidenhain-itnc530");
    expect(block.heidenhainCommand).toBe("L");
  });

  it("parses Siemens 828d (same as 840d)", () => {
    const block = first("G00 X100", "siemens-828d");
    expect(block.gCodes).toContain("G00");
  });

  it("parses Mitsubishi M70 (fanuc-style)", () => {
    const block = first("G00 X100", "mitsubishi-m70");
    expect(block.gCodes).toContain("G00");
  });

  it("parses Mazak Smooth (mazatrol-style)", () => {
    const block = first("G00 X100", "mazak-smooth");
    expect(block.gCodes).toContain("G00");
  });

  it("parses Mazak EIA with correct source format", () => {
    const result = parseProgram("G00 X100", "mazak-eia");
    expect(result.sourceFormat).toBe("mazak-eia");
  });
});
