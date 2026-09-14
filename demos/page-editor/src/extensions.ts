import NodeTag from "extension-ui-node-tag";
import StarterKit from "@tiptap/starter-kit";
import ClassName from "extension-classname";
import AnchorLink from "extension-anchor-link";
import Div from "extension-div";

export const requiredExtensions = [StarterKit];

export const advancedExtensions = [
  NodeTag.configure({ wrapperPadding: 16 }),
  ClassName,
  AnchorLink,
  Div,
];
