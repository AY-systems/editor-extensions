import type { Editor } from "@tiptap/core";
import { Decoration, Extension } from "@tiptap/core";
import { TextSelection } from "@tiptap/pm/state";

export interface AnchorLinkOptions {
  types: string[];
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    anchorLink: {
      setAnchorLink: (name: string) => ReturnType;
      unsetAnchorLink: () => ReturnType;
    };
  }
}

const ANCHOR_LINK_STYLES = `
*[data-type="anchor_link"] {
  position: relative;
}
[data-anchor-link-name] {
  display: inline-block;
  position: absolute;
  z-index: 1;
  top: -0.5rem;
  right: 0.1rem;
  font-size: 0.6rem;
  line-height: 0.8rem;
  color: #888;
  background: rgba(255, 255, 255);
  user-select: none;
  pointer-events: none;
}
`;

function hasDuplicateAnchor(editor: Editor, name: string, types: string[]) {
  if (!name) return false;

  let duplicate = false;
  editor.state.doc.descendants((node) => {
    if (!types.includes(node.type.name)) return true;

    const anchorLink = node.attrs.anchorLink;
    if (typeof anchorLink !== "string" || anchorLink === "") return true;

    if (anchorLink === name) {
      duplicate = true;
      return false;
    }

    return true;
  });

  return duplicate;
}

export const AnchorLink = Extension.create<AnchorLinkOptions>({
  name: "anchorLink",
  addOptions() {
    return {
      // 対象のノード
      types: ["heading", "paragraph", "div"],
    };
  },
  addStorage() {
    return { style: undefined as HTMLStyleElement | undefined };
  },
  addDecorations() {
    return {
      shouldUpdate: ({ tr }) => tr.docChanged,
      create: ({ state }) => {
        const decorations: Decoration[] = [];

        state.doc.forEach((node, position) => {
          const anchorLink = node.attrs.anchorLink;
          if (typeof anchorLink !== "string" || anchorLink === "") return;

          decorations.push(
            Decoration.Widget(
              position + 1,
              () => {
                const label = document.createElement("span");
                label.setAttribute("data-anchor-link-name", "");
                label.textContent = `#${anchorLink}`;
                label.contentEditable = "false";
                return label;
              },
              { side: -1, key: `anchor-link-${position}-${anchorLink}` },
            ),
          );
        });

        return decorations;
      },
    };
  },
  onCreate() {
    if (typeof document === "undefined") return;

    const style = document.createElement("style");
    style.textContent = ANCHOR_LINK_STYLES;
    document.head.appendChild(style);
    this.storage.style = style;
  },
  onDestroy() {
    this.storage.style?.remove();
  },
  // attributesの追加
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          anchorLink: {
            default: "",
            parseHTML: (element) => element.getAttribute("id") ?? "",
            renderHTML: (attributes) => {
              if (attributes.anchorLink === "") {
                return {};
              }
              return {
                id: `${attributes.anchorLink}`,
                "data-type": "anchor_link",
              };
            },
          },
        },
      },
    ];
  },
  // コマンドの追加
  addCommands() {
    return {
      // アンカーidを付ける
      setAnchorLink:
        (name: string) =>
        ({ editor, tr, chain }) => {
          // 変更前にすでに同一アンカー名が存在している場合失敗
          if (hasDuplicateAnchor(editor, name, this.options.types)) return false;
          return chain()
            .focus()
            .command(({ tr }) => {
              const { $anchor } = tr.selection;
              if (1 < $anchor.depth) {
                tr.setSelection(TextSelection.create(tr.doc, $anchor.before(1) + 1));
              }

              const node = tr.selection.$anchor.node();

              if (!this.options.types.includes(node.type.name)) return false;

              return true;
            })
            .updateAttributes(tr.selection.$anchor.node().type.name, {
              anchorLink: name,
            })
            .run();
        },

      // アンカーの解除
      unsetAnchorLink:
        () =>
        ({ chain, tr }) => {
          return chain()
            .focus()
            .command(({ tr }) => {
              const { $anchor } = tr.selection;
              if (1 < $anchor.depth) {
                tr.setSelection(TextSelection.create(tr.doc, $anchor.before(1) + 1));
              }

              const node = tr.selection.$anchor.node();
              if (!this.options.types.includes(node.type.name) || !node.attrs.anchorLink) {
                return false;
              }

              return true;
            })
            .updateAttributes(tr.selection.$anchor.node().type.name, {
              anchorLink: "",
            })
            .run();
        },
    };
  },

  addKeyboardShortcuts() {
    return {
      // アンカー内でのEnterでの改行はattributeを引き継がない
      Enter: ({ editor }) => {
        const { $anchor } = editor.state.selection;
        const node = $anchor.node();
        if (!this.options.types.includes(node.type.name) || !node.attrs.anchorLink) {
          return false;
        }

        // 改行後 改行先のアンカーリンク解除
        return editor.chain().focus().splitBlock().unsetAnchorLink().run();
      },
    };
  },
});
