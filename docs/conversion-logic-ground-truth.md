# CNC Conversion Logic Ground Truth

This note is implementation ground truth for the conversion patch. It is not
product copy. Keep the patch focused on parser -> IR -> transform -> generator
semantics, not general cleanup.

## Pipeline Invariants

- Parse controller syntax into `CNCBlock` without interpreting more than needed.
- Normalize each parsed block into semantic `NeutralIRBlock` values.
- Resolve source incremental positioning only when the target output is emitted
  in absolute coordinates; if G91 moves are resolved, the emitted target program
  must be in G90 before those resolved endpoint coordinates.
- Apply family-to-family semantic transformations only on IR blocks.
- Generate target syntax from IR; do not rely on raw source text except for
  intentionally preserved unknown/manual-review blocks.
- Preserve safety-critical uncertainty with warnings/audit entries instead of
  pretending approximate cycles are exact.
- Do not emit executable canned-cycle code for unknown or manual-review-needed
  cycles. Preserve them as target-format comments with manual-review text.
- Do not attach one physical axis move to multiple semantic IR blocks. Common
  compound lines such as `G00 G43 H01 Z100` should set rapid mode, then move Z
  once while activating length compensation.
- Preserve Siemens `DP` and `DPR` separately. `depth` may carry neutral
  machining magnitude for cross-family output, but Siemens regeneration must not
  invent `DP` when the source used `DPR`, or flip the sign of an explicit `DP`.
- For cross-family cycle output, derive executable final depth from the source
  coordinate frame. Raised work surfaces such as Heidenhain `Q203=+50,
  Q201=-12` are equivalent to absolute final Z/DP `38`, not `-12`.
- Position-bearing non-motion blocks, including `G43 ... Z` and canned cycles,
  update the resolver's current position before later incremental moves.
- Fanuc fixed-cycle return mode matters: `G98` returns to the initial plane,
  `G99` returns to the R plane. When no explicit mode has been seen, preserve
  Fanuc/Haas default return-to-initial-plane behavior.
- If a Fanuc/Haas cycle relies on default/G98 return-to-initial behavior but no
  initial Z plane is known, cross-family Siemens/Heidenhain generation must emit
  manual-review text instead of inventing the R plane as RTP/Q204.
- Do not invent tool-length offset registers. Missing `H`/`D` stays missing or
  becomes manual-review in targets that require an explicit offset; explicit
  zero (`H00`/`D0`) must remain zero.
- A preserved Heidenhain `CYCL DEF` plus following `CYCL CALL` must regenerate
  one call, not one inline call plus the original call.
- If a preserved Heidenhain cycle is downgraded to manual review, its following
  `CYCL CALL` must also be suppressed/commented so an unsupported cycle is not
  executed.
- When converting a known Fanuc `G98` initial plane to Heidenhain, preserve that
  second setup clearance as `Q204 = returnPlane - surface`.
- Heidenhain Cycle 200 output must include deterministic `Q202` plunging depth.
  If the source has no peck/plunge value, use the full absolute drilling depth.

## Controller Families in This Repo

- Fanuc-like: Fanuc, Mitsubishi, Mazak EIA, Brother.
- Haas-like: Haas syntax is Fanuc-like for the supported conversion subset.
- Siemens-like: Siemens; Bosch MTX uses Siemens-like generation here.
- Heidenhain: TNC conversational syntax.
- Mazatrol conversational conversion remains approximate and should not drive
  this patch unless it directly crosses the IR path.

## External Reference Facts

- Siemens drilling cycles use `CYCLE81(RTP, RFP, SDIS, DP, DPR)` and
  `CYCLE82(RTP, RFP, SDIS, DP, DPR, DTB)`. `RTP` is the retract plane, `RFP`
  is the reference plane, `SDIS` is safety clearance, `DP` is absolute final
  depth, `DPR` is depth relative to the reference plane, and `DTB` is dwell.
  Source: Siemens SINUMERIK Programming Manual, Cycles:
  https://support.industry.siemens.com/cs/attachments/109442374/PGZ_0406_en.pdf
- Siemens `CYCLE83` also starts with `RTP, RFP, SDIS, DP, DPR`; peck/deep-hole
  parameters follow. Treat unmodeled parameters as approximate/manual-review
  rather than exact.
- Siemens `CYCLE85` is documented as
  `CYCLE85(RTP, RFP, SDIS, DP, DPR, DTB, FFR, RFF)`.
- Haas documents the Fanuc-style supported subset: `G81` drill, `G82` spot
  drill/dwell with `P`, `G83` peck drill with incremental `Q`, `G84` right-hand
  tapping, `G85` basic boring, `G86` bore and stop, and `G89` bore/dwell/feed
  out. Source: Haas Mill G-codes:
  https://www.haascnc.com/service/online-operator-s-manuals/mill-operator-s-manual/mill---g-codes.html
- Heidenhain TNC 640 cycle parameters are multiline `Q` assignments following
  `CYCL DEF`. For Cycle 200 drilling, common parameters include `Q200` setup
  clearance, `Q201` depth, `Q206` feed, `Q202` plunging depth, `Q203` surface
  coordinate, `Q204` second setup clearance, and `Q211` dwell at depth. Source:
  HEIDENHAIN TNC 640 Programming of Machining Cycles:
  https://content.heidenhain.de/doku/tnc_guide/pdf_files/TNC640/34059x-11/zyklen_bearbeitung/1303406-20.pdf
- Modern Heidenhain TNC 640 examples show `CYCL DEF 206` for tapping and
  `CYCL DEF 207` for rigid tapping, with `Q239` as rigid tapping pitch.

## Risk Areas Covered By This Patch

- Multiple G-codes on one line expand into separate semantic IR blocks, so a
  line like `G90 G54 G17 G21` preserves every modal command.
- Multiple M-codes or mixed spindle/coolant/tool words on one line expand too.
  Example: `S5000 M03 M08` preserves spindle and coolant.
- Fanuc canned cycle output preserves actual cycle identity. A transformed
  Siemens `CYCLE82 -> G82` must not be generated as `G81` just because the IR
  type is `cycle-drill`.
- Siemens cycle normalization keeps documented parameter indices, especially
  dwell and relative-vs-absolute depth.
- Heidenhain `CYCL DEF` Q parameter lines belong to the active cycle definition
  instead of becoming separate macro lines.
- Heidenhain cycle number mapping is explicit about exact vs approximate vs
  manual-review conversions.
- Incremental resolution must not convert arc center offsets `I/J/K` as absolute
  endpoint axes. In Fanuc-style arc programming, `I/J/K` are normally center
  offsets from the arc start point.

## Patch Success Criteria

- Add regression tests that fail on the current code for the risk areas above.
- Keep generated output semantically conservative: exact where known, warnings
  and manual review comments where not.
- Existing parser/normalizer/transformer tests should still pass after being
  corrected to match documented cycle semantics.
- Final verification must include targeted tests and a subagent review of the
  diff focused only on conversion logic.
