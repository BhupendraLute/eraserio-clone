'use client';

import type { Editor } from '@tiptap/react';
import { Button } from '@/components/ui/button';
import { Bold, Italic, Heading2, List, Code, GitBranch } from 'lucide-react';

interface DocToolbarProps {
  editor: Editor | null;
  onInsertDiagram: () => void;
}

export function DocToolbar({ editor, onInsertDiagram }: DocToolbarProps) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-1 border-b p-2">
      <Button
        variant={editor.isActive('bold') ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleBold().run()}
      >
        <Bold className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('italic') ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleItalic().run()}
      >
        <Italic className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('heading', { level: 2 }) ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        <Heading2 className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('bulletList') ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleBulletList().run()}
      >
        <List className="h-4 w-4" />
      </Button>
      <Button
        variant={editor.isActive('codeBlock') ? 'secondary' : 'ghost'}
        size="icon"
        onClick={() => editor.chain().focus().toggleCodeBlock().run()}
      >
        <Code className="h-4 w-4" />
      </Button>
      <div className="mx-1 h-5 w-px bg-border" />
      <Button variant="ghost" size="sm" onClick={onInsertDiagram}>
        <GitBranch className="mr-1 h-4 w-4" />
        Insert diagram
      </Button>
    </div>
  );
}