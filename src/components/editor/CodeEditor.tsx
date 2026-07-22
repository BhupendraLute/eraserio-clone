'use client';

import CodeMirror from '@uiw/react-codemirror';
import { useDiagramStore } from '@/lib/store/diagram-store';
import { dslLanguage, dslHighlightExtension } from '@/lib/dsl/codemirror-language';
import { dslLinter } from '@/lib/dsl/codemirror-lint';

export function CodeEditor() {
  const source = useDiagramStore((s) => s.source);
  const setSource = useDiagramStore((s) => s.setSource);
  const setEditorView = useDiagramStore((s) => s.setEditorView);

  return (
    <div className="h-full w-full overflow-auto">
      <CodeMirror
        value={source}
        height="100%"
        onChange={(value) => setSource(value)}
        onCreateEditor={(view) => setEditorView(view)}
        extensions={[dslLanguage, dslHighlightExtension, dslLinter()]}
        basicSetup={{ lineNumbers: true, foldGutter: false }}
      />
    </div>
  );
}