"use client";

import { type ReactNode, useLayoutEffect, useRef, useState } from "react";
import {
  type MarkdownTransformResult,
  insertCodeBlockTemplate,
  prefixOrderedListLines,
  prefixSelectedLines,
  wrapSelection,
} from "@/lib/markdown";
import { MarkdownRenderer } from "./markdown-renderer";
import {
  Heading1,
  Heading2,
  Heading3,
  Bold,
  Italic,
  List,
  ListOrdered,
  ListTodo,
  Code,
  CodeXml,
  Link,
  TextQuote,
} from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@workspace/ui/components/tooltip";

interface PrMarkdownEditorProps {
  value?: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  disabled?: boolean;
}

type TabMode = "write" | "preview";
const MIN_EDITOR_HEIGHT = 260;
const MAX_EDITOR_HEIGHT = 520;
const DESCRIPTION_MAX_LENGTH = 5000;
const TOOL_BUTTON_CLASS =
  "h-8 w-8 inline-flex items-center justify-center rounded border border-border text-muted-foreground hover:text-foreground hover:bg-muted";

type ToolButtonProps = {
  label: string;
  onClick: () => void;
  icon: ReactNode;
};

function ToolButton({ label, onClick, icon }: ToolButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button type="button" className={TOOL_BUTTON_CLASS} onClick={onClick}>
          {icon}
        </button>
      </TooltipTrigger>
      <TooltipContent sideOffset={8}>{label}</TooltipContent>
    </Tooltip>
  );
}

export function PrMarkdownEditor({
  value = "",
  onChange,
  onBlur,
  placeholder,
  disabled,
}: PrMarkdownEditorProps) {
  const [mode, setMode] = useState<TabMode>("write");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const pendingSelectionRef = useRef<{ start: number; end: number } | null>(
    null,
  );
  const descriptionLength = value.length;
  const counterClassName =
    descriptionLength > DESCRIPTION_MAX_LENGTH
      ? "text-destructive"
      : descriptionLength >= 4500
        ? "text-amber-600 dark:text-amber-500"
        : "text-muted-foreground";

  const ensureCaretVisible = (
    element: HTMLTextAreaElement,
    caretPos: number,
  ) => {
    const beforeCaret = element.value.slice(0, caretPos);
    const lineIndex = beforeCaret.split("\n").length - 1;
    const computed = window.getComputedStyle(element);
    const lineHeight = Number.parseFloat(computed.lineHeight) || 24;
    const caretTop = lineIndex * lineHeight;
    const caretBottom = caretTop + lineHeight;
    const viewportTop = element.scrollTop;
    const viewportBottom = viewportTop + element.clientHeight;
    const padding = lineHeight * 1.5;

    if (caretBottom + padding > viewportBottom) {
      element.scrollTop = Math.max(
        caretBottom - element.clientHeight + padding,
        0,
      );
      return;
    }
    if (caretTop - padding < viewportTop) {
      element.scrollTop = Math.max(caretTop - padding, 0);
    }
  };

  const resizeTextarea = (element: HTMLTextAreaElement) => {
    element.style.height = "auto";
    const nextHeight = Math.max(
      MIN_EDITOR_HEIGHT,
      Math.min(element.scrollHeight, MAX_EDITOR_HEIGHT),
    );
    element.style.height = `${nextHeight}px`;
    element.style.overflowY =
      element.scrollHeight > MAX_EDITOR_HEIGHT ? "auto" : "hidden";
  };

  useLayoutEffect(() => {
    if (mode !== "write") return;
    const element = textareaRef.current;
    if (!element) return;

    resizeTextarea(element);

    const pending = pendingSelectionRef.current;
    if (!pending) return;
    const max = element.value.length;
    const nextStart = Math.max(0, Math.min(pending.start, max));
    const nextEnd = Math.max(nextStart, Math.min(pending.end, max));
    element.focus();
    element.setSelectionRange(nextStart, nextEnd);
    ensureCaretVisible(element, nextEnd);
    pendingSelectionRef.current = null;
  }, [value, mode]);

  const apply = (
    updater: (
      current: string,
      start: number,
      end: number,
    ) => MarkdownTransformResult,
  ) => {
    if (disabled) return;
    const element = textareaRef.current;
    if (!element) return;
    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? 0;
    const result = updater(value, start, end);
    pendingSelectionRef.current = {
      start: result.selectionStart,
      end: result.selectionEnd,
    };
    onChange(result.value);
  };

  const handleListEnter = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (event.key !== "Enter" || event.shiftKey || disabled) return;
    const element = textareaRef.current;
    if (!element) return;

    const start = element.selectionStart ?? 0;
    const end = element.selectionEnd ?? 0;
    if (start !== end) return;

    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const nextBreak = value.indexOf("\n", start);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    const line = value.slice(lineStart, lineEnd);

    const unordered = line.match(/^(\s*)([-*+])\s(?:\[(?: |x|X)\]\s)?(.*)$/);
    const ordered = line.match(/^(\s*)(\d+)\.\s(.*)$/);

    const replaceLine = (replacement: string) => {
      const nextValue =
        value.slice(0, lineStart) + replacement + value.slice(lineEnd);
      pendingSelectionRef.current = {
        start: lineStart + replacement.length,
        end: lineStart + replacement.length,
      };
      onChange(nextValue);
    };

    if (unordered) {
      const indent = unordered[1] ?? "";
      const bullet = unordered[2] ?? "-";
      const isTask = /\[(?: |x|X)\]\s/.test(line);
      const itemText = unordered[3] ?? "";
      const continuationPrefix = isTask ? `${bullet} [ ] ` : `${bullet} `;

      event.preventDefault();
      if (itemText.trim().length === 0) {
        // Empty item: exit list (GitHub-like)
        replaceLine(indent);
      } else {
        const insertion = `\n${indent}${continuationPrefix}`;
        pendingSelectionRef.current = {
          start: start + insertion.length,
          end: start + insertion.length,
        };
        onChange(value.slice(0, start) + insertion + value.slice(end));
      }
      return;
    }

    if (ordered) {
      const indent = ordered[1] ?? "";
      const currentNumber = Number.parseInt(ordered[2] ?? "1", 10);
      const itemText = ordered[3] ?? "";
      event.preventDefault();

      if (itemText.trim().length === 0) {
        // Empty ordered item: exit list
        replaceLine(indent);
      } else {
        const insertion = `\n${indent}${currentNumber + 1}. `;
        pendingSelectionRef.current = {
          start: start + insertion.length,
          end: start + insertion.length,
        };
        onChange(value.slice(0, start) + insertion + value.slice(end));
      }
    }
  };

  return (
    <div className="rounded-xl border border-border overflow-hidden">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-3 py-2 bg-muted/40">
        <div className="inline-flex items-center rounded-md border border-border bg-background p-1">
          <button
            type="button"
            onClick={() => setMode("write")}
            className={`px-3 py-1.5 cursor-pointer text-xs font-medium rounded ${
              mode === "write"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Write
          </button>
          <button
            type="button"
            onClick={() => setMode("preview")}
            className={`px-3 py-1.5 cursor-pointer text-xs font-medium rounded ${
              mode === "preview"
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            Preview
          </button>
        </div>
        {mode === "write" && (
          <div
            className={`text-xs font-medium tabular-nums transition-colors ${counterClassName}`}
          >
            {descriptionLength} / {DESCRIPTION_MAX_LENGTH}
          </div>
        )}
      </div>

      {mode === "write" && (
        <div className="border-b border-border px-3 py-2 bg-background/70 flex flex-wrap items-center gap-2">
          <ToolButton
            label="Heading 1"
            onClick={() =>
              apply((current, start, end) =>
                prefixSelectedLines(current, { start, end }, "# "),
              )
            }
            icon={<Heading1 className="h-4 w-4" />}
          />
          <ToolButton
            label="Heading 2"
            onClick={() =>
              apply((current, start, end) =>
                prefixSelectedLines(current, { start, end }, "## "),
              )
            }
            icon={<Heading2 className="h-4 w-4" />}
          />
          <ToolButton
            label="Heading 3"
            onClick={() =>
              apply((current, start, end) =>
                prefixSelectedLines(current, { start, end }, "### "),
              )
            }
            icon={<Heading3 className="h-4 w-4" />}
          />
          <span className="h-6 w-px bg-border mx-1" />
          <ToolButton
            label="Bold"
            onClick={() =>
              apply((current, start, end) =>
                wrapSelection(current, { start, end }, "**", "**", "bold text"),
              )
            }
            icon={<Bold className="h-4 w-4" />}
          />
          <ToolButton
            label="Italic"
            onClick={() =>
              apply((current, start, end) =>
                wrapSelection(current, { start, end }, "*", "*", "italic text"),
              )
            }
            icon={<Italic className="h-4 w-4" />}
          />
          <ToolButton
            label="Inline code"
            onClick={() =>
              apply((current, start, end) =>
                wrapSelection(current, { start, end }, "`", "`", "code"),
              )
            }
            icon={<Code className="h-4 w-4" />}
          />
          <ToolButton
            label="Link"
            onClick={() =>
              apply((current, start, end) =>
                wrapSelection(
                  current,
                  { start, end },
                  "[",
                  "](https://example.com)",
                  "link text",
                ),
              )
            }
            icon={<Link className="h-4 w-4" />}
          />
          <span className="h-6 w-px bg-border mx-1" />
          <ToolButton
            label="Ordered list"
            onClick={() =>
              apply((current, start, end) =>
                prefixOrderedListLines(current, { start, end }),
              )
            }
            icon={<ListOrdered className="h-4 w-4" />}
          />
          <ToolButton
            label="Unordered list"
            onClick={() =>
              apply((current, start, end) =>
                prefixSelectedLines(current, { start, end }, "- "),
              )
            }
            icon={<List className="h-4 w-4" />}
          />
          <ToolButton
            label="Task list"
            onClick={() =>
              apply((current, start, end) =>
                prefixSelectedLines(current, { start, end }, "- [ ] "),
              )
            }
            icon={<ListTodo className="h-4 w-4" />}
          />
          <span className="h-6 w-px bg-border mx-1" />
          <ToolButton
            label="Quote"
            onClick={() =>
              apply((current, start, end) =>
                prefixSelectedLines(current, { start, end }, "> "),
              )
            }
            icon={<TextQuote className="h-4 w-4" />}
          />
          <ToolButton
            label="Code block"
            onClick={() =>
              apply((current, start, end) =>
                insertCodeBlockTemplate(current, { start, end }),
              )
            }
            icon={<CodeXml className="h-4 w-4" />}
          />
        </div>
      )}

      {mode === "write" ? (
        <div className="p-3 bg-background">
          <textarea
            data-slot="textarea"
            ref={textareaRef}
            value={value}
            onChange={(e) => {
              onChange(e.target.value);
              requestAnimationFrame(() => {
                const current = textareaRef.current;
                if (!current) return;
                resizeTextarea(current);
                ensureCaretVisible(current, current.selectionEnd ?? 0);
              });
            }}
            onFocus={() => {
              const current = textareaRef.current;
              if (!current) return;
              ensureCaretVisible(current, current.selectionEnd ?? 0);
            }}
            onClick={() => {
              const current = textareaRef.current;
              if (!current) return;
              ensureCaretVisible(current, current.selectionEnd ?? 0);
            }}
            onKeyUp={() => {
              const current = textareaRef.current;
              if (!current) return;
              ensureCaretVisible(current, current.selectionEnd ?? 0);
            }}
            onKeyDown={handleListEnter}
            onBlur={onBlur}
            placeholder={
              placeholder ??
              "Write a description using Markdown (headings, lists, links, code)."
            }
            disabled={disabled}
            className="border-input bg-input/30 focus-visible:border-ring focus-visible:ring-ring/50 rounded-xl border text-base transition-colors focus-visible:ring-[3px] md:text-sm placeholder:text-muted-foreground min-h-[260px] w-full outline-none disabled:cursor-not-allowed disabled:opacity-50 shadow-none px-3 py-3"
          />
        </div>
      ) : (
        <div className="p-4 bg-background min-h-[260px] text-[15px] leading-7">
          {value.trim().length > 0 ? (
            <MarkdownRenderer content={value} />
          ) : (
            <p className="text-sm text-muted-foreground">
              Nothing to preview yet.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
