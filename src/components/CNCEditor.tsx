import { useRef, useCallback, useEffect, useState } from "react";
import { cn } from "@/lib/utils";

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
  const [lineCount, setLineCount] = useState(1);

  useEffect(() => {
    const count = value ? value.split("\n").length : 1;
    setLineCount(count);
  }, [value]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e.target.value);
    },
    [onChange],
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
      if (e.key === "Tab") {
        e.preventDefault();
        const textarea = e.currentTarget;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const newValue =
          value.slice(0, start) + "  " + value.slice(end);
        onChange?.(newValue);
        // Restore cursor position after React re-render
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
          className="absolute left-0 top-0 bottom-0 w-10 bg-zinc-50 dark:bg-zinc-900 border-r border-border select-none pointer-events-none"
          aria-hidden="true"
        >
          <div className="py-3">
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

        {/* Textarea */}
        <textarea
          ref={textareaRef}
          value={value}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          readOnly={readOnly}
          placeholder={placeholder}
          spellCheck={false}
          className={cn(
            "w-full h-full min-h-[inherit] resize-none",
            "pl-12 pr-4 py-3",
            "bg-transparent text-zinc-900 dark:text-zinc-100",
            "placeholder:text-zinc-300 dark:placeholder:text-zinc-700",
            "border-0 outline-none focus:ring-0",
            "font-mono text-sm leading-relaxed",
            readOnly && "cursor-default",
          )}
          style={{ minHeight }}
        />
      </div>
    </div>
  );
}
