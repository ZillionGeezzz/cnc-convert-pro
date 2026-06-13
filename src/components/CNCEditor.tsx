import { useRef, useCallback, useEffect, useState, useMemo } from "react";
import { cn } from "@/lib/utils";
import { tokenizeLine, TOKEN_COLORS, type GCodeTokenType } from "@/lib/cnc/highlighter";

interface CNCEditorProps {
  value: string;
  onChange?: (value: string) => void;
  readOnly?: boolean;
  placeholder?: string;
  label?: string;
  minHeight?: string;
  className?: string;
  errorCount?: number;
  warningCount?: number;
}

/**
 * Renders a highlighted line from tokens.
 */
function HighlightedLine({ tokens }: { tokens: ReturnType<typeof tokenizeLine> }) {
  return (
    <>
      {tokens.map((token, idx) => {
        const colorClass = TOKEN_COLORS[token.type] || "";
        return (
          <span key={idx} className={colorClass}>
            {token.value}
          </span>
        );
      })}
    </>
  );
}

export function CNCEditor({
  value,
  onChange,
  readOnly = false,
  placeholder = "",
  label,
  minHeight = "300px",
  className,
  errorCount,
  warningCount,
}: CNCEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const highlightRef = useRef<HTMLDivElement>(null);
  const [lineCount, setLineCount] = useState(1);
  const [scrollTop, setScrollTop] = useState(0);

  const lines = useMemo(() => value.split("\n"), [value]);

  const tokenizedLines = useMemo(
    () => lines.map((line) => tokenizeLine(line)),
    [lines],
  );

  useEffect(() => {
    setLineCount(lines.length);
  }, [lines.length]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e.target.value);
    },
    [onChange],
  );

  const handleScroll = useCallback(() => {
    if (textareaRef.current) {
      setScrollTop(textareaRef.current.scrollTop);
    }
  }, []);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue = value.slice(0, start) + "  " + value.slice(end);
        onChange?.(newValue);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }
    },
    [value, onChange],
  );

  const lineNumberWidth = 10;

  return (
    <div className={cn("flex flex-col", className)}>
      {label && (
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs font-medium text-muted-foreground tracking-wider uppercase">
            {label}
          </span>
          {(errorCount !== undefined || warningCount !== undefined) && (
            <div className="flex items-center gap-3 text-xs">
              {errorCount !== undefined && errorCount > 0 && (
                <span className="text-destructive">{errorCount} error{errorCount !== 1 ? "s" : ""}</span>
              )}
              {warningCount !== undefined && warningCount > 0 && (
                <span className="text-amber-600 dark:text-amber-400">{warningCount} warning{warningCount !== 1 ? "s" : ""}</span>
              )}
            </div>
          )}
        </div>
      )}
      <div
        className={cn(
          "relative border border-border rounded-md overflow-hidden",
          "bg-white dark:bg-zinc-950",
          "font-mono text-sm leading-relaxed",
        )}
        style={{ minHeight }}
      >
        {/* Line numbers */}
        <div
          className="absolute left-0 top-0 bottom-0 w-10 bg-zinc-50 dark:bg-zinc-900 border-r border-border select-none pointer-events-none z-10"
          aria-hidden="true"
        >
          <div
            className="py-3 transition-transform"
            style={{ transform: `translateY(-${scrollTop}px)` }}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div
                key={i}
                className="text-right pr-3 text-[11px] leading-relaxed text-zinc-400 dark:text-zinc-600"
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Highlighting overlay */}
        <div
          ref={highlightRef}
          className="pointer-events-none absolute left-0 top-0 right-0 bottom-0 overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="py-3 pl-12 pr-4 whitespace-pre font-mono text-sm leading-relaxed"
            style={{ transform: `translateY(-${scrollTop}px)` }}
          >
            {tokenizedLines.map((tokens, idx) => (
              <div key={idx}>
                <HighlightedLine tokens={tokens} />
                {idx < tokenizedLines.length - 1 && "\n"}
              </div>
            ))}
          </div>
        </div>

        {/* Textarea (transparent) */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          onScroll={handleScroll}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
          className={cn(
            "relative z-5",
            "w-full h-full min-h-[inherit] resize-none",
            "pl-12 pr-4 py-3",
            "bg-transparent text-transparent caret-zinc-900 dark:caret-zinc-100",
            "placeholder:text-zinc-300 dark:placeholder:text-zinc-700",
            "border-0 outline-none focus:ring-0",
            "font-mono text-sm leading-relaxed",
            readOnly && "cursor-default",
          )}
          style={{ minHeight, color: "transparent" }}
        />
      </div>
    </div>
  );
}
