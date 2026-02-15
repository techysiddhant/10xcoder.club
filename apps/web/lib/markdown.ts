export type MarkdownSelection = {
  start: number;
  end: number;
};

export type MarkdownTransformResult = {
  value: string;
  selectionStart: number;
  selectionEnd: number;
};

/**
 * Convert markdown content into plain text for metadata/snippets.
 * Keeps readable text while stripping markdown formatting syntax.
 */
export function markdownToText(markdown: string, maxLength = 180): string {
  if (!markdown) return "";

  const plain = markdown
    // fenced code blocks -> keep code text
    .replace(/```[\w-]*\n([\s\S]*?)```/g, "$1")
    // inline code
    .replace(/`([^`]+)`/g, "$1")
    // images ![alt](url) -> alt
    .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, "$1")
    // markdown links [text](url) -> text
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, "$1")
    // headings/list markers/blockquote/task markers
    .replace(
      /^\s{0,3}(#{1,6}\s+|>\s+|-\s\[.\]\s+|-\s+|\*\s+|\+\s+|\d+\.\s+)/gm,
      "",
    )
    // bold/italic/strikethrough markers
    .replace(/(\*\*|__|\*|_|~~)/g, "")
    // html tags
    .replace(/<[^>]*>/g, "")
    // collapse whitespace/newlines
    .replace(/\s+/g, " ")
    .trim();

  if (plain.length <= maxLength) return plain;
  return `${plain.slice(0, maxLength).trimEnd()}...`;
}

function withSelectionFallback(selected: string, placeholder: string): string {
  return selected.length > 0 ? selected : placeholder;
}

export function wrapSelection(
  value: string,
  selection: MarkdownSelection,
  left: string,
  right: string,
  placeholder: string,
): MarkdownTransformResult {
  const before = value.slice(0, selection.start);
  const target = value.slice(selection.start, selection.end);
  const after = value.slice(selection.end);
  const content = withSelectionFallback(target, placeholder);
  const nextValue = `${before}${left}${content}${right}${after}`;
  const contentStart = before.length + left.length;
  const contentEnd = contentStart + content.length;
  return {
    value: nextValue,
    selectionStart: contentStart,
    selectionEnd: contentEnd,
  };
}

export function prefixSelectedLines(
  value: string,
  selection: MarkdownSelection,
  prefix: string,
): MarkdownTransformResult {
  const lineStart =
    value.lastIndexOf("\n", Math.max(0, selection.start - 1)) + 1;
  const nextLineBreak = value.indexOf("\n", selection.end);
  const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;

  const before = value.slice(0, lineStart);
  const block = value.slice(lineStart, lineEnd);
  const after = value.slice(lineEnd);

  const updated = block
    .split("\n")
    .map((line) => `${prefix}${line}`)
    .join("\n");

  const nextValue = `${before}${updated}${after}`;
  return {
    value: nextValue,
    selectionStart: lineStart + updated.length,
    selectionEnd: lineStart + updated.length,
  };
}

export function prefixOrderedListLines(
  value: string,
  selection: MarkdownSelection,
): MarkdownTransformResult {
  const lineStart =
    value.lastIndexOf("\n", Math.max(0, selection.start - 1)) + 1;
  const nextLineBreak = value.indexOf("\n", selection.end);
  const lineEnd = nextLineBreak === -1 ? value.length : nextLineBreak;

  const before = value.slice(0, lineStart);
  const block = value.slice(lineStart, lineEnd);
  const after = value.slice(lineEnd);

  const updated = block
    .split("\n")
    .map((line, index) => `${index + 1}. ${line}`)
    .join("\n");

  const nextValue = `${before}${updated}${after}`;
  return {
    value: nextValue,
    selectionStart: lineStart + updated.length,
    selectionEnd: lineStart + updated.length,
  };
}

export function insertTemplate(
  value: string,
  selection: MarkdownSelection,
  template: string,
): MarkdownTransformResult {
  const before = value.slice(0, selection.start);
  const after = value.slice(selection.end);
  const nextValue = `${before}${template}${after}`;
  return {
    value: nextValue,
    selectionStart: before.length + template.length,
    selectionEnd: before.length + template.length,
  };
}

export function insertCodeBlockTemplate(
  value: string,
  selection: MarkdownSelection,
): MarkdownTransformResult {
  const template = "\n```ts\n// code\n```\n";
  const before = value.slice(0, selection.start);
  const after = value.slice(selection.end);
  const nextValue = `${before}${template}${after}`;
  const cursorOffsetInsideTemplate = "\n```ts\n".length;
  const line = "// code";
  const selectionStart = before.length + cursorOffsetInsideTemplate;
  return {
    value: nextValue,
    selectionStart,
    selectionEnd: selectionStart + line.length,
  };
}
