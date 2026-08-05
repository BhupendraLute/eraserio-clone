'use client';

import { useEffect } from 'react';
import CodeMirror from '@uiw/react-codemirror';
import { useTheme } from 'next-themes';
import { useDiagramStore } from '@/lib/store/diagram-store';
import { useDiagramRegistry } from '@/lib/store/diagram-registry';
import { dslLanguage, dslHighlightExtension } from '@/lib/dsl/codemirror-language';
import { dslLinter } from '@/lib/dsl/codemirror-lint';

export function CodeEditor() {
  const { resolvedTheme } = useTheme();
  const source = useDiagramStore((s) => s.source);
  const setSource = useDiagramStore((s) => s.setSource);
  const setEditorView = useDiagramStore((s) => s.setEditorView);

  const initialize = useDiagramRegistry((s) => s.initialize);
  const activeDiagramId = useDiagramRegistry((s) => s.activeDiagramId);
  const updateRegistrySource = useDiagramRegistry((s) => s.updateSource);

  // Deferred initialization to avoid hydration mismatch with Date.now()/Math.random()
  useEffect(() => {
    initialize();
  }, [initialize]);

  const handleChange = (value: string) => {
    setSource(value);
    if (activeDiagramId) {
      updateRegistrySource(activeDiagramId, value);
    }
  };

  return (
    <div className="h-full w-full overflow-auto bg-background text-foreground [scrollbar-width:thin] [&::-webkit-scrollbar]:w-[2px] [&::-webkit-scrollbar]:h-[2px] [&::-webkit-scrollbar-thumb]:bg-muted-foreground/40 [&::-webkit-scrollbar-button]:hidden [&::-webkit-scrollbar-button]:w-0 [&::-webkit-scrollbar-button]:h-0 [&_.cm-scroller]:[scrollbar-width:thin] [&_.cm-scroller]::-webkit-scrollbar:w-[2px] [&_.cm-scroller]::-webkit-scrollbar:h-[2px] [&_.cm-scroller]::-webkit-scrollbar-button:hidden [&_.cm-scroller]::-webkit-scrollbar-button:w-0 [&_.cm-scroller]::-webkit-scrollbar-button:h-0 [&_.cm-scroller]::-webkit-scrollbar-thumb:bg-muted-foreground/40">
      <CodeMirror
        value={source}
        height="100%"
        theme={resolvedTheme === 'dark' ? 'dark' : 'light'}
        onChange={handleChange}
        onCreateEditor={(view) => setEditorView(view)}
        extensions={[dslLanguage, dslHighlightExtension, dslLinter()]}
        basicSetup={{ lineNumbers: true, foldGutter: false }}
      />
    </div>
  );
}