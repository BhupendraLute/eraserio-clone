'use client';

import React, { useRef, useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { oneDark } from '@codemirror/theme-one-dark';
import { javascript } from '@codemirror/lang-javascript';
import { EditorView } from '@codemirror/view';
import { EditorState } from '@codemirror/state';

interface CodeHighlighterProps {
  code: string;
  language?: string;
  fontSize?: number;
  readOnly?: boolean;
  textWrap?: boolean;
  onChange?: (value: string) => void;
}

export function HighlightedCode({
  code,
  fontSize = 16,
  readOnly = true,
  textWrap = true,
  onChange,
}: CodeHighlighterProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Capture wheel events in native DOM capture phase to scroll code block without canvas pan/zoom
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      e.stopPropagation();
    };

    el.addEventListener('wheel', handleWheel, { capture: true, passive: true });
    return () => {
      el.removeEventListener('wheel', handleWheel, { capture: true } as any);
    };
  }, []);

  const extensions = [
    javascript({ jsx: true, typescript: true }),
    ...(textWrap ? [EditorView.lineWrapping] : []),
    ...(readOnly ? [EditorState.readOnly.of(true)] : []),
    EditorView.theme({
      '&': {
        backgroundColor: 'transparent !important',
        height: '100% !important',
        maxHeight: '100% !important',
        display: 'flex !important',
        flexDirection: 'column !important',
      },
      '.cm-scroller': {
        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace',
        height: '100% !important',
        maxHeight: '100% !important',
        overflow: 'auto !important',
        flex: '1 1 0% !important',
      },
      '.cm-scroller::-webkit-scrollbar': {
        width: '6px',
        height: '6px',
      },
      '.cm-scroller::-webkit-scrollbar-track': {
        background: 'transparent',
      },
      '.cm-scroller::-webkit-scrollbar-thumb': {
        background: 'rgba(255, 255, 255, 0.25)',
        borderRadius: '3px',
      },
      '.cm-scroller::-webkit-scrollbar-thumb:hover': {
        background: 'rgba(255, 255, 255, 0.5)',
      },
      '.cm-content': {
        padding: '0 !important',
      },
      '.cm-line': {
        padding: '0 !important',
        lineHeight: '1.6',
      },
      '.cm-cursor, .cm-dropCursor': {
        borderLeftColor: '#38bdf8 !important',
        borderLeftWidth: '2.5px !important',
      },
      '.cm-selectionBackground, &.cm-focused .cm-selectionBackground, ::selection': {
        backgroundColor: 'rgba(56, 189, 248, 0.3) !important',
      },
      '&.cm-focused': {
        outline: 'none !important',
      },
      ...(readOnly
        ? {
            '.cm-content, .cm-line': {
              cursor: 'move !important',
              userSelect: 'none !important',
            },
          }
        : {
            '.cm-content, .cm-line': {
              cursor: 'text !important',
              userSelect: 'text !important',
            },
          }),
    }),
  ];

  return (
    <div
      ref={containerRef}
      className={`h-full w-full overflow-hidden text-slate-100 flex flex-col ${
        readOnly ? 'select-none cursor-move' : 'select-text cursor-text'
      }`}
    >
      <CodeMirror
        value={code || ''}
        height="100%"
        className="h-full w-full overflow-hidden flex-1"
        theme={oneDark}
        editable={!readOnly}
        readOnly={readOnly}
        onChange={onChange}
        extensions={extensions}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          highlightActiveLineGutter: false,
          dropCursor: true,
          allowMultipleSelections: true,
          indentOnInput: true,
        }}
        style={{ fontSize: `${fontSize}px` }}
      />
    </div>
  );
}
