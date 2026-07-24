'use client';

import CodeMirror from '@uiw/react-codemirror';
import { useDiagramStore } from '@/lib/store/diagram-store';
import { useDiagramRegistry } from '@/lib/store/diagram-registry';
import { dslLanguage, dslHighlightExtension } from '@/lib/dsl/codemirror-language';
import { dslLinter } from '@/lib/dsl/codemirror-lint';

export function CodeEditor() {
  const source = useDiagramStore((s) => s.source);
  const setSource = useDiagramStore((s) => s.setSource);
  const setEditorView = useDiagramStore((s) => s.setEditorView);

  const activeDiagramId = useDiagramRegistry((s) => s.activeDiagramId);
  const updateRegistrySource = useDiagramRegistry((s) => s.updateSource);

  const handleChange = (value: string) => {
    setSource(value);
    if (activeDiagramId) {
      updateRegistrySource(activeDiagramId, value);
    }
  };

  return (
    <div className="h-full w-full overflow-auto">
      <CodeMirror
        value={source}
        height="100%"
        onChange={handleChange}
        onCreateEditor={(view) => setEditorView(view)}
        extensions={[dslLanguage, dslHighlightExtension, dslLinter()]}
        basicSetup={{ lineNumbers: true, foldGutter: false }}
      />
    </div>
  );
}