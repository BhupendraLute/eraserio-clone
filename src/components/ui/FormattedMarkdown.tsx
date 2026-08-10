import React from 'react';
import { cn } from '@/lib/utils';

export interface FormattedMarkdownProps {
  content: string;
  className?: string;
}

type InlineToken =
  | { type: 'bold'; text: string }
  | { type: 'italic'; text: string }
  | { type: 'code'; text: string }
  | { type: 'text'; text: string };

type BlockNode =
  | { type: 'heading'; level: number; text: string }
  | { type: 'codeblock'; lang: string; code: string }
  | { type: 'ul'; items: string[] }
  | { type: 'ol'; items: string[] }
  | { type: 'paragraph'; text: string };

/**
 * Sequential AST scanner for inline Markdown tokens (bold, italic, code, text).
 */
function tokenizeInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let cursor = 0;
  const len = text.length;

  while (cursor < len) {
    // Check for inline code `code`
    if (text[cursor] === '`') {
      const closing = text.indexOf('`', cursor + 1);
      if (closing !== -1) {
        tokens.push({ type: 'code', text: text.slice(cursor + 1, closing) });
        cursor = closing + 1;
        continue;
      }
    }

    // Check for bold **text** or __text__
    if (
      (text.startsWith('**', cursor) || text.startsWith('__', cursor)) &&
      cursor + 2 < len
    ) {
      const delim = text.slice(cursor, cursor + 2);
      const closing = text.indexOf(delim, cursor + 2);
      if (closing !== -1) {
        tokens.push({ type: 'bold', text: text.slice(cursor + 2, closing) });
        cursor = closing + 2;
        continue;
      }
    }

    // Check for italic *text* or _text_
    if ((text[cursor] === '*' || text[cursor] === '_') && cursor + 1 < len) {
      const delim = text[cursor];
      if (text[cursor + 1] !== delim) {
        const closing = text.indexOf(delim, cursor + 1);
        if (closing !== -1) {
          tokens.push({ type: 'italic', text: text.slice(cursor + 1, closing) });
          cursor = closing + 1;
          continue;
        }
      }
    }

    // Accumulate plain text until next potential formatting delimiter
    let nextPos = cursor + 1;
    while (
      nextPos < len &&
      text[nextPos] !== '`' &&
      text[nextPos] !== '*' &&
      text[nextPos] !== '_'
    ) {
      nextPos++;
    }
    tokens.push({ type: 'text', text: text.slice(cursor, nextPos) });
    cursor = nextPos;
  }

  return tokens;
}

/**
 * Parses raw Markdown string into structured Block AST Nodes.
 */
function parseBlocks(markdown: string): BlockNode[] {
  const lines = markdown.split(/\r?\n/);
  const blocks: BlockNode[] = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    if (!trimmed) {
      i++;
      continue;
    }

    // Code block ```lang ... ```
    if (trimmed.startsWith('```')) {
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < lines.length) i++; // skip closing ```
      blocks.push({ type: 'codeblock', lang, code: codeLines.join('\n') });
      continue;
    }

    // Headings #, ##, ###
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2],
      });
      i++;
      continue;
    }

    // Unordered list items (- or *)
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ')) {
      const items: string[] = [];
      while (
        i < lines.length &&
        (lines[i].trim().startsWith('- ') || lines[i].trim().startsWith('* '))
      ) {
        items.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push({ type: 'ul', items });
      continue;
    }

    // Ordered list items (1. , 2. )
    if (/^\d+\.\s+/.test(trimmed)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      blocks.push({ type: 'ol', items });
      continue;
    }

    // Regular Paragraph
    blocks.push({ type: 'paragraph', text: trimmed });
    i++;
  }

  return blocks;
}

/**
 * Renders AST InlineTokens into clean React elements.
 */
function renderInline(text: string): React.ReactNode[] {
  const tokens = tokenizeInline(text);
  return tokens.map((token, index) => {
    switch (token.type) {
      case 'bold':
        return (
          <strong key={index} className="font-bold text-foreground">
            {token.text}
          </strong>
        );
      case 'italic':
        return (
          <em key={index} className="italic text-foreground/90">
            {token.text}
          </em>
        );
      case 'code':
        return (
          <code
            key={index}
            className="rounded bg-muted/80 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-purple-600 dark:text-purple-300 border border-border/40"
          >
            {token.text}
          </code>
        );
      case 'text':
      default:
        return <span key={index}>{token.text}</span>;
    }
  });
}

/**
 * Reusable AST-driven Markdown React UI Component.
 */
export function FormattedMarkdown({ content, className }: FormattedMarkdownProps) {
  if (!content) return null;
  const blocks = parseBlocks(content);

  return (
    <div className={cn('space-y-1.5 text-[11px] leading-relaxed', className)}>
      {blocks.map((block, idx) => {
        switch (block.type) {
          case 'heading': {
            return (
              <h4 key={idx} className="font-bold text-foreground mt-2 mb-1 border-b border-border/40 pb-0.5">
                {renderInline(block.text)}
              </h4>
            );
          }
          case 'codeblock':
            return (
              <pre
                key={idx}
                className="my-1.5 overflow-x-auto rounded-lg border border-border/80 bg-slate-950 p-2.5 font-mono text-[10px] text-slate-100 selection:bg-blue-500/30"
              >
                <code>{block.code}</code>
              </pre>
            );
          case 'ul':
            return (
              <ul key={idx} className="my-1 space-y-1 pl-0.5">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-blue-500 font-bold shrink-0">•</span>
                    <div>{renderInline(item)}</div>
                  </li>
                ))}
              </ul>
            );
          case 'ol':
            return (
              <ol key={idx} className="my-1 space-y-1 pl-0.5">
                {block.items.map((item, itemIdx) => (
                  <li key={itemIdx} className="flex items-start gap-1.5">
                    <span className="mt-0.5 text-blue-500 font-bold shrink-0 text-[10px]">{itemIdx + 1}.</span>
                    <div>{renderInline(item)}</div>
                  </li>
                ))}
              </ol>
            );
          case 'paragraph':
          default:
            return <p key={idx}>{renderInline(block.text)}</p>;
        }
      })}
    </div>
  );
}
