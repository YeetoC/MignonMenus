"use client";

import type { ReactNode } from "react";

import type { Location, Menu, Tag } from "@/lib/read-model";
import { copyTextToClipboard } from "@/lib/clipboard";

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
  footerActions?: ReactNode;
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
    const ok = await copyTextToClipboard(menu.menuContent);
    if (ok) {
      toast.success("Copied");
    } else {
      toast.error("Copy failed");
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

          <div className="whitespace-pre-wrap text-sm leading-relaxed">
            {menu.menuContent}
          </div>
        </div>

        <DialogFooter className="shrink-0 border-t bg-background px-6 py-4">
          {footerActions}
          <Button type="button" onClick={() => void handleCopy()}>
            Copy
          </Button>
          <DialogClose asChild>
            <Button type="button" variant="outline">
              Close
            </Button>
          </DialogClose>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
