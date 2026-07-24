import { Extension } from '@tiptap/core';
import Suggestion from '@tiptap/suggestion';
import { ReactRenderer } from '@tiptap/react';
import { SLASH_COMMANDS, SlashMenuList, SlashMenuListRef, CommandItem } from './SlashMenuList';

export const SlashCommandExtension = Extension.create({
  name: 'slashCommand',

  addOptions() {
    return {
      suggestion: {
        char: '/',
        command: ({ editor, range, props }: { editor: any; range: any; props: CommandItem }) => {
          props.command({ editor, range });
        },
      },
    };
  },

  addProseMirrorPlugins() {
    return [
      Suggestion({
        editor: this.editor,
        ...this.options.suggestion,
        items: ({ query }: { query: string }) => {
          return SLASH_COMMANDS.filter(
            (item) =>
              item.title.toLowerCase().includes(query.toLowerCase()) ||
              item.description.toLowerCase().includes(query.toLowerCase())
          );
        },
        render: () => {
          let component: ReactRenderer<SlashMenuListRef> | null = null;
          let container: HTMLDivElement | null = null;

          return {
            onStart: (props: any) => {
              component = new ReactRenderer(SlashMenuList, {
                props,
                editor: props.editor,
              });

              if (!props.clientRect) {
                return;
              }

              container = document.createElement('div');
              container.style.position = 'fixed';
              container.style.zIndex = '9999';
              document.body.appendChild(container);
              container.appendChild(component.element);

              const rect = props.clientRect();
              if (rect) {
                container.style.left = `${rect.left}px`;
                container.style.top = `${rect.bottom + 6}px`;
              }
            },

            onUpdate: (props: any) => {
              component?.updateProps(props);

              if (container && props.clientRect) {
                const rect = props.clientRect();
                if (rect) {
                  container.style.left = `${rect.left}px`;
                  container.style.top = `${rect.bottom + 6}px`;
                }
              }
            },

            onKeyDown: (props: any) => {
              if (props.event.key === 'Escape') {
                if (container) {
                  container.remove();
                  container = null;
                }
                component?.destroy();
                component = null;
                return true;
              }

              return component?.ref?.onKeyDown(props) ?? false;
            },

            onExit: () => {
              if (container) {
                container.remove();
                container = null;
              }
              component?.destroy();
              component = null;
            },
          };
        },
      }),
    ];
  },
});
