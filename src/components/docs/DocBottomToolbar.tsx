'use client';

import React from 'react';
import type { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import {
  Plus,
  Type,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Table,
  Link as LinkIcon,
  GitBranch,
} from 'lucide-react';

interface DocBottomToolbarProps {
  editor: Editor | null;
  onInsertDiagram: () => void;
}

export function DocBottomToolbar({ editor, onInsertDiagram }: DocBottomToolbarProps) {
  if (!editor) return null;

  return (
    <div className="absolute bottom-4 left-1/2 z-30 flex -translate-x-1/2 items-center gap-1 rounded-xl border bg-muted/90 p-1 shadow-lg backdrop-blur select-none">
      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground"
        title="Insert"
      >
        <Plus className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant={editor.isActive('heading') ? 'secondary' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        title="Heading"
      >
        <Type className="h-3.5 w-3.5" />
      </Button>

      <div className="h-4 w-px bg-border" />

      <Button
        variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet List"
      >
        <List className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant={editor.isActive('orderedList') ? 'secondary' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered List"
      >
        <ListOrdered className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground"
        title="Task List"
      >
        <CheckSquare className="h-3.5 w-3.5" />
      </Button>

      <div className="h-4 w-px bg-border" />

      <Button
        variant={editor.isActive('codeBlock') ? 'secondary' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
        title="Code Block"
      >
        <Code className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant={editor.isActive('blockquote') ? 'secondary' : 'ghost'}
        size="icon"
        className="h-7 w-7"
        onClick={() => editor.chain().focus().toggleBlockquote().run()}
        title="Quote"
      >
        <Quote className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground"
        title="Table"
      >
        <Table className="h-3.5 w-3.5" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-muted-foreground"
        title="Link"
      >
        <LinkIcon className="h-3.5 w-3.5" />
      </Button>

      <div className="h-4 w-px bg-border" />

      <Button
        variant="ghost"
        size="icon"
        className="h-7 w-7 text-primary"
        onClick={onInsertDiagram}
        title="Embed Diagram"
      >
        <GitBranch className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}
