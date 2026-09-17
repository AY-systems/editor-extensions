import NodeTag from "extension-ui-node-tag";
import StarterKit from "@tiptap/starter-kit";
import { ClassName, TextDecoration } from "extension-classname";
import AnchorLink from "extension-anchor-link";
import { Div, Grid, Sticky } from "extension-div";
import { EmbedMedia } from "extension-embed-media";
import { PictureKit } from "extension-picture";

export const requiredExtensions = [StarterKit];

export const advancedExtensions = [
  EmbedMedia,
  NodeTag.configure({ wrapperPadding: 16 }),
  ClassName,
  TextDecoration,
  AnchorLink,
  Div,
  Grid,
  Sticky,
  PictureKit,
];
