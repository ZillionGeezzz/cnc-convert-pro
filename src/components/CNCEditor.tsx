import { useRef, useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { tokenizeLine, TOKEN_COLORS } from "@/lib/cnc/highlighter";
import { Badge } from "@/components/ui/badge";

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
function HighlightedLine({
  tokens,
}: {
  tokens: ReturnType<typeof tokenizeLine>;
}) {
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
  const [scrollTop, setScrollTop] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);

  const lines = useMemo(() => value.split("\n"), [value]);

  const tokenizedLines = useMemo(
    () => lines.map((line) => tokenizeLine(line)),
    [lines],
  );
  const editorStyle = {
    minHeight,
    "--cnc-editor-line-height": "1.421875rem",
  } as React.CSSProperties;

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e.target.value);
    },
    [onChange],
  );

  const handleScroll = useCallback(() => {
    if (textareaRef.current) {
      setScrollTop(textareaRef.current.scrollTop);
      setScrollLeft(textareaRef.current.scrollLeft);
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

  return (
    <div className={cn("flex flex-col", className)}>
      {label && (
        <div className="flex items-center justify-between rounded-t-xl border border-border bg-card px-4 py-2.5 shadow-sm">
          <div className="flex min-w-0 items-center gap-2">
            <span className="truncate text-sm font-semibold tracking-tight text-foreground">
              {label}
            </span>
            {readOnly && (
              <Badge
                variant="outline"
                className="border-border/80 bg-muted/60 text-[10px] text-muted-foreground"
              >
                Read only
              </Badge>
            )}
          </div>
          {(errorCount !== undefined || warningCount !== undefined) && (
            <div className="flex shrink-0 items-center gap-2">
              {errorCount !== undefined && errorCount > 0 && (
                <Badge variant="destructive" className="text-[10px]">
                  {errorCount} error{errorCount !== 1 ? "s" : ""}
                </Badge>
              )}
              {warningCount !== undefined && warningCount > 0 && (
                <Badge
                  variant="outline"
                  className="border-amber-300/70 bg-amber-50 text-[10px] text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-300"
                >
                  {warningCount} warning{warningCount !== 1 ? "s" : ""}
                </Badge>
              )}
            </div>
          )}
        </div>
      )}
      <div
        className={cn(
          "relative overflow-hidden border border-border bg-card font-mono text-sm leading-relaxed shadow-sm",
          "focus-within:border-primary/45 focus-within:ring-4 focus-within:ring-primary/10",
          label ? "rounded-b-xl border-t-0" : "rounded-xl",
        )}
        style={editorStyle}
      >
        {/* Line numbers */}
        <div
          className="absolute bottom-0 left-0 top-0 z-10 w-11 select-none border-r border-border bg-muted/45 pointer-events-none"
          aria-hidden="true"
        >
          <div
            className="py-3"
            style={{ transform: `translateY(-${scrollTop}px)` }}
          >
            {Array.from({ length: lines.length }, (_, i) => (
              <div
                key={i}
                className="h-[var(--cnc-editor-line-height)] pr-3 text-right text-[11px] leading-[var(--cnc-editor-line-height)] text-muted-foreground/60"
              >
                {i + 1}
              </div>
            ))}
          </div>
        </div>

        {/* Highlighting overlay */}
        <div
          ref={highlightRef}
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden="true"
        >
          <div
            className="whitespace-pre py-3 pl-14 pr-4 font-mono text-sm leading-[var(--cnc-editor-line-height)]"
            style={{
              transform: `translate(${-scrollLeft}px, -${scrollTop}px)`,
            }}
          >
            {tokenizedLines.map((tokens, idx) => (
              <div
                key={idx}
                className="h-[var(--cnc-editor-line-height)] leading-[var(--cnc-editor-line-height)]"
              >
                <HighlightedLine tokens={tokens} />
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
          wrap="off"
          aria-label={label || "CNC program editor"}
          aria-readonly={readOnly}
          className={cn(
            "relative z-5",
            "w-full h-full min-h-[inherit] resize-none",
            "pl-14 pr-4 py-3",
            "bg-transparent text-transparent caret-zinc-900 dark:caret-zinc-100",
            "placeholder:text-muted-foreground/45",
            "border-0 outline-none focus:ring-0",
            "font-mono text-sm leading-[var(--cnc-editor-line-height)]",
            readOnly && "cursor-default",
          )}
          style={{ minHeight, color: "transparent" }}
        />
      </div>
    </div>
  );
}
