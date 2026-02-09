"use client";

import * as React from "react";

import { cn } from "@/lib/utils";

import { LexicalComposer } from "@lexical/react/LexicalComposer";
import { RichTextPlugin } from "@lexical/react/LexicalRichTextPlugin";
import { ContentEditable } from "@lexical/react/LexicalContentEditable";
import { OnChangePlugin } from "@lexical/react/LexicalOnChangePlugin";
import { HistoryPlugin } from "@lexical/react/LexicalHistoryPlugin";
import { LexicalErrorBoundary } from "@lexical/react/LexicalErrorBoundary";
import { ListPlugin } from "@lexical/react/LexicalListPlugin";
import { TablePlugin } from "@lexical/react/LexicalTablePlugin";
import { useLexicalComposerContext } from "@lexical/react/LexicalComposerContext";

import { $generateHtmlFromNodes, $generateNodesFromDOM } from "@lexical/html";
import { ListItemNode, ListNode } from "@lexical/list";
import { TableCellNode, TableNode, TableRowNode } from "@lexical/table";
import type { EditorState, LexicalEditor } from "lexical";
import { $createParagraphNode, $createTextNode, $getRoot } from "lexical";

export type MenuContentEditorProps = {
  id?: string;
  className?: string;
  placeholder?: string;
  ariaInvalid?: boolean;
  initialPlainText?: string;
  initialHtml?: string;
  editorKey?: string;
  onBlur?: () => void;
  onChange: (next: { plainText: string; html: string }) => void;
};

function InitialContentPlugin({
  initialPlainText,
  initialHtml,
  suppressOnChangeRef,
}: {
  initialPlainText?: string;
  initialHtml?: string;
  suppressOnChangeRef: React.MutableRefObject<boolean>;
}) {
  const [editor] = useLexicalComposerContext();
  const hasInitializedRef = React.useRef(false);

  React.useEffect(() => {
    if (hasInitializedRef.current) return;
    hasInitializedRef.current = true;

    suppressOnChangeRef.current = true;

    editor.update(() => {
      const root = $getRoot();
      root.clear();

      const html = (initialHtml ?? "").trim();
      if (html) {
        const parser = new DOMParser();
        const dom = parser.parseFromString(html, "text/html");
        const nodes = $generateNodesFromDOM(editor, dom);
        root.append(...nodes);
        if (root.getChildrenSize() === 0) {
          root.append($createParagraphNode());
        }
        return;
      }

      const plain = (initialPlainText ?? "").replace(/\r\n/g, "\n");
      const lines = plain.split("\n");

      if (lines.length === 0) {
        root.append($createParagraphNode());
        return;
      }

      for (const line of lines) {
        const p = $createParagraphNode();
        if (line) {
          p.append($createTextNode(line));
        }
        root.append(p);
      }
    });

    queueMicrotask(() => {
      suppressOnChangeRef.current = false;
    });
  }, [editor, initialHtml, initialPlainText, suppressOnChangeRef]);

  return null;
}

export function MenuContentEditor({
  id,
  className,
  placeholder = "Menütext hier einfügen…",
  ariaInvalid,
  initialPlainText,
  initialHtml,
  editorKey,
  onBlur,
  onChange,
}: MenuContentEditorProps) {
  const suppressOnChangeRef = React.useRef(true);

  const initialConfig = React.useMemo(
    () => ({
      namespace: "MenuContentEditor",
      nodes: [ListNode, ListItemNode, TableNode, TableRowNode, TableCellNode],
      onError(error: unknown) {
        throw error;
      },
    }),
    [],
  );

  return (
    <LexicalComposer key={editorKey} initialConfig={initialConfig}>
      <InitialContentPlugin
        initialPlainText={initialPlainText}
        initialHtml={initialHtml}
        suppressOnChangeRef={suppressOnChangeRef}
      />

      <div
        className={cn(
          "relative rounded-md border bg-transparent px-3 py-2 shadow-xs transition-[color,box-shadow]",
          "border-input dark:bg-input/30",
          "focus-within:border-ring focus-within:ring-[3px] focus-within:ring-ring/50",
          "aria-invalid:ring-destructive/20 aria-invalid:border-destructive dark:aria-invalid:ring-destructive/40",
          "text-base md:text-sm",
          "[&_p]:mb-2 [&_p:last-child]:mb-0",
          "[&_ul]:list-disc [&_ol]:list-decimal [&_ul,&_ol]:pl-6 [&_li]:my-1",
          "[&_table]:my-2 [&_table]:w-full [&_table]:border-collapse",
          "[&_td]:align-top [&_th]:align-top",
          "[&_td]:border [&_th]:border [&_td]:border-border [&_th]:border-border",
          "[&_td]:p-2 [&_th]:p-2",
          className,
        )}
        aria-invalid={ariaInvalid || undefined}
      >
        <RichTextPlugin
          contentEditable={
            <ContentEditable
              id={id}
              className={cn(
                "min-h-32 outline-none",
                "placeholder:text-muted-foreground",
                "disabled:cursor-not-allowed disabled:opacity-50",
              )}
              onBlur={onBlur}
            />
          }
          placeholder={
            <div className="pointer-events-none absolute left-3 top-2 text-muted-foreground">
              {placeholder}
            </div>
          }
          ErrorBoundary={LexicalErrorBoundary}
        />

        <HistoryPlugin />
        <ListPlugin />
        <TablePlugin />

        <OnChangePlugin
          onChange={(editorState: EditorState, editor: LexicalEditor) => {
            if (suppressOnChangeRef.current) {
              return;
            }

            editorState.read(() => {
              const plainText = $getRoot().getTextContent();
              const trimmedPlain = plainText.trim();
              const html = trimmedPlain ? $generateHtmlFromNodes(editor, null) : "";
              onChange({ plainText, html });
            });
          }}
        />
      </div>
    </LexicalComposer>
  );
}
