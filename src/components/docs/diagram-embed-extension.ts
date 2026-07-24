import { Node, mergeAttributes } from '@tiptap/core';
import { ReactNodeViewRenderer } from '@tiptap/react';
import { DiagramEmbedView } from './DiagramEmbedView';

export interface DiagramEmbedOptions {
  HTMLAttributes: Record<string, unknown>;
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    diagramEmbed: {
      insertDiagramEmbed: (attrs: { diagramId: string | null }) => ReturnType;
    };
  }
}

export const DiagramEmbed = Node.create<DiagramEmbedOptions>({
  name: 'diagramEmbed',
  group: 'block',
  atom: true,

  addAttributes() {
    return {
      diagramId: { default: null },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-diagram-embed]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return ['div', mergeAttributes({ 'data-diagram-embed': '' }, HTMLAttributes)];
  },

  addNodeView() {
    return ReactNodeViewRenderer(DiagramEmbedView);
  },

  addCommands() {
    return {
      insertDiagramEmbed:
        (attrs) =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs }),
    };
  },
});