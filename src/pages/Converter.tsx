import { useState, useCallback, useMemo } from "react";
import { motion } from "framer-motion";
import { MinimalHeader } from "@/components/MinimalHeader";
import { CNCEditor } from "@/components/CNCEditor";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { convertProgram } from "@/lib/cnc/converters";
import {
  CONTROLLERS,
  type ControllerFormat,
  type ConversionResult,
} from "@/lib/cnc/types";
import {
  AlertTriangle,
  ArrowLeftRight,
  Check,
  CircleCheck,
  Copy,
  Download,
  FileCode,
  RotateCcw,
} from "lucide-react";

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
  const [sourceFormat, setSourceFormat] =
    useState<ControllerFormat>("siemens-840d");
  const [targetFormat, setTargetFormat] =
    useState<ControllerFormat>("mitsubishi-m80");
  const [input, setInput] = useState(DEFAULT_SIEMENS);
  const [copied, setCopied] = useState(false);
  const [showDiagnostics, setShowDiagnostics] = useState(false);

  const result = useMemo<ConversionResult | null>(() => {
    if (!input.trim()) return null;
    return convertProgram(input, { sourceFormat, targetFormat });
  }, [input, sourceFormat, targetFormat]);

  const swapFormats = useCallback(() => {
    setSourceFormat(targetFormat);
    setTargetFormat(sourceFormat);
    setInput(result?.output || "");
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
    const defaultCode =
      sourceFormat === "siemens-840d" ? DEFAULT_SIEMENS : DEFAULT_MITSUBISHI;
    setInput(defaultCode);
  }, [sourceFormat]);

  const sourceLabel =
    CONTROLLERS.find((controller) => controller.id === sourceFormat)?.name ||
    sourceFormat;
  const targetLabel =
    CONTROLLERS.find((controller) => controller.id === targetFormat)?.name ||
    targetFormat;
  const editorMinHeight = "clamp(320px, 54dvh, 560px)";
  const issueCount =
    (result?.errors.length ?? 0) + (result?.warnings.length ?? 0);
  const diagnosticsOpen =
    showDiagnostics &&
    !!result &&
    (result.warnings.length > 0 || result.errors.length > 0);

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none absolute inset-0 -z-10 bg-[radial-gradient(circle_at_18%_0%,color-mix(in_oklch,var(--primary)_16%,transparent),transparent_34%),linear-gradient(180deg,color-mix(in_oklch,var(--muted)_60%,transparent),transparent_32rem)]" />
      <MinimalHeader />

      <main className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-6 lg:px-8 lg:py-8">
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-4 sm:mb-6"
        >
          <div className="flex flex-col gap-3 sm:gap-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
                CNC Converter
              </h1>
              <p className="mt-1.5 text-sm leading-6 text-muted-foreground">
                Convert controller programs in real time, then review the audit
                trail before the code hits the floor.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {result && (
                <>
                  <Badge
                    variant={result.success ? "default" : "destructive"}
                    className="gap-1.5"
                  >
                    {result.success ? (
                      <CircleCheck data-icon />
                    ) : (
                      <AlertTriangle data-icon />
                    )}
                    {result.success ? "Converted" : "Needs review"}
                  </Badge>
                  <Badge variant="outline" className="gap-1.5 bg-card">
                    <FileCode data-icon />
                    {result.program.blocks.length} blocks
                  </Badge>
                  {issueCount > 0 && (
                    <Badge
                      variant="outline"
                      className="bg-card text-muted-foreground"
                    >
                      {issueCount} issue{issueCount !== 1 ? "s" : ""}
                    </Badge>
                  )}
                </>
              )}
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
                className="gap-1.5 bg-card"
              >
                <RotateCcw data-icon="inline-start" />
                Reset sample
              </Button>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.3, delay: 0.1 }}
          className="mb-4 rounded-xl border border-border bg-card/95 p-3 shadow-sm ring-1 ring-foreground/[0.03] sm:mb-5 sm:p-4"
        >
          <div className="grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] md:items-end">
            <div className="min-w-0">
              <Label
                htmlFor="source-format"
                className="mb-1.5 block text-xs font-medium text-foreground/70"
              >
                Source Format
              </Label>
              <Select
                value={sourceFormat}
                onValueChange={(value) =>
                  setSourceFormat(value as ControllerFormat)
                }
              >
                <SelectTrigger
                  id="source-format"
                  className="w-full border-border/80 bg-background/95 shadow-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTROLLERS.map((controller) => (
                    <SelectItem key={controller.id} value={controller.id}>
                      {controller.manufacturer} - {controller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={swapFormats}
              className="mx-auto bg-background/95 shadow-xs"
              title="Swap formats"
              aria-label="Swap source and target formats"
            >
              <ArrowLeftRight data-icon />
            </Button>

            <div className="min-w-0">
              <Label
                htmlFor="target-format"
                className="mb-1.5 block text-xs font-medium text-foreground/70"
              >
                Target Format
              </Label>
              <Select
                value={targetFormat}
                onValueChange={(value) =>
                  setTargetFormat(value as ControllerFormat)
                }
              >
                <SelectTrigger
                  id="target-format"
                  className="w-full border-border/80 bg-background/95 shadow-xs"
                >
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CONTROLLERS.map((controller) => (
                    <SelectItem key={controller.id} value={controller.id}>
                      {controller.manufacturer} - {controller.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.2 }}
          className="grid grid-cols-1 gap-4 sm:gap-5 lg:grid-cols-2"
        >
          <div>
            <CNCEditor
              value={input}
              onChange={setInput}
              label={sourceLabel}
              placeholder={`Paste or type ${sourceLabel} code...`}
              minHeight={editorMinHeight}
              errorCount={result?.errors.length}
              warningCount={result?.warnings.length}
            />
          </div>

          <div>
            <CNCEditor
              value={result?.output || ""}
              readOnly
              label={targetLabel}
              placeholder="Converted code will appear here..."
              minHeight={editorMinHeight}
            />

            {result && (
              <div className="mt-3 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleCopy}
                  className="bg-card text-xs"
                >
                  {copied ? (
                    <Check data-icon="inline-start" className="text-primary" />
                  ) : (
                    <Copy data-icon="inline-start" />
                  )}
                  {copied ? "Copied" : "Copy"}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleDownload}
                  className="bg-card text-xs"
                >
                  <Download data-icon="inline-start" />
                  Download
                </Button>
              </div>
            )}
          </div>
        </motion.div>

        {result && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="mt-5"
          >
            <div className="flex flex-col gap-3 rounded-xl border border-border bg-card/90 px-4 py-3 text-xs text-muted-foreground shadow-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-wrap items-center gap-3">
                <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
                  <FileCode className="size-3.5" />
                  {result.program.blocks.length} blocks
                </span>
                {result.errors.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-destructive transition-colors hover:bg-destructive/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                    aria-expanded={diagnosticsOpen}
                    aria-controls="conversion-diagnostics"
                  >
                    <AlertTriangle className="size-3.5" />
                    {result.errors.length} error
                    {result.errors.length !== 1 ? "s" : ""}
                  </button>
                )}
                {result.warnings.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setShowDiagnostics(!showDiagnostics)}
                    className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-amber-700 transition-colors hover:bg-amber-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50 dark:text-amber-300"
                    aria-expanded={diagnosticsOpen}
                    aria-controls="conversion-diagnostics"
                  >
                    <AlertTriangle className="size-3.5" />
                    {result.warnings.length} warning
                    {result.warnings.length !== 1 ? "s" : ""}
                  </button>
                )}
              </div>
              <span className="text-muted-foreground">
                {result.success
                  ? "Conversion complete"
                  : "Check diagnostics below"}
              </span>
            </div>

            {diagnosticsOpen && (
              <motion.div
                id="conversion-diagnostics"
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.2 }}
                className="mt-3 overflow-hidden rounded-xl border border-border bg-card shadow-sm"
              >
                <div className="flex max-h-60 flex-col gap-4 overflow-y-auto px-4 py-3">
                  {result.errors.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold text-destructive">
                        Errors
                      </h4>
                      {result.errors.map((error, index) => (
                        <div
                          key={`err-${index}`}
                          className="flex items-start gap-2 border-b border-border/50 py-1.5 text-xs last:border-0"
                        >
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-destructive" />
                          <div>
                            <span className="font-mono text-[11px] text-muted-foreground">
                              Line {error.line}
                            </span>
                            <p className="mt-0.5 text-foreground/80">
                              {error.message}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {result.warnings.length > 0 && (
                    <div>
                      <h4 className="mb-2 text-xs font-semibold text-amber-700 dark:text-amber-300">
                        Warnings
                      </h4>
                      {result.warnings.map((warning, index) => (
                        <div
                          key={`warn-${index}`}
                          className="flex items-start gap-2 border-b border-border/50 py-1.5 text-xs last:border-0"
                        >
                          <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
                          <div>
                            {warning.line > 0 && (
                              <span className="font-mono text-[11px] text-muted-foreground">
                                Line {warning.line}
                              </span>
                            )}
                            <p className="mt-0.5 text-foreground/80">
                              {warning.message}
                            </p>
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
