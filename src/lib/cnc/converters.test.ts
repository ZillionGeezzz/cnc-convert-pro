import { describe, expect, it } from "vitest";
import { convertProgram } from "./converters";

describe("convertProgram end-to-end conversion semantics", () => {
  function executableLines(output: string): string[] {
    return output
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => line && !line.startsWith(";") && !line.startsWith("("));
  }

  it("preserves same-line modal, tool, spindle, and coolant commands", () => {
    const result = convertProgram(
      `O1000
G90 G54 G17 G21
T01 M06
S5000 M03 M08
M30`,
      { sourceFormat: "fanuc-0i", targetFormat: "siemens-840d" },
    );

    expect(result.output).toContain("G90");
    expect(result.output).toContain("G54");
    expect(result.output).toContain("G17");
    expect(result.output).toContain("G71");
    expect(result.output).toContain("T1");
    expect(result.output).toContain("S=5000 M3");
    expect(result.output).toContain("M8");
  });

  it("converts Siemens CYCLE82 dwell to Fanuc/Haas G82 dwell", () => {
    const result = convertProgram(
      `%_N_TEST_MPF
CYCLE82(5,0,1,-12,0,0.75)
M30`,
      { sourceFormat: "siemens-840d", targetFormat: "haas" },
    );

    expect(result.output).toContain("G82");
    expect(result.output).toContain("Z-12.000");
    expect(result.output).toContain("R5.000");
    expect(result.output).toContain("P750");
    expect(result.output).not.toContain("CYCLE82(");
  });

  it("emits Fanuc G82 to Siemens CYCLE82 with dwell in the sixth slot", () => {
    const result = convertProgram(
      `G99 G82 X10 Y20 Z-12 R2 P0.75 F100`,
      { sourceFormat: "fanuc-0i", targetFormat: "siemens-840d" },
    );

    expect(result.output).toContain("X=10.0 Y=20.0 CYCLE82(");
    expect(result.output).toContain("2.000,0.000,2.000,-12.000,0.000,0.750");
    expect(result.output).not.toContain("Z=-12.0 CYCLE82");
  });

  it("aggregates Heidenhain multiline cycle parameters before Fanuc generation", () => {
    const result = convertProgram(
      `BEGIN PGM TEST MM
CYCL DEF 200 DRILLING
Q200=+2
Q201=-12
Q206=100
Q202=3
Q203=+0
Q204=5
Q211=0.4
CYCL CALL
END PGM TEST MM`,
      { sourceFormat: "heidenhain-tnc640", targetFormat: "fanuc-0i" },
    );

    expect(result.output).toContain("G81");
    expect(result.output).toContain("Z-12.000");
    expect(result.output).toContain("R2.000");
    expect(result.output).toContain("F100.000");
    expect(result.output).not.toContain("Q200=+2");
    expect(result.output).not.toContain("Z-10.000");
  });

  it("converts Heidenhain raised-surface drilling to absolute Fanuc Z/R coordinates", () => {
    const result = convertProgram(
      `BEGIN PGM TEST MM
CYCL DEF 200 DRILLING
Q200=+2
Q201=-12
Q206=100
Q203=+50
Q204=5
CYCL CALL
END PGM TEST MM`,
      { sourceFormat: "heidenhain-tnc640", targetFormat: "fanuc-0i" },
    );

    expect(result.output).toContain("G81");
    expect(result.output).toContain("Z38.000");
    expect(result.output).toContain("R52.000");
    expect(result.output).not.toContain("Z-12.000");
  });

  it("converts Heidenhain raised-surface drilling to Siemens absolute DP", () => {
    const result = convertProgram(
      `BEGIN PGM TEST MM
CYCL DEF 200 DRILLING
Q200=+2
Q201=-12
Q206=100
Q203=+50
Q204=5
CYCL CALL
END PGM TEST MM`,
      { sourceFormat: "heidenhain-tnc640", targetFormat: "siemens-840d" },
    );

    expect(result.output).toContain("CYCLE81(55.000,50.000,2.000,38.000,0.000)");
    expect(result.output).not.toContain("CYCLE81(55.000,50.000,2.000,-12.000");
  });

  it("resolves incremental arc endpoints without converting I/J offsets", () => {
    const result = convertProgram(
      `G90
G00 X10 Y10
G91
G02 X5 Y0 I2 J0
G02 X5 Y0 I2 J0`,
      { sourceFormat: "fanuc-0i", targetFormat: "siemens-840d" },
    );

    expect(result.output).toContain("G2 X=15.0 Y=10.0 I=2.0 J=0.0");
    expect(result.output).toContain("G2 X=20.0 Y=10.0 I=2.0 J=0.0");
    expect(result.output).not.toContain("I=12.0");
    expect(result.warnings.some((w) => w.message.includes("2 G91 incremental move"))).toBe(true);

    const lines = executableLines(result.output);
    const firstArcIndex = lines.findIndex((line) => /^G2\b/.test(line));
    const g90Index = lines.findIndex((line) => /^G90\b/.test(line));
    expect(g90Index).toBeGreaterThanOrEqual(0);
    expect(g90Index).toBeLessThan(firstArcIndex);
    expect(lines.some((line) => /^G91\b/.test(line))).toBe(false);
  });

  it("uses tool-length-comp target position as current Z for later incremental moves", () => {
    const result = convertProgram(
      `G90
G00 G43 H01 Z100
G91
G01 Z-10`,
      { sourceFormat: "fanuc-0i", targetFormat: "fanuc-0i" },
    );

    expect(result.output).toContain("G43 H01 Z100.000");
    expect(result.output).toContain("G01 Z90.000");
    expect(result.output).not.toContain("G01 Z-10.000");
  });

  it("resolves incremental canned-cycle coordinates when emitting absolute output", () => {
    const result = convertProgram(
      `G90
G00 Z100
G91
G81 X5 Z-10 R2 F80`,
      { sourceFormat: "fanuc-0i", targetFormat: "fanuc-0i" },
    );

    expect(result.output).toContain("G81 X5.000 Z90.000 R102.000 F80.000");
    expect(result.output).not.toContain("G81 X5.000 Z-10.000 R2.000");
  });

  it("uses cycle return plane for later incremental moves even when the cycle has no target axes", () => {
    const result = convertProgram(
      `%_N_TEST_MPF
CYCLE81(52,50,2,38,0)
G91
G1 Z-10
M30`,
      { sourceFormat: "siemens-840d", targetFormat: "siemens-840d" },
    );

    expect(result.output).toContain("CYCLE81(52.000,50.000,2.000,38.000,0.000)");
    expect(result.output).toContain("G1 Z=42.0");
    expect(result.output).not.toContain("Z=-10.0");
  });

  it("honors Fanuc G98 return-to-initial plane for later incremental moves", () => {
    const result = convertProgram(
      `G90
G00 Z100
G98 G81 Z-10 R2
G91
G01 Z-10`,
      { sourceFormat: "fanuc-0i", targetFormat: "fanuc-0i" },
    );

    expect(result.output).toContain("G98");
    expect(result.output).toContain("G81 Z-10.000 R2.000");
    expect(result.output).toContain("G01 Z90.000");
    expect(result.output).not.toContain("G01 Z-8.000");
  });

  it("preserves known Fanuc G98 initial plane as Heidenhain Q204", () => {
    const result = convertProgram(
      `G90
G00 Z100
G98 G81 Z-10 R2`,
      { sourceFormat: "fanuc-0i", targetFormat: "heidenhain-tnc640" },
    );

    expect(result.output).toContain("CYCL DEF 200 DRILLING");
    expect(result.output).toContain("Q204=100.000 ;2ND SET-UP CLEARANCE");
    expect(result.output).not.toContain("Q204=2.000 ;2ND SET-UP CLEARANCE");
  });

  it("emits Heidenhain Q202 for converted Fanuc G81 drilling", () => {
    const result = convertProgram(
      `G99 G81 Z-10 R2 F100`,
      { sourceFormat: "fanuc-0i", targetFormat: "heidenhain-tnc640" },
    );

    expect(result.output).toContain("CYCL DEF 200 DRILLING");
    expect(result.output).toContain("Q201=-10.000 ;DEPTH");
    expect(result.output).toContain("Q202=10.000 ;PLUNGING DEPTH");
  });

  it("emits Heidenhain Q202 and dwell for converted Fanuc G82 drilling", () => {
    const result = convertProgram(
      `G99 G82 Z-8 R2 P0.5 F100`,
      { sourceFormat: "fanuc-0i", targetFormat: "heidenhain-tnc640" },
    );

    expect(result.output).toContain("CYCL DEF 200 DRILLING");
    expect(result.output).toContain("Q201=-8.000 ;DEPTH");
    expect(result.output).toContain("Q202=8.000 ;PLUNGING DEPTH");
    expect(result.output).toContain("Q211=0.500 ;DWELL TIME AT DEPTH");
  });

  it("suppresses CYCL CALL after unsupported Heidenhain manual-review cycles", () => {
    const result = convertProgram(
      `BEGIN PGM TEST MM
CYCL DEF 204 BACK BORING
Q200=+2
Q201=-12
Q203=+0
Q204=5
CYCL CALL
END PGM TEST MM`,
      { sourceFormat: "heidenhain-tnc640", targetFormat: "heidenhain-tnc640" },
    );

    expect(result.output).toContain("MANUAL REVIEW: cycle not emitted CYCL DEF 204");
    expect(result.output).toContain("MANUAL REVIEW: suppressed CYCL CALL");
    expect(result.output).not.toMatch(/^CYCL CALL$/m);
  });

  it("suppresses every CYCL CALL for the active unsupported Heidenhain cycle", () => {
    const result = convertProgram(
      `BEGIN PGM TEST MM
CYCL DEF 204 BACK BORING
Q200=+2
Q201=-12
Q203=+0
Q204=5
CYCL CALL
CYCL CALL
END PGM TEST MM`,
      { sourceFormat: "heidenhain-tnc640", targetFormat: "heidenhain-tnc640" },
    );

    const suppressedCallCount = result.output.match(/MANUAL REVIEW: suppressed CYCL CALL/g)?.length ?? 0;
    expect(suppressedCallCount).toBe(2);
    expect(executableLines(result.output)).not.toContain("CYCL CALL");
  });

  it("honors Fanuc G99 return-to-R plane for later incremental moves", () => {
    const result = convertProgram(
      `G90
G00 Z100
G99 G81 Z-10 R2
G91
G01 Z-10`,
      { sourceFormat: "fanuc-0i", targetFormat: "fanuc-0i" },
    );

    expect(result.output).toContain("G99");
    expect(result.output).toContain("G01 Z-8.000");
    expect(result.output).not.toContain("G01 Z90.000");
  });

  it("does not use R plane as default Fanuc initial plane at cold start", () => {
    const result = convertProgram(
      `G81 Z-10 R2
G91
G01 Z-10`,
      { sourceFormat: "fanuc-0i", targetFormat: "fanuc-0i" },
    );

    expect(result.output).toContain("G81 Z-10.000 R2.000");
    expect(result.output).toContain("G01 Z-10.000");
    expect(result.output).not.toContain("G01 Z-8.000");
  });

  it("does not emit cold-start Fanuc default-return cycles as executable Siemens cycles", () => {
    const result = convertProgram(
      `G81 Z-10 R2`,
      { sourceFormat: "fanuc-0i", targetFormat: "siemens-840d" },
    );

    expect(result.output).toContain("MANUAL REVIEW: cycle not emitted CYCLE81");
    expect(result.output).not.toContain("CYCLE81(2.000,0.000,2.000,-10.000,0.000)");
  });

  it("does not emit cold-start Fanuc default-return cycles as executable Heidenhain cycles", () => {
    const result = convertProgram(
      `G81 Z-10 R2`,
      { sourceFormat: "fanuc-0i", targetFormat: "heidenhain-tnc640" },
    );

    expect(result.output).toContain("MANUAL REVIEW: cycle not emitted CYCL DEF 200");
    expect(result.output).not.toContain("CYCL DEF 200 DRILLING");
  });

  it("does not emit cold-start incremental Fanuc cycles as executable Siemens cycles", () => {
    const result = convertProgram(
      `G91
G81 Z-10 R2`,
      { sourceFormat: "fanuc-0i", targetFormat: "siemens-840d" },
    );

    expect(result.output).toContain("MANUAL REVIEW: cycle not emitted CYCLE81");
    expect(result.output).not.toContain("CYCLE81(");
  });

  it("does not emit cold-start incremental Fanuc cycles as executable Heidenhain cycles", () => {
    const result = convertProgram(
      `G91
G81 Z-10 R2`,
      { sourceFormat: "fanuc-0i", targetFormat: "heidenhain-tnc640" },
    );

    expect(result.output).toContain("MANUAL REVIEW: cycle not emitted CYCL DEF 200");
    expect(result.output).not.toContain("CYCL DEF 200 DRILLING");
  });

  it("does not turn unknown Siemens cycles into executable Fanuc cycles", () => {
    const result = convertProgram(
      `%_N_TEST_MPF
CYCLE99(1,2,3)
M30`,
      { sourceFormat: "siemens-840d", targetFormat: "haas" },
    );

    const lines = executableLines(result.output);
    expect(result.output).toContain("MANUAL REVIEW: cycle not emitted CYCLE99");
    expect(lines.some((line) => /^G8[1-9]\b/.test(line))).toBe(false);
  });

  it("does not turn manual-review Fanuc back boring into a Heidenhain back-boring cycle", () => {
    const result = convertProgram(
      `G87 X10 Y10 Z-20 R2 F80`,
      { sourceFormat: "fanuc-0i", targetFormat: "heidenhain-tnc640" },
    );

    expect(result.output).toContain("MANUAL REVIEW: cycle not emitted CYCL DEF 204");
    expect(result.output).not.toContain("CYCL DEF 204 BACK BORING");
  });

  it("keeps G43 target motion on the compensation block only", () => {
    const result = convertProgram(
      `G00 G43 H01 Z100`,
      { sourceFormat: "fanuc-0i", targetFormat: "fanuc-0i" },
    );

    const lines = executableLines(result.output);
    expect(lines).toContain("G00");
    expect(lines).toContain("G43 H01 Z100.000");
    expect(lines).not.toContain("G00 Z100.000");
  });

  it("comments Fanuc G43 for manual review when H offset is missing", () => {
    const result = convertProgram(
      `G43 Z100`,
      { sourceFormat: "fanuc-0i", targetFormat: "fanuc-0i" },
    );

    expect(result.output).toContain("MANUAL REVIEW: tool length offset missing: G43 Z100");
    expect(executableLines(result.output)).not.toContain("G43 Z100.000");
    expect(executableLines(result.output)).not.toContain("Z100.000");
    expect(result.output).not.toContain("H01");
  });

  it("preserves explicit Fanuc H00 on G43", () => {
    const result = convertProgram(
      `G43 H00 Z100`,
      { sourceFormat: "fanuc-0i", targetFormat: "fanuc-0i" },
    );

    expect(result.output).toContain("G43 H00 Z100.000");
    expect(result.output).not.toContain("H01");
  });

  it("does not duplicate preserved Heidenhain CYCL CALL blocks", () => {
    const result = convertProgram(
      `BEGIN PGM TEST MM
CYCL DEF 200 DRILLING
Q200=+2
Q201=-12
Q206=100
Q203=+0
Q204=5
CYCL CALL
END PGM TEST MM`,
      { sourceFormat: "heidenhain-tnc640", targetFormat: "heidenhain-tnc640" },
    );

    const callCount = result.output.match(/\bCYCL CALL\b/g)?.length ?? 0;
    expect(callCount).toBe(1);
  });

  it("preserves Siemens DPR-only cycles without inventing DP", () => {
    const result = convertProgram(
      `%_N_TEST_MPF
CYCLE82(5,0,1,0,-12,0.5)
M30`,
      { sourceFormat: "siemens-840d", targetFormat: "siemens-840d" },
    );

    expect(result.output).toContain("CYCLE82(5.000,0.000,1.000,0.000,-12.000,0.500)");
    expect(result.output).not.toContain("CYCLE82(5.000,0.000,1.000,-12.000,-12.000");
  });

  it("preserves Siemens absolute DP sign when regenerating Siemens", () => {
    const result = convertProgram(
      `%_N_TEST_MPF
CYCLE81(5,0,1,12,0)
M30`,
      { sourceFormat: "siemens-840d", targetFormat: "siemens-840d" },
    );

    expect(result.output).toContain("CYCLE81(5.000,0.000,1.000,12.000,0.000)");
    expect(result.output).not.toContain("CYCLE81(5.000,0.000,1.000,-12.000,0.000)");
  });

  it("converts Siemens absolute DP to neutral final Z for Fanuc output", () => {
    const result = convertProgram(
      `%_N_TEST_MPF
CYCLE81(52,50,2,38,0)
M30`,
      { sourceFormat: "siemens-840d", targetFormat: "fanuc-0i" },
    );

    expect(result.output).toContain("G81 Z38.000 R52.000");
    expect(result.output).not.toContain("Z-38.000");
  });
});
