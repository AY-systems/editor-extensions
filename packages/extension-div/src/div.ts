import { mergeAttributes, Node } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

export interface DivOptions {
  HTMLAttributes: Record<string, any>;
  style: Record<string, any>;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    div: {
      /**
       * 選択中のnodeをdivで囲む
       */
      wrapDiv: () => ReturnType;
      /**
       * 選択中のDiv要素を解除する
       */
      unwrapDiv: () => ReturnType;
      /**
       * 選択中のnodeをdiv要素に切り替えする
       */
      toggleDiv: () => ReturnType;
    };
  }
}

export const Div = Node.create<DivOptions>({
  name: "div",
  group: "block",
  content: "block*",
  selectable: true,

  // ネストしたDivのそれぞれに焦点を当てるのに必要
  isolating: true,

  addOptions() {
    return {
      HTMLAttributes: {},
      style: {},
    };
  },

  parseHTML() {
    return [
      {
        tag: "div",
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    const style = Object.entries(this.options.style)
      .map(([key, value]) => `${key}: ${value}`)
      .join("; ");

    return [
      "div",
      mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, style ? { style } : {}),
      0,
    ];
  },

  addCommands() {
    return {
      toggleDiv:
        () =>
        ({ editor, chain }) =>
          editor.isActive(this.name)
            ? chain().unwrapDiv().run()
            : chain().focus().wrapIn(this.name).run(),

      unwrapDiv:
        () =>
        ({ chain }) =>
          chain()
            .focus()
            .command(({ tr, dispatch, commands }) => {
              const { $from } = tr.selection;

              // Div自体が選択されている場合は、NodeSelectionの範囲をコンテンツで置き換える
              const selectedNode = tr.selection instanceof NodeSelection ? tr.selection.node : null;

              if (selectedNode?.type.name === this.name) {
                tr.replaceWith($from.pos, $from.pos + selectedNode.nodeSize, selectedNode.content);
                commands.setTextSelection($from.pos + 1);
                dispatch?.(tr);
                return true;
              }

              // カーソルを含む親Divを探し、Divの外側からコンテンツを戻す
              for (let depth = $from.depth; depth > 0; depth -= 1) {
                if ($from.node(depth).type.name !== this.name) continue;

                const position = $from.pos;
                tr.replaceWith($from.before(depth), $from.after(depth), $from.node(depth).content);
                // ノード置換による位置ずれをトランザクションのマッピングで補正する
                commands.setTextSelection(tr.mapping.map(position, -1));
                dispatch?.(tr);
                return true;
              }

              return false;
            })
            .run(),

      wrapDiv:
        () =>
        ({ chain }) => {
          return chain().focus().wrapIn(this.name).run();
        },
    };
  },
});
