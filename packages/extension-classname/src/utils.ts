import { NodeSelection } from "@tiptap/pm/state";

export const registeredClassNameTypes = new Set<string>();

export function registerClassNameType(type: string) {
  registeredClassNameTypes.add(type);
}

export function getClassNameContext(type: string | undefined, tr: any) {
  let nodeType = type;
  let className = "";
  if (!nodeType && tr.selection instanceof NodeSelection) {
    nodeType = tr.selection.node.type.name;
    className = tr.selection.node.attrs.className ?? "";
  }
  if (!nodeType) nodeType = tr.selection.$from.node().type.name;
  if (!(tr.selection instanceof NodeSelection && !type)) {
    if (type && nodeType && registeredClassNameTypes.has(nodeType)) {
      const mark =
        tr.selection.$from.nodeAfter?.marks.find((mark: any) => mark.type.name === nodeType) ??
        tr.selection.$from.nodeBefore?.marks.find((mark: any) => mark.type.name === nodeType);
      className = mark?.attrs.className ?? "";
    } else className = tr.selection.$from.node().attrs.className ?? "";
  }
  return { nodeType, className };
}

export function isSupportedClassNameType(nodeType: string | undefined, types: string[]) {
  return !!nodeType && (types.includes(nodeType) || registeredClassNameTypes.has(nodeType));
}
