"use client";

import * as React from "react";

import Image from "next/image";
import { toast } from "sonner";

import { Copy, Heart, UtensilsCrossed } from "lucide-react";

import type { Menu } from "@/lib/read-model";
import { copyTextToClipboard } from "@/lib/clipboard";
import { normalizeNetworkErrorMessage } from "@/lib/http";
import { centsToEurosString } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { setMenuIsFavorite } from "@/hooks/use-bootstrap-data";
import { useMenusModel } from "@/hooks/use-menus-model";

export type MenuCardVariant = "grid" | "list";

interface MenuCardProps {
  menu: Menu;
  variant?: MenuCardVariant;
  onClick: () => void;
}

export function MenuCard({ menu, variant = "grid", onClick }: MenuCardProps) {
  const { refresh } = useMenusModel();

  const [favoritePending, setFavoritePending] = React.useState(false);

  const handleCopyMenuContent = async () => {
    const ok = await copyTextToClipboard(menu.menuContent);
    if (ok) {
      toast.success("Copied");
    } else {
      toast.error("Copy failed");
    }
  };

  const handleToggleFavorite = async () => {
    if (favoritePending) {
      return;
    }

    setFavoritePending(true);
    const next = !menu.isFavorite;
    setMenuIsFavorite(menu.id, next);

    try {
      const res = await fetch(`/api/menus/${menu.id}/favorite`, {
        method: "POST",
        credentials: "include",
        headers: {
          Accept: "application/json",
        },
      });

      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        try {
          const json = (await res.json()) as { error?: string };
          if (json?.error) {
            message = json.error;
          }
        } catch {
          // ignore
        }
        throw new Error(message);
      }

      const json = (await res.json()) as { isFavorite?: boolean };
      if (typeof json.isFavorite === "boolean") {
        setMenuIsFavorite(menu.id, json.isFavorite);
      }
    } catch (error: unknown) {
      setMenuIsFavorite(menu.id, !next);
      const message = normalizeNetworkErrorMessage(
        error,
        error instanceof Error ? error.message : "Could not toggle favorite",
      );
      toast.error(message);
      refresh();
    } finally {
      setFavoritePending(false);
    }
  };

  if (variant === "list") {
    return (
      <div className="group flex items-center gap-3 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
        <button
          type="button"
          className="flex-1 min-w-0 text-left cursor-pointer rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          onClick={onClick}
        >
          <h3 className="font-medium truncate">{menu.title}</h3>
          {menu.description ? (
            <p className="text-sm text-muted-foreground truncate">
              {menu.description}
            </p>
          ) : null}
        </button>

        {menu.pricePerPersonCents != null ? (
          <div className="hidden sm:block text-xs font-medium text-muted-foreground whitespace-nowrap">
            €{centsToEurosString(menu.pricePerPersonCents)} / person
          </div>
        ) : null}

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Copy menu content"
            title="Copy"
            onClick={(e) => {
              e.stopPropagation();
              void handleCopyMenuContent();
            }}
          >
            <Copy className="size-4" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            disabled={favoritePending}
            aria-label={menu.isFavorite ? "Unfavorite" : "Favorite"}
            title={menu.isFavorite ? "Unfavorite" : "Favorite"}
            onClick={(e) => {
              e.stopPropagation();
              void handleToggleFavorite();
            }}
          >
            <Heart
              className={cn(
                "size-4",
                menu.isFavorite && "fill-red-500 text-red-500",
              )}
            />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col rounded-xl border bg-card overflow-hidden hover:bg-accent/30 transition-colors">
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
        <Button
          type="button"
          variant="secondary"
          size="icon-xs"
          className="bg-background/80 backdrop-blur-sm"
          aria-label="Copy menu content"
          title="Copy"
          onClick={async (e) => {
            e.stopPropagation();
            await handleCopyMenuContent();
          }}
        >
          <Copy className="size-4" />
        </Button>
        <Button
          variant="secondary"
          size="icon-xs"
          className="bg-background/80 backdrop-blur-sm"
          disabled={favoritePending}
          aria-label={menu.isFavorite ? "Unfavorite" : "Favorite"}
          title={menu.isFavorite ? "Unfavorite" : "Favorite"}
          onClick={(e) => {
            e.stopPropagation();
            void handleToggleFavorite();
          }}
        >
          <Heart
            className={cn(
              "size-4",
              menu.isFavorite && "fill-red-500 text-red-500",
            )}
          />
        </Button>
      </div>

      {menu.pricePerPersonCents != null ? (
        <div className="absolute bottom-3 right-3 z-10 text-xs font-medium bg-background/80 backdrop-blur-sm rounded-md px-2 py-1">
          €{centsToEurosString(menu.pricePerPersonCents)} / person
        </div>
      ) : null}

      <button
        type="button"
        className="w-full text-left cursor-pointer rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        onClick={onClick}
      >
        <div className="relative h-32 bg-linear-to-br from-muted/50 to-muted flex items-center justify-center">
          {menu.imageUrl ? (
            <Image
              src={menu.imageUrl}
              alt={menu.title}
              fill
              sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
              className="object-cover"
            />
          ) : (
            <div className="size-12 rounded-xl bg-background shadow-sm flex items-center justify-center">
              <UtensilsCrossed className="size-6 text-muted-foreground" />
            </div>
          )}
        </div>

        <div className="p-4 space-y-2">
          <h3 className="font-medium line-clamp-1">{menu.title}</h3>
          {menu.description ? (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {menu.description}
            </p>
          ) : null}
        </div>
      </button>
    </div>
  );
}
