"use client";

import type { Components } from "react-markdown";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

type MarkdownRendererProps = {
  content: string;
};

const markdownComponents: Components = {
  p: ({ children }) => <p className="my-0 mb-4 leading-7">{children}</p>,
  h1: ({ children }) => (
    <h1 className="mt-0 mb-4 text-2xl font-semibold leading-tight">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="mt-0 mb-3 text-xl font-semibold leading-tight">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="mt-0 mb-3 text-lg font-semibold leading-tight">
      {children}
    </h3>
  ),
  ul: ({ children }) => (
    <ul className="my-0 mb-4 list-disc pl-6">{children}</ul>
  ),
  ol: ({ children }) => (
    <ol className="my-0 mb-4 list-decimal pl-6">{children}</ol>
  ),
  li: ({ children }) => <li className="my-1 leading-7">{children}</li>,
  blockquote: ({ children }) => (
    <blockquote className="my-0 mb-4 border-l-4 border-border pl-4 text-muted-foreground">
      {children}
    </blockquote>
  ),
  code: ({ children, className }) => {
    const isBlock = /\blanguage-/.test(className ?? "");
    if (isBlock) {
      return (
        <code className="block rounded-md bg-muted p-3 text-sm overflow-x-auto whitespace-pre">
          {children}
        </code>
      );
    }
    return (
      <code className="rounded bg-muted px-1.5 py-0.5 text-sm">{children}</code>
    );
  },
  pre: ({ children }) => <pre className="my-0 mb-4">{children}</pre>,
  hr: () => <hr className="my-4 border-border" />,
  table: ({ children }) => (
    <div className="my-0 mb-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">{children}</table>
    </div>
  ),
  th: ({ children }) => (
    <th className="border border-border px-3 py-2 text-left font-medium">
      {children}
    </th>
  ),
  td: ({ children }) => (
    <td className="border border-border px-3 py-2">{children}</td>
  ),
  a: (props) => (
    <a
      {...props}
      className={`text-primary underline underline-offset-2 hover:opacity-80 ${props.className ?? ""}`}
      target="_blank"
      rel="noopener noreferrer"
    />
  ),
  img: () => null,
};

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
      {content}
    </ReactMarkdown>
  );
}
