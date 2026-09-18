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
        ({ chain, state }) => {
          const { from, to, empty } = state.selection;
          if (empty) return chain().focus().setMark(this.name, { className: classname }).run();

          return chain()
            .focus()
            .command(({ tr }) => {
              state.doc.nodesBetween(from, to, (node, pos) => {
                if (!node.isText) return;
                const start = Math.max(from, pos);
                const end = Math.min(to, pos + node.nodeSize);
                if (start >= end) return;

                const mark = node.marks.find((item) => item.type === this.type);
                const classNames = (mark?.attrs.className ?? "").split(" ").filter(Boolean);
                if (!classNames.includes(classname)) classNames.unshift(classname);
                tr.addMark(
                  start,
                  end,
                  this.type.create({ ...mark?.attrs, className: classNames.join(" ") }),
                );
              });
              return true;
            })
            .run();
        },

      unsetTextDecoration:
        (classname) =>
        ({ chain, state }) => {
          const { from, to, empty } = state.selection;
          if (empty) {
            return chain()
              .focus()
              .command(({ tr }) => {
                tr.removeStoredMark(this.type);
                return true;
              })
              .run();
          }

          return chain()
            .focus()
            .command(({ tr }) => {
              state.doc.nodesBetween(from, to, (node, pos) => {
                if (!node.isText) return;
                const start = Math.max(from, pos);
                const end = Math.min(to, pos + node.nodeSize);
                const mark = node.marks.find((item) => item.type === this.type);
                if (!mark || start >= end) return;

                const classNames = (mark.attrs.className ?? "")
                  .split(" ")
                  .filter((value: string) => value && value !== classname);
                if (classNames.length === 0) {
                  tr.removeMark(start, end, this.type);
                } else {
                  tr.addMark(
                    start,
                    end,
                    this.type.create({ ...mark.attrs, className: classNames.join(" ") }),
                  );
                }
              });
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
