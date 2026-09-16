import { Extension } from "@tiptap/core";
import { NodeSelection } from "@tiptap/pm/state";

export interface ClassNameOptions {
  types: string[];
}

const registeredClassNameTypes = new Set<string>();

export function registerClassNameType(type: string) {
  registeredClassNameTypes.add(type);
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    className: {
      /**
       * classの付与/削除
       * @param name クラス名
       * @param type Node指定
       */
      toggleClassName: (name: string, type?: string) => ReturnType;
    };
  }
}

export const ClassName = Extension.create<ClassNameOptions>({
  name: "className",
  addOptions() {
    return {
      types: ["heading", "paragraph"],
    };
  },

  // 拡張機能で有効にする属性をグローバルに追加する
  addGlobalAttributes() {
    return [
      {
        // 適応するNode & MarkのType
        types: [...this.options.types, ...registeredClassNameTypes],
        // 適応する属性
        attributes: {
          className: {
            default: "",
            parseHTML: (element) => element.getAttribute("class") ?? "",
            renderHTML: (attributes) => {
              if (attributes.className === "") return {};
              return {
                class: `${attributes.className}`,
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
      // クラスの付け外し
      toggleClassName:
        (name: string, type?: string) =>
        ({ chain, tr }) => {
          // 対象の判別
          // Nodeタイプ
          let node_type = type;
          let prev_class = "";
          if (!node_type && tr.selection instanceof NodeSelection) {
            node_type = tr.selection.node.type.name;
            prev_class = tr.selection.node.attrs.className ?? "";
          }
          if (!node_type) {
            // 選択中のNodeを対象に
            node_type = tr.selection.$from.node().type.name;
          }

          // Nodeタイプが付与対象でなければ何もしない
          if (
            !this.options.types.includes(node_type) &&
            !registeredClassNameTypes.has(node_type)
          ) {
            return false;
          }

          // classの付与

          // 既存のclassNameを確認 スペース区切りの文字列
          if (!(tr.selection instanceof NodeSelection && !type)) {
            if (type && registeredClassNameTypes.has(node_type)) {
              const mark =
                tr.selection.$from.nodeAfter?.marks.find(
                  (mark) => mark.type.name === node_type,
                ) ??
                tr.selection.$from.nodeBefore?.marks.find(
                  (mark) => mark.type.name === node_type,
                );
              prev_class = mark?.attrs.className ?? "";
            } else {
              prev_class = tr.selection.$from.node().attrs.className ?? "";
            }
          }

          // 新しいクラス 追加するクラスを初期値に
          let newClassName = name;

          // 既存のclassNameがあるときは重複チェック 無い場合そのまま追加される
          if (prev_class) {
            // 配列に分割
            const classList = prev_class.split(" ");
            // 追加しようとするクラスと同じものが存在したときは取り除く
            if (classList.find((e) => e === name)) {
              newClassName = classList.filter((e) => e !== name).join(" ");
            } else {
              newClassName = `${newClassName} ${prev_class}`;
            }
          }

          // クラスを設定
          return chain()
            .updateAttributes(node_type, {
              className: newClassName,
            })
            .run();
        },
    };
  },
});
