import type { EditorState } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Extension } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";

const NODE_TAG_STYLE_ID = "ui-node-name-styles";
const NODE_TAG_STYLES = `
[data-ui-node-tag-editor] > *,
[data-ui-node-tag-editor] p,
[data-ui-node-tag-editor] h1,
[data-ui-node-tag-editor] h2,
[data-ui-node-tag-editor] h3,
[data-ui-node-tag-editor] h4,
[data-ui-node-tag-editor] h5,
[data-ui-node-tag-editor] h6,
[data-ui-node-tag-editor] td,
[data-ui-node-tag-editor] div:not(li[data-type="timelineItem"] > div):not(.ProseMirror-gapcursor),
[data-ui-node-tag-editor] li[data-type="timelineItem"] {
  border: 1px dashed #aaa;
}

[data-ui-node-tag-container] {
  position: absolute;
  pointer-events: none;
}

.ui-node-name {
  position: absolute;
  font-size: 10px;
  color: gray;
  user-select: none;
  padding: 0;
  line-height: 1;
  background-color: white;
  margin: 0 4px;
}
`;

export interface NodeTagOptions {
  /** エディタの内側の余白(px) */
  wrapperPadding: number;
  /** 許可するleafnode */
  allowedNodeTypes: string[];
  /** 無視するnode */
  ignoreNodeTypes: string[];
  /** 無視する親要素 */
  ignoreParentNodeTypes: string[];
}

export const NodeTag = Extension.create<NodeTagOptions>({
  name: "UiNodeName",
  addOptions() {
    return {
      wrapperPadding: 0,
      allowedNodeTypes: [],
      ignoreNodeTypes: [],
      ignoreParentNodeTypes: [],
    };
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey("UiNodeNameAbs"),
        options: this.options,

        view(editorView) {
          return new NodeTagView(editorView, this.options);
        },
        state: {
          init() {
            return null;
          },
          apply(tr, prev) {
            return prev;
          },
        },
      }),
    ];
  },

  onCreate() {
    updateTags(this.editor.view, this.options, getContainer(this.editor.view));
  },
});

class NodeTagView {
  container: HTMLElement;
  options: {
    allowedNodeTypes: string[];
    ignoreNodeTypes: string[];
    ignoreParentNodeTypes: string[];
    wrapperPadding: number;
  };
  resizeObserver: ResizeObserver;
  constructor(
    readonly editorView: EditorView,
    options: NodeTagOptions,
  ) {
    this.options = options;

    this.container = getContainer(editorView);

    this.resizeObserver = new ResizeObserver(() => {
      updateTags(this.editorView, this.options, this.container);
    });
    this.resizeObserver.observe(editorView.dom);
  }

  update(view: EditorView, prevState: EditorState) {
    if (view.state.doc.eq(prevState.doc)) return;
    // node名は高さが変わらない変更でも変化するため、毎回更新する
    updateTags(view, this.options, this.container);
    // 高さの記録
  }
  destroy() {
    this.resizeObserver.disconnect();
    this.container.remove();
  }
}

function updateTags(view: EditorView, options: NodeTagOptions, container: HTMLElement) {
  // containerの表示位置を調整
  const parentRect = getParentRect(view);

  container.style.top = `0px`;
  container.style.left = `0px`;
  container.style.width = `${parentRect.width}px`;
  container.style.height = `${parentRect.height}px`;

  const { doc } = view.state;
  container.innerHTML = ""; // 前回分をクリア
  // ドキュメント全体を走査して各ブロックノードの座標を取得
  const containerCoords = view.coordsAtPos(0);
  doc.descendants((node, pos, parent) => {
    if (options.ignoreNodeTypes.includes(node.type.name)) return;

    if (parent && options.ignoreParentNodeTypes.includes(parent.type.name)) return;

    if (options.allowedNodeTypes.includes(node.type.name) || !node.isLeaf) {
      // 許可していないleafNodeを除いたすべてのnode名タグを作成
      try {
        // ノード末尾の位置（pos + 1）のDOM座標を取得
        const coords = view.coordsAtPos(pos);

        const el = document.createElement("span");
        el.className = "ui-node-name";

        el.style.top = `${coords.top - containerCoords.top + (options.wrapperPadding * 2) / 3}px`;
        el.style.left = `${coords.left - containerCoords.left + options.wrapperPadding}px`;

        el.textContent = `${node.type.name} `;

        // headingタグはlevelを表示
        if (node.type.name == "heading") {
          el.textContent = `h${node.attrs.level}`;
        } else {
          el.textContent = node.type.name;
        }

        container.appendChild(el);
      } catch (err) {
        // エラー時は無視
        console.error(err);
      }
    }
  });
}

function getParentRect(editorView: EditorView) {
  const parent = editorView.dom.parentElement;
  if (!parent) throw new Error("NodeTag requires the editor to have a parent element");
  return parent.getBoundingClientRect();
}

function getContainer(editorView: EditorView) {
  ensureStyles();
  editorView.dom.dataset.uiNodeTagEditor = "";
  const parent = editorView.dom.parentElement;
  if (!parent) throw new Error("NodeTag requires the editor to have a parent element");
  parent.style.position = "relative";

  let container = document.querySelector<HTMLDivElement>("[data-ui-node-tag-container]");
  if (!container) {
    container = document.createElement("div");
    container.dataset.uiNodeTagContainer = "";
    parent.appendChild(container);
  }
  return container;
}

function ensureStyles() {
  if (document.getElementById(NODE_TAG_STYLE_ID)) return;

  const style = document.createElement("style");
  style.id = NODE_TAG_STYLE_ID;
  style.textContent = NODE_TAG_STYLES;
  document.head.appendChild(style);
}
