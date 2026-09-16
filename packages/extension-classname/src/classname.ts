import { Extension } from "@tiptap/core";
import {
  getClassNameContext,
  isSupportedClassNameType,
  registeredClassNameTypes,
  registerClassNameType,
} from "./utils";

export interface ClassNameOptions {
  types: string[];
}
export { registerClassNameType } from "./utils";

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    className: {
      setClassName: (name: string, type?: string) => ReturnType;
      unsetClassName: (name: string, type?: string) => ReturnType;
      toggleClassName: (name: string, type?: string) => ReturnType;
    };
  }
}

export const ClassName = Extension.create<ClassNameOptions>({
  name: "className",
  addOptions() {
    return { types: ["heading", "paragraph"] };
  },
  addGlobalAttributes() {
    return [
      {
        types: [...this.options.types, ...registeredClassNameTypes],
        attributes: {
          className: {
            default: "",
            parseHTML: (element) => element.getAttribute("class") ?? "",
            renderHTML: (attributes) =>
              attributes.className === "" ? {} : { class: `${attributes.className}` },
          },
        },
      },
    ];
  },
  addCommands() {
    return {
      setClassName:
        (name: string, type?: string) =>
        ({ chain, tr }: any) => {
          const { nodeType, className } = getClassNameContext(type, tr);
          if (!isSupportedClassNameType(nodeType, this.options.types)) return false;
          const classes = className.split(" ").filter(Boolean);
          if (!classes.includes(name)) classes.unshift(name);
          return chain()
            .updateAttributes(nodeType, { className: classes.join(" ") })
            .run();
        },
      unsetClassName:
        (name: string, type?: string) =>
        ({ chain, tr }: any) => {
          const { nodeType, className } = getClassNameContext(type, tr);
          if (!isSupportedClassNameType(nodeType, this.options.types)) return false;
          return chain()
            .updateAttributes(nodeType, {
              className: className
                .split(" ")
                .filter((value: string) => value && value !== name)
                .join(" "),
            })
            .run();
        },
      toggleClassName:
        (name: string, type?: string) =>
        ({ commands, tr }: any) => {
          const { nodeType, className } = getClassNameContext(type, tr);
          if (!isSupportedClassNameType(nodeType, this.options.types)) return false;
          return className.split(" ").includes(name)
            ? commands.unsetClassName(name, type)
            : commands.setClassName(name, type);
        },
    };
  },
});
