import { Decoration, Extension } from "@tiptap/core";

export interface NodeTagOptions {
  ignoreNodeTypes: string[];
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    nodeTag: {
      showNodeTag: () => ReturnType;
      hideNodeTag: () => ReturnType;
      toggleNodeTag: () => ReturnType;
    };
  }
}

const nodeTagStyle = `
[data-node-tag] {
  border: 1px dashed #aaa;
  position: relative;
}
[data-node-tag-label] {
  position: absolute;
  z-index: 1;
  top: -0.5rem;
  left: 0.1rem;
  font-size: 0.6rem;
  line-height: 0.8rem;
  color: #888;
  font-weight: normal;
  background: rgba(255, 255, 255);
  pointer-events: none;
  user-select: none;
}
`;

export const NodeTag = Extension.create<NodeTagOptions>({
  name: "aysys-extension-node-tag",
  addStorage() {
    return {
      style: undefined as HTMLStyleElement | undefined,
      visible: true,
    };
  },
  onCreate() {
    if (typeof document === "undefined") return;

    const style = document.createElement("style");
    style.textContent = nodeTagStyle;
    document.head.appendChild(style);
    this.storage.style = style;
  },
  onDestroy() {
    this.storage.style?.remove();
  },
  addOptions() {
    return {
      ignoreNodeTypes: ["tableRow"],
    };
  },
  addCommands() {
    return {
      showNodeTag:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            this.storage.visible = true;
            dispatch(tr.setMeta("addToHistory", false));
          }
          return true;
        },
      hideNodeTag:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            this.storage.visible = false;
            dispatch(tr.setMeta("addToHistory", false));
          }
          return true;
        },
      toggleNodeTag:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) {
            this.storage.visible = !this.storage.visible;
            dispatch(tr.setMeta("addToHistory", false));
          }
          return true;
        },
    };
  },
  addDecorations() {
    return {
      create: ({ state }) => {
        const decorations: Decoration[] = [];
        if (!this.storage.visible) return decorations;

        state.doc.descendants((node, pos) => {
          if (node.isText || node.isLeaf) return;
          if (this.options.ignoreNodeTypes.includes(node.type.name)) return;
          let name = node.type.name;

          // headingタグはlevelを表示
          if (node.type.name === "heading") {
            name = `h${node.attrs.level}`;
          }

          if (node.type.name === "listItem") {
            name = "li";
          }
          if (node.type.name === "tableHeader") {
            name = "th";
          }

          if (node.type.name === "tableCell") {
            name = "td";
          }

          decorations.push(
            Decoration.Node(pos, pos + node.nodeSize, {
              "data-node-tag": name,
            }),
          );

          decorations.push(
            Decoration.Widget(
              node.isLeaf || node.isAtom ? pos : pos + 1,
              () => {
                const label = document.createElement("span");
                label.dataset.nodeTagLabel = "";
                label.textContent = name;
                return label;
              },
              { key: `node-tag-${pos}-${name}`, side: -1 },
            ),
          );
        });
        return decorations;
      },
    };
  },
});
