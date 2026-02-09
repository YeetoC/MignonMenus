"use client";

import * as React from "react";

import type { Location, Menu, Tag } from "@/lib/read-model";
import { copyRichTextToClipboard, copyTextToClipboard } from "@/lib/clipboard";

import { toast } from "sonner";

import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

export type MenuDialogStickyFooterProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  menu: Menu;
  tags: Tag[];
  locations: Location[];
  footerActions?: React.ReactNode;
};

export function MenuDialogStickyFooter({
  open,
  onOpenChange,
  menu,
  tags,
  locations,
  footerActions,
}: MenuDialogStickyFooterProps) {
  const handleCopy = async () => {
    const ok = menu.menuContentHtml
      ? await copyRichTextToClipboard({
          html: menu.menuContentHtml,
          plain: menu.menuContent,
        })
      : await copyTextToClipboard(menu.menuContent);
    if (ok) {
      toast.success("Kopiert");
    } else {
      toast.error("Kopieren fehlgeschlagen");
    }
  };

  const menuTags = tags
    .filter((t) => menu.tagIds.includes(t.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  const menuLocations = locations
    .filter((l) => menu.locationIds.includes(l.id))
    .sort((a, b) => a.name.localeCompare(b.name));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[80vh] min-h-0 flex-col gap-0 p-0">
        <div className="px-6 pt-6">
          <DialogHeader>
            <DialogTitle>{menu.title}</DialogTitle>
            {menu.description ? (
              <DialogDescription>{menu.description}</DialogDescription>
            ) : null}
          </DialogHeader>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {(menuTags.length > 0 || menuLocations.length > 0) && (
            <div className="space-y-3">
              {menuTags.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {menuTags.map((tag) => (
                    <Badge key={tag.id} variant="secondary">
                      {tag.name}
                    </Badge>
                  ))}
                </div>
              ) : null}

              {menuLocations.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {menuLocations.map((location) => (
                    <Badge key={location.id} variant="outline">
                      {location.name}
                    </Badge>
                  ))}
                </div>
              ) : null}
            </div>
          )}

          {menu.menuContentHtml ? (
            <div
              className="text-sm leading-relaxed [&_p]:mb-2 [&_p:last-child]:mb-0 [&_div]:mb-2 [&_div:last-child]:mb-0 [&_ul]:list-disc [&_ol]:list-decimal [&_ul,&_ol]:pl-6 [&_li]:my-1 [&_table]:my-2 [&_table]:w-full [&_table]:border-collapse [&_td]:align-top [&_th]:align-top [&_td]:border [&_th]:border [&_td]:border-border [&_th]:border-border [&_td]:p-2 [&_th]:p-2"
              dangerouslySetInnerHTML={{ __html: menu.menuContentHtml }}
            />
          ) : (
            <div className="whitespace-pre-wrap text-sm leading-relaxed">
              {menu.menuContent}
            </div>
          )}
        </div>

        <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
          {footerActions}
          <Button type="button" onClick={() => void handleCopy()}>
            Kopieren
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Schließen
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
