import "server-only";

import sanitizeHtml from "sanitize-html";

export function sanitizeMenuContentHtml(input: string): string {
  const raw = input.trim();
  if (!raw) {
    return "";
  }

  return sanitizeHtml(raw, {
    allowedTags: [
      "div",
      "p",
      "br",
      "span",
      "strong",
      "em",
      "u",
      "ul",
      "ol",
      "li",
      "table",
      "thead",
      "tbody",
      "tfoot",
      "tr",
      "td",
      "th",
      "colgroup",
      "col",
      "caption",
    ],
    transformTags: {
      b: "strong",
      i: "em",
    },
    allowedAttributes: {
      span: ["style"],
      div: ["style"],
      p: ["style"],
      strong: ["style"],
      em: ["style"],
      u: ["style"],
      ul: ["style"],
      ol: ["style"],
      li: ["style"],
      table: ["style"],
      thead: ["style"],
      tbody: ["style"],
      tfoot: ["style"],
      tr: ["style"],
      td: ["style", "colspan", "rowspan"],
      th: ["style", "colspan", "rowspan"],
      colgroup: ["style"],
      col: ["style", "span"],
      caption: ["style"],
    },
    allowedStyles: {
      "*": {
        "font-weight": [/^(normal|bold|[1-9]00)$/],
        "font-style": [/^(normal|italic)$/],
        "text-decoration": [/^(none|underline|line-through)$/],
        "font-size": [/^\d+(\.\d+)?(px|pt)$/],
        "text-align": [/^(left|right|center|justify)$/],
        color: [
          /^#[0-9a-fA-F]{3,8}$/,
          /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/,
          /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/,
        ],
        "background-color": [
          /^#[0-9a-fA-F]{3,8}$/,
          /^rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)$/,
          /^rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|0?\.\d+)\s*\)$/,
        ],
        "font-family": [/^[a-zA-Z0-9\s",\-']+$/],
        "line-height": [/^(normal|\d+(\.\d+)?(px|pt|em|rem|%)?)$/],
      },
    },
    disallowedTagsMode: "discard",
  }).trim();
}
