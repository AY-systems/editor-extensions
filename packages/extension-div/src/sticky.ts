import { mergeAttributes } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";
import { Div } from "./div";
import { getStyle, renderStyleAttribute } from "./utils";

type StickyOptions = {
  HTMLAttributes: Record<string, any>;
  style: Record<string, any>;
};

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    sticky: {
      createSticky: (distance?: string, placement?: "top" | "bottom") => ReturnType;
      removeSticky: () => ReturnType;
    };
  }
}

const STICKY_STYLES = `
*[data-type="sticky"] {
  z-index: 1;
}
`;

export const Sticky = Div.extend<StickyOptions>({
  name: "sticky",

  addStorage() {
    return { style: undefined as HTMLStyleElement | undefined };
  },
  onCreate() {
    if (typeof document === "undefined") return;

    const style = document.createElement("style");
    style.textContent = STICKY_STYLES;
    document.head.appendChild(style);
    this.storage.style = style;
  },
  onDestroy() {
    this.storage.style?.remove();
  },

  parseHTML() {
    return [{ tag: `div[data-type="${this.name}"]`, priority: 100 }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, this.options.style, HTMLAttributes, {
        "data-type": this.name,
      }),
      0,
    ];
  },

  addAttributes() {
    return {
      position: {
        default: "sticky",
        parseHTML: (element) => getStyle(element, "position", "position"),
        renderHTML: ({ position }) => renderStyleAttribute("position", position),
      },
      top: {
        default: "",
        parseHTML: (element) => getStyle(element, "top", "top"),
        renderHTML: ({ top }) => renderStyleAttribute("top", top),
      },
      bottom: {
        default: "",
        parseHTML: (element) => getStyle(element, "bottom", "bottom"),
        renderHTML: ({ bottom }) => renderStyleAttribute("bottom", bottom),
      },
    };
  },

  // コマンドの追加
  addCommands() {
    return {
      createSticky:
        (distance, placement) =>
        ({ chain, state }) => {
          const { $from } = state.selection;
          const isInsideSticky = Array.from({ length: $from.depth }, (_, index) => index + 1).some(
            (depth) => $from.node(depth).type.name === this.name,
          );

          if (isInsideSticky) return false;

          const param: Record<string, unknown> = {};

          if (placement === "top") param.top = distance || "0";
          else param.bottom = distance || "0";

          return chain().focus().wrapIn(this.name, param).run();
        },

      removeSticky:
        () =>
        ({ chain }) =>
          chain()
            .focus()
            .command(({ tr, dispatch, commands }) => {
              const { $from } = tr.selection;
              const selectedNode = tr.selection instanceof NodeSelection ? tr.selection.node : null;

              if (selectedNode?.type.name === this.name) {
                tr.replaceWith($from.pos, $from.pos + selectedNode.nodeSize, selectedNode.content);
                commands.setTextSelection($from.pos + 1);
                dispatch?.(tr);
                return true;
              }

              for (let depth = $from.depth; depth > 0; depth -= 1) {
                if ($from.node(depth).type.name !== this.name) continue;

                const position = $from.pos;
                tr.replaceWith($from.before(depth), $from.after(depth), $from.node(depth).content);
                commands.setTextSelection(tr.mapping.map(position, -1));
                dispatch?.(tr);
                return true;
              }

              return false;
            })
            .run(),
    };
  },
});
