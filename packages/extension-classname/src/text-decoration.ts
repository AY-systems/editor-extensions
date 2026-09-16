import { registerClassNameType } from "./classname";
import { Mark, mergeAttributes } from "@tiptap/core";

registerClassNameType("textDecoration");

export interface TextDecorationOptions {
  types: string[];
  HTMLAttributes: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    textDecoration: {
      setTextDecoration: (classname: string) => ReturnType;
      unsetTextDecoration: (classname: string) => ReturnType;
      toggleTextDecoration: (classname: string) => ReturnType;
      isTextDecorationActive: (classname: string) => ReturnType;
    };
  }
}

export const TextDecoration = Mark.create<TextDecorationOptions>({
  name: "textDecoration",
  group: "inline",
  spanning: false,

  addOptions() {
    return {
      HTMLAttributes: {},
      types: [],
    };
  },

  parseHTML() {
    return [{ tag: `span[data-type="${this.name}"]` }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "span",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
        "data-type": this.name,
      }),
      0,
    ];
  },

  addCommands() {
    return {
      isTextDecorationActive:
        (classname: string) =>
        ({ state }) => {
          const { from, to, empty } = state.selection;
          const hasClassName = (
            marks: readonly {
              type: { name: string };
              attrs: { className?: string };
            }[],
          ) =>
            marks.some(
              (mark) =>
                mark.type.name === this.name &&
                mark.attrs.className?.split(" ").includes(classname),
            );

          if (empty) {
            return hasClassName(state.storedMarks ?? state.selection.$from.marks());
          }

          let active = false;
          state.doc.nodesBetween(from, to, (node) => {
            if (hasClassName(node.marks)) {
              active = true;
            }
            return !active;
          });
          return active;
        },

      setTextDecoration:
        (classname) =>
        ({ chain }) => {
          return chain().focus().setMark(this.name, { className: classname }).run();
        },

      unsetTextDecoration:
        (classname) =>
        ({ chain }) => {
          return chain()
            .toggleClassName(classname, this.name)
            .command(({ tr }) => {
              const className =
                tr.selection.$from.nodeAfter?.marks.find((mark) => mark.type === this.type)?.attrs
                  .className ??
                tr.selection.$from.nodeBefore?.marks.find((mark) => mark.type === this.type)?.attrs
                  .className ??
                "";

              // 対象のクラス削除後にクラスが空の場合マークを削除
              if (className === "") {
                if (tr.selection.empty) {
                  tr.removeStoredMark(this.type);
                } else {
                  tr.removeMark(tr.selection.from, tr.selection.to, this.type);
                }
              }
              return true;
            })
            .run();
        },

      toggleTextDecoration:
        (classname: string) =>
        ({ commands, chain }) => {
          if (commands.isTextDecorationActive(classname)) {
            return chain().unsetTextDecoration(classname).run();
          } else {
            return chain().setTextDecoration(classname).run();
          }
        },
    };
  },
});
