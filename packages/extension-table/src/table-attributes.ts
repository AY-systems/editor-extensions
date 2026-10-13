import { Extension } from "@tiptap/core";

export interface TableAttributeValues {
  width: string;
  height: string;
  borderWidth: string;
  borderStyle: string;
  borderColor: string;
  backgroundColor: string;
}

export type TableAttributeName = keyof TableAttributeValues;
export type TableAttributeNodeType = "table" | "tableRow" | "tableCell" | "tableHeader";

export interface TableAttributesOptions {
  types: TableAttributeNodeType[];
}

export const TableAttributes = Extension.create<TableAttributesOptions>({
  name: "tableAttributes",
  addOptions() {
    return {
      types: ["table", "tableRow", "tableCell", "tableHeader"],
    };
  },
  addGlobalAttributes() {
    return [
      {
        types: this.options.types,
        attributes: {
          width: {
            default: "",
            parseHTML: (element: HTMLElement) =>
              element.getAttribute("width") || element.style.width,
            renderHTML: (attributes: Record<string, unknown>) =>
              typeof attributes.width === "string" && attributes.width
                ? { width: attributes.width }
                : {},
          },
          height: {
            default: "",
            parseHTML: (element: HTMLElement) =>
              element.getAttribute("height") || element.style.height,
            renderHTML: (attributes: Record<string, unknown>) =>
              typeof attributes.height === "string" && attributes.height
                ? { height: attributes.height }
                : {},
          },
          borderWidth: {
            default: "",
            parseHTML: (element: HTMLElement) => element.style.borderWidth,
            renderHTML: (attributes: Record<string, unknown>) =>
              typeof attributes.borderWidth === "string" && attributes.borderWidth
                ? { style: `border-width:${attributes.borderWidth};` }
                : {},
          },
          borderStyle: {
            default: "",
            parseHTML: (element: HTMLElement) => element.style.borderStyle,
            renderHTML: (attributes: Record<string, unknown>) =>
              typeof attributes.borderStyle === "string" && attributes.borderStyle
                ? { style: `border-style:${attributes.borderStyle};` }
                : {},
          },
          borderColor: {
            default: "",
            parseHTML: (element: HTMLElement) => element.style.borderColor,
            renderHTML: (attributes: Record<string, unknown>) =>
              typeof attributes.borderColor === "string" && attributes.borderColor
                ? { style: `border-color:${attributes.borderColor};` }
                : {},
          },
          backgroundColor: {
            default: "",
            parseHTML: (element: HTMLElement) => element.style.backgroundColor,
            renderHTML: (attributes: Record<string, unknown>) =>
              typeof attributes.backgroundColor === "string" && attributes.backgroundColor
                ? { style: `background-color:${attributes.backgroundColor};` }
                : {},
          },
        },
      },
    ];
  },
});
