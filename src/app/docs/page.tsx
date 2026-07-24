'use client';

import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import { DiagramEmbed } from '@/components/docs/diagram-embed-extension';
import { DocToolbar } from '@/components/docs/DocToolbar';

export default function DocsPage() {
  const editor = useEditor({
    extensions: [
      StarterKit,
      Placeholder.configure({ placeholder: "Start writing, or insert a diagram…" }),
      DiagramEmbed,
    ],
    content: '<h2>Untitled document</h2><p></p>',
    immediatelyRender: false,
  });

  const handleInsertDiagram = () => {
    editor?.chain().focus().insertDiagramEmbed({ diagramId: null }).run();
  };

  return (
    <div className="flex h-screen w-full flex-col">
      <DocToolbar editor={editor} onInsertDiagram={handleInsertDiagram} />
      <div className="flex-1 overflow-auto">
        <div className="mx-auto max-w-3xl px-8 py-8">
          <EditorContent editor={editor} className="prose prose-sm max-w-none focus:outline-none" />
        </div>
      </div>
    </div>
  );
}