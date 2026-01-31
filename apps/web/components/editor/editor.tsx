"use client"; // this registers <Editor> as a Client Component
import "@blocknote/core/fonts/inter.css";
import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView } from "@blocknote/shadcn";
import "@blocknote/shadcn/style.css";
import { useTheme } from "next-themes";
import * as Select from "@workspace/ui/components/select-blocknote";
import * as Button from "@workspace/ui/components/button";
import * as DropdownMenu from "@workspace/ui/components/dropdown-menu-blocknote";
import * as Popover from "@workspace/ui/components/popover-blocknote";
import * as Badge from "@workspace/ui/components/badge";
import * as Card from "@workspace/ui/components/card";
import * as Input from "@workspace/ui/components/input";
import * as Label from "@workspace/ui/components/label";

// Create custom schema without image, video, audio, and file blocks
const { image, video, audio, file, ...allowedBlockSpecs } = defaultBlockSpecs;

const schema = BlockNoteSchema.create({
  blockSpecs: allowedBlockSpecs,
});

interface EditorProps {
  initialContent?: string;
  onChange?: (content: string) => void;
}

// Helper function to safely parse initial content
function parseInitialContent(content?: string) {
  if (!content) return undefined;

  try {
    // Try to parse as JSON (BlockNote format)
    return JSON.parse(content);
  } catch {
    // If it's not valid JSON, treat it as plain text and convert to BlockNote format
    return [
      {
        type: "paragraph",
        content: content,
      },
    ];
  }
}

export default function Editor({ initialContent, onChange }: EditorProps) {
  const { theme, systemTheme } = useTheme();

  // Determine the actual theme (resolve 'system' to actual theme)
  const currentTheme = theme === "system" ? systemTheme : theme;

  // Creates a new editor instance with custom schema
  const editor = useCreateBlockNote({
    schema,
    initialContent: parseInitialContent(initialContent),
  });

  // Handle content changes
  const handleChange = () => {
    if (onChange) {
      const blocks = editor.document;
      onChange(JSON.stringify(blocks));
    }
  };

  // Renders the editor instance using a React component.
  return (
    <BlockNoteView
      editor={editor}
      onChange={handleChange}
      theme={currentTheme === "dark" ? "dark" : "light"}
      shadCNComponents={{
        Select,
        Button,
        DropdownMenu,
        Popover,
        Badge,
        Card,
        Input,
        Label,
      }}
    />
  );
}
