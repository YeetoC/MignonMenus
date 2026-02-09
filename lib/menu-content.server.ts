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
      },
    },
    disallowedTagsMode: "discard",
  }).trim();
}
