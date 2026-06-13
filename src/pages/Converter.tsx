import { useState, useCallback, useMemo, useEffect } from "react";
import { motion } from "framer-motion";
import { MinimalHeader } from "@/components/MinimalHeader";
import { CNCEditor } from "@/components/CNCEditor";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { convertProgram } from "@/lib/cnc/converters";
import { CONTROLLERS, type ControllerFormat, type ConversionResult } from "@/lib/cnc/types";
import { ArrowLeftRight, RotateCcw, Download, Copy, Check, FileCode } from "lucide-react";
import { cn } from "@/lib/utils";

const DEFAULT_SIEMENS = `%_N_SAMPLE_PROGRAM_MPF
;Sample Siemens 840D program
G90 G71 G17 G40 G94
T1
S=8000 M3 M8
G0 X0 Y0
Z=2
G1 Z=-10 F=800
X=50 Y=30
G2 X=70 Y=50 I=10 J=10
G1 X=100
Z=2
G0 Z=100
CYCLE81(10,8,1,15)
X30 Y30
CYCLE83(10,8,1,30,0,5,3)
X50 Y50
G0 Z=100
M5 M9
M02
%`;

const DEFAULT_MITSUBISHI = `O0001
(Sample Mitsubishi M80 program)
G90 G21 G17 G40 G94
T01 M6
S8000 M3 M8
G00 X0 Y0
Z2.
G01 Z-10. F800.
X50. Y30.
G02 X70. Y50. I10. J10.
G01 X100.
Z2.
G00 Z100.
G81 X30. Y30. Z-15. R10. F800.
G80
G83 X50. Y50. Z-30. R10. Q3. F800.
G80
G00 Z100.
M5 M9
M02
%`;

export default function Converter() {
  const [sourceFormat, setSourceFormat] = useState<ControllerFormat>("siemens-840d");
  const [targetFormat, setTargetFormat] = useState<ControllerFormat>("mitsubishi-m80");
  const [input, setInput] = useState(DEFAULT_SIEMENS);
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [copied, setCopied] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  // Auto-convert on input change or format change
  useEffect(() => {
    if (!input.trim()) {
      setResult(null);
      return;
    }
    const conversionResult = convertProgram(input, { sourceFormat, targetFormat });
    setResult(conversionResult);
  }, [input, sourceFormat, targetFormat]);

  const swapFormats = useCallback(() => {
    setSourceFormat(targetFormat);
    setTargetFormat(sourceFormat);
    setInput(result?.output || "");
    setResult(null);
  }, [sourceFormat, targetFormat, result]);

  const handleCopy = useCallback(async () => {
    if (!result?.output) return;
    await navigator.clipboard.writeText(result.output);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [result]);

  const handleDownload = useCallback(() => {
    if (!result?.output) return;
    const ext = targetFormat === "siemens-840d" ? ".mpf" : ".nc";
    const blob = new Blob([result.output], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `converted${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  }, [result, targetFormat]);

  const handleReset = useCallback(() => {
    setInput(sourceFormat === "siemens-840d" ? DEFAULT_SIEMENS : DEFAULT_MITSUBISHI);
    setResult(null);
  }, [sourceFormat]);

  const sourceLabel = CONTROLLERS.find((c) => c.id === sourceFormat)?.name || sourceFormat;
  const targetLabel = CONTROLLERS.find((c) => c.id === targetFormat)?.name || targetFormat;

  return (
    <div className="min-h-screen bg-white dark:bg-zinc-950">
      <MinimalHeader />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Page header */}
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-medium text-foreground">CNC Converter</h1>
              <p className="text-sm text-muted-foreground mt-1">
                Convert CNC programs between controller formats in real time
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon-sm"
              onClick={handleReset}
              className="text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="w-4 h-4" />
            </Button>
          </div>
        </motion.div>

        {/* Format selection */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="flex items-center gap-4 mb-6"
        >
          <div className="flex-1 max-w-xs">
            <Label htmlFor="source-format" className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Source Format
            </Label>
            <Select
              value={sourceFormat}
              onValueChange={(v) => setSourceFormat(v as ControllerFormat)}
            >
              <SelectTrigger id="source-format" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTROLLERS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.manufacturer} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={swapFormats}
            className="mt-5 p-2 rounded-full border border-border hover:bg-zinc-50 dark:hover:bg-zinc-900 transition-colors"
            title="Swap formats"
          >
            <ArrowLeftRight className="w-4 h-4 text-muted-foreground" />
          </button>

          <div className="flex-1 max-w-xs">
            <Label htmlFor="target-format" className="text-xs font-medium text-muted-foreground mb-1.5 block">
              Target Format
            </Label>
            <Select
              value={targetFormat}
              onValueChange={(v) => setTargetFormat(v as ControllerFormat)}
            >
              <SelectTrigger id="target-format" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CONTROLLERS.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.manufacturer} — {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </motion.div>

        {/* Editor columns */}
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-4 lg:gap-6"
        >
          {/* Source editor */}
          <div>
            <CNCEditor
              value={input}
              onChange={setInput}
              label={sourceLabel}
              placeholder={`Paste or type ${sourceLabel} code...`}
              minHeight="500px"
              errorCount={result?.errors.length}
              warningCount={result?.warnings.length}
            />
          </div>

          {/* Target output */}
          <div>
            <CNCEditor
              value={result?.output || ""}
              readOnly
              label={targetLabel}
              placeholder="Converted code will appear here..."
              minHeight="500px"
              className="relative"
            />

            {/* Toolbar overlay for output */}
            {result && (
              <div className="flex items-center justify-end gap-2 mt-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 mr-1 text-green-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 mr-1" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="text-xs text-muted-foreground hover:text-foreground"
                >
                  <Download className="w-3.5 h-3.5 mr-1" />
                  Download
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {/* Status bar */}
        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center justify-between text-xs text-muted-foreground border-t border-border pt-4">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <FileCode className="w-3.5 h-3.5" />
                  {result.program.blocks.length} blocks
                </span>
                {result.errors.length > 0 && (
                  <button
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    className="text-destructive hover:underline cursor-pointer inline-flex items-center gap-1 transition-opacity"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block" />
                    {result.errors.length} error{result.errors.length !== 1 ? "s" : ""}
                  </button>
                )}
                {result.warnings.length > 0 && (
                  <button
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    className="text-amber-600 dark:text-amber-400 hover:underline cursor-pointer inline-flex items-center gap-1 transition-opacity"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                    {result.warnings.length} warning{result.warnings.length !== 1 ? "s" : ""}
                  </button>
                )}
              </div>
              <span className="text-zinc-400 dark:text-zinc-600">
                {result.success ? "Conversion complete" : "Check diagnostics below"}
              </span>
            </div>

            {/* Expandable diagnostic details */}
            {showDiagnostics && (result.warnings.length > 0 || result.errors.length > 0) && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 rounded-lg border border-border bg-zinc-50 dark:bg-zinc-900 overflow-hidden"
              >
                <div className="px-4 py-3 space-y-2 max-h-60 overflow-y-auto">
                  {result.errors.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-destructive mb-2 uppercase tracking-wider">
                        Errors
                      </h4>
                      {result.errors.map((err, idx) => (
                        <div
                          key={`err-${idx}`}
                          className="flex items-start gap-2 py-1.5 text-xs border-b border-border/50 last:border-0"
                        >
                          <span className="text-destructive shrink-0 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-destructive inline-block" />
                          </span>
                          <div>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              Line {err.line}
                            </span>
                            <p className="text-foreground/80 mt-0.5">{err.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.warnings.length > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-amber-600 dark:text-amber-400 mb-2 uppercase tracking-wider">
                        Warnings
                      </h4>
                      {result.warnings.map((warn, idx) => (
                        <div
                          key={`warn-${idx}`}
                          className="flex items-start gap-2 py-1.5 text-xs border-b border-border/50 last:border-0"
                        >
                          <span className="text-amber-500 shrink-0 mt-0.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                          </span>
                          <div>
                            {warn.line > 0 && (
                              <span className="font-mono text-[11px] text-muted-foreground">
                                Line {warn.line}
                              </span>
                            )}
                            <p className="text-foreground/80 mt-0.5">{warn.message}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </motion.div>
        )}
      </main>
    </div>
  );
}
