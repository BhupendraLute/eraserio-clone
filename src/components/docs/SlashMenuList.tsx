'use client';

import React, { forwardRef, useEffect, useImperativeHandle, useState } from 'react';
import {
  GitBranch,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Code,
  Quote,
  Minus,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Editor, Range } from '@tiptap/core';

export interface CommandItem {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  command: (props: { editor: Editor; range: Range }) => void;
}

export const SLASH_COMMANDS: CommandItem[] = [
  {
    title: 'Diagram Embed',
    description: 'Insert an interactive diagram from your library.',
    icon: GitBranch,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().insertContent({ type: 'diagramEmbed', attrs: { diagramId: null } }).run();
    },
  },
  {
    title: 'Heading 1',
    description: 'Large section heading.',
    icon: Heading1,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().clearNodes().toggleHeading({ level: 1 }).run();
    },
  },
  {
    title: 'Heading 2',
    description: 'Medium section heading.',
    icon: Heading2,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().clearNodes().toggleHeading({ level: 2 }).run();
    },
  },
  {
    title: 'Heading 3',
    description: 'Small section heading.',
    icon: Heading3,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().clearNodes().toggleHeading({ level: 3 }).run();
    },
  },
  {
    title: 'Bullet List',
    description: 'Create a simple bulleted list.',
    icon: List,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().clearNodes().toggleBulletList().run();
    },
  },
  {
    title: 'Numbered List',
    description: 'Create a numbered list.',
    icon: ListOrdered,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().clearNodes().toggleOrderedList().run();
    },
  },
  {
    title: 'Code Block',
    description: 'Insert a code block.',
    icon: Code,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().clearNodes().toggleCodeBlock().run();
    },
  },
  {
    title: 'Quote',
    description: 'Capture a quote or blockquote.',
    icon: Quote,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().clearNodes().toggleBlockquote().run();
    },
  },
  {
    title: 'Divider',
    description: 'Separate content with a horizontal rule.',
    icon: Minus,
    command: ({ editor, range }) => {
      editor.chain().focus().deleteRange(range).run();
      editor.chain().focus().setHorizontalRule().run();
    },
  },
];

export interface SlashMenuListProps {
  items: CommandItem[];
  command: (item: CommandItem) => void;
}

export interface SlashMenuListRef {
  onKeyDown: (props: { event: KeyboardEvent }) => boolean;
}

export const SlashMenuList = forwardRef<SlashMenuListRef, SlashMenuListProps>(
  (props, ref) => {
    const [selectedIndex, setSelectedIndex] = useState(0);

    useEffect(() => {
      setSelectedIndex(0);
    }, [props.items]);

    const selectItem = (index: number) => {
      const item = props.items[index];
      if (item) {
        props.command(item);
      }
    };

    useImperativeHandle(ref, () => ({
      onKeyDown: ({ event }) => {
        if (event.key === 'ArrowUp') {
          setSelectedIndex((prev) => (prev <= 0 ? props.items.length - 1 : prev - 1));
          return true;
        }

        if (event.key === 'ArrowDown') {
          setSelectedIndex((prev) => (prev >= props.items.length - 1 ? 0 : prev + 1));
          return true;
        }

        if (event.key === 'Enter') {
          selectItem(selectedIndex);
          return true;
        }

        return false;
      },
    }));

    if (props.items.length === 0) {
      return (
        <div className="z-50 min-w-[180px] rounded-md border bg-popover p-2 text-xs text-muted-foreground shadow-md">
          No matching commands
        </div>
      );
    }

    return (
      <div className="z-50 flex max-h-64 w-64 flex-col overflow-auto rounded-md border bg-popover p-1 shadow-md">
        {props.items.map((item, index) => {
          const Icon = item.icon;
          return (
            <button
              key={item.title}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => selectItem(index)}
              className={cn(
                'flex items-center gap-2 rounded-sm px-2 py-1.5 text-left text-xs transition-colors hover:bg-accent hover:text-accent-foreground',
                index === selectedIndex && 'bg-accent text-accent-foreground'
              )}
            >
              <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded border bg-background">
                <Icon className="h-3.5 w-3.5" />
              </div>
              <div className="flex flex-col truncate">
                <span className="font-medium text-foreground">{item.title}</span>
                <span className="truncate text-[10px] text-muted-foreground">
                  {item.description}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    );
  }
);

SlashMenuList.displayName = 'SlashMenuList';
