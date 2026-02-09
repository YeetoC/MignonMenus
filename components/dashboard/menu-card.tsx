"use client";

import * as React from "react";

import Image from "next/image";
import { toast } from "sonner";

import {
  Archive,
  Copy,
  MoreHorizontal,
  Pencil,
  RotateCcw,
  Trash2,
  UtensilsCrossed,
  XCircle,
  Heart,
} from "lucide-react";

import type { Menu, Tag } from "@/lib/read-model";
import { copyRichTextToClipboard, copyTextToClipboard } from "@/lib/clipboard";
import {
  getErrorMessageFromResponse,
  normalizeNetworkErrorMessage,
} from "@/lib/http";
import { centsToEurosString } from "@/lib/money";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  insertMenuIntoBootstrap,
  patchMenu,
  removeMenuFromBootstrap,
  setMenuDeletedAt,
  setMenuIsFavorite,
  setMenuStatus,
} from "@/hooks/use-bootstrap-data";
import { useMenusModel } from "@/hooks/use-menus-model";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { AddMenuDialog } from "@/components/dashboard/add-menu-dialog";

export type MenuCardVariant = "grid" | "list";

interface MenuCardProps {
  menu: Menu;
  variant?: MenuCardVariant;
  onClick: () => void;
}

export function MenuCard({ menu, variant = "grid", onClick }: MenuCardProps) {
  const { model, refresh } = useMenusModel();

  const [editOpen, setEditOpen] = React.useState(false);

  const menuTags = React.useMemo(() => {
    return menu.tagIds
      .map((tagId) => model.tagById.get(tagId))
      .filter((t): t is Tag => Boolean(t))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [menu.tagIds, model.tagById]);

  const [favoritePending, setFavoritePending] = React.useState(false);

  const handleCopyMenuContent = async () => {
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

  const patchMenuApi = React.useCallback(
    async (
      menuId: string,
      patch: {
        status?: "active" | "archived";
        trashed?: boolean;
      },
    ) => {
      try {
        const res = await fetch(`/api/menus/${menuId}`,
          {
            method: "PATCH",
            credentials: "include",
            headers: {
              Accept: "application/json",
              "Content-Type": "application/json",
            },
            body: JSON.stringify(patch),
          },
        );

        if (!res.ok) {
          const message = await getErrorMessageFromResponse(res);
          throw new Error(message);
        }

        return (await res.json()) as {
          id: string;
          status: "active" | "archived";
          deletedAt: string | null;
          updatedAt: string;
        };
      } catch (error: unknown) {
        const message = normalizeNetworkErrorMessage(
          error,
          error instanceof Error ? error.message : "Request failed",
        );
        throw new Error(message);
      }
    },
    [],
  );

  const deleteMenuApi = React.useCallback(async (menuId: string) => {
    try {
      const res = await fetch(`/api/menus/${menuId}`,
        {
          method: "DELETE",
          credentials: "include",
          headers: {
            Accept: "application/json",
          },
        },
      );

      if (!res.ok) {
        const message = await getErrorMessageFromResponse(res);
        throw new Error(message);
      }
    } catch (error: unknown) {
      const message = normalizeNetworkErrorMessage(
        error,
        error instanceof Error ? error.message : "Request failed",
      );
      throw new Error(message);
    }
  }, []);

  const handleArchive = React.useCallback(async () => {
    const prevMenu = model.menus.find((m) => m.id === menu.id) ?? null;
    setMenuStatus(menu.id, "archived");

    try {
      const json = await patchMenuApi(menu.id, { status: "archived" });
      patchMenu(menu.id, {
        status: json.status,
        deletedAt: json.deletedAt,
        updatedAt: json.updatedAt,
      });
      toast.success("Archiviert");
    } catch (error: unknown) {
      if (prevMenu) {
        patchMenu(menu.id, prevMenu);
      }
      const message = error instanceof Error ? error.message : "Archivieren fehlgeschlagen";
      toast.error(message);
      refresh();
    }
  }, [menu.id, model.menus, patchMenuApi, refresh]);

  const handleUnarchive = React.useCallback(async () => {
    const prevMenu = model.menus.find((m) => m.id === menu.id) ?? null;
    setMenuStatus(menu.id, "active");

    try {
      const json = await patchMenuApi(menu.id, { status: "active" });
      patchMenu(menu.id, {
        status: json.status,
        deletedAt: json.deletedAt,
        updatedAt: json.updatedAt,
      });
      toast.success("Wiederhergestellt");
    } catch (error: unknown) {
      if (prevMenu) {
        patchMenu(menu.id, prevMenu);
      }
      const message = error instanceof Error ? error.message : "Wiederherstellen fehlgeschlagen";
      toast.error(message);
      refresh();
    }
  }, [menu.id, model.menus, patchMenuApi, refresh]);

  const handleMoveToTrash = React.useCallback(async () => {
    const prevMenu = model.menus.find((m) => m.id === menu.id) ?? null;
    const optimisticDeletedAt = new Date().toISOString();
    setMenuDeletedAt(menu.id, optimisticDeletedAt);

    try {
      const json = await patchMenuApi(menu.id, { trashed: true });
      patchMenu(menu.id, {
        status: json.status,
        deletedAt: json.deletedAt,
        updatedAt: json.updatedAt,
      });
      toast.success("In den Papierkorb verschoben");
    } catch (error: unknown) {
      if (prevMenu) {
        patchMenu(menu.id, prevMenu);
      }
      const message = error instanceof Error ? error.message : "Löschen fehlgeschlagen";
      toast.error(message);
      refresh();
    }
  }, [menu.id, model.menus, patchMenuApi, refresh]);

  const handleRestoreFromTrash = React.useCallback(async () => {
    const prevMenu = model.menus.find((m) => m.id === menu.id) ?? null;
    setMenuDeletedAt(menu.id, null);

    try {
      const json = await patchMenuApi(menu.id, { trashed: false });
      patchMenu(menu.id, {
        status: json.status,
        deletedAt: json.deletedAt,
        updatedAt: json.updatedAt,
      });
      toast.success("Aus dem Papierkorb wiederhergestellt");
    } catch (error: unknown) {
      if (prevMenu) {
        patchMenu(menu.id, prevMenu);
      }
      const message = error instanceof Error ? error.message : "Wiederherstellen fehlgeschlagen";
      toast.error(message);
      refresh();
    }
  }, [menu.id, model.menus, patchMenuApi, refresh]);

  const handleDeletePermanently = React.useCallback(async () => {
    const prevMenu = model.menus.find((m) => m.id === menu.id) ?? null;
    const prevIndex = model.menus.findIndex((m) => m.id === menu.id);

    removeMenuFromBootstrap(menu.id);

    try {
      await deleteMenuApi(menu.id);
      toast.success("Endgültig gelöscht");
    } catch (error: unknown) {
      if (prevMenu) {
        insertMenuIntoBootstrap(prevMenu, prevIndex >= 0 ? prevIndex : 0);
      }
      const message = error instanceof Error ? error.message : "Löschen fehlgeschlagen";
      toast.error(message);
      refresh();
    }
  }, [deleteMenuApi, menu.id, model.menus, refresh]);

  const menuActions = React.useMemo(() => {
    if (menu.deletedAt) {
      return {
        archiveLabel: null,
        archiveIcon: null,
        onArchive: null,
        deleteLabel: "Endgültig löschen",
        deleteIcon: XCircle,
        onDelete: handleDeletePermanently,
        restoreLabel: "Wiederherstellen",
        restoreIcon: RotateCcw,
        onRestore: handleRestoreFromTrash,
      } as const;
    }

    if (menu.status === "archived") {
      return {
        archiveLabel: "Wiederherstellen",
        archiveIcon: RotateCcw,
        onArchive: handleUnarchive,
        deleteLabel: "In Papierkorb",
        deleteIcon: Trash2,
        onDelete: handleMoveToTrash,
        restoreLabel: null,
        restoreIcon: null,
        onRestore: null,
      } as const;
    }

    return {
      archiveLabel: "Archivieren",
      archiveIcon: Archive,
      onArchive: handleArchive,
      deleteLabel: "In Papierkorb",
      deleteIcon: Trash2,
      onDelete: handleMoveToTrash,
      restoreLabel: null,
      restoreIcon: null,
      onRestore: null,
    } as const;
  }, [
    handleArchive,
    handleDeletePermanently,
    handleMoveToTrash,
    handleRestoreFromTrash,
    handleUnarchive,
    menu.deletedAt,
    menu.status,
  ]);

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
        error instanceof Error ? error.message : "Favorit konnte nicht geändert werden",
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
        <AddMenuDialog open={editOpen} onOpenChange={setEditOpen} menu={menu} />

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
          {menuTags.length > 0 ? (
            <div className="hidden sm:flex items-center gap-1 mt-1">
              {menuTags.slice(0, 2).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0.5"
                >
                  {tag.name}
                </Badge>
              ))}
              {menuTags.length > 2 ? (
                <span className="text-[10px] text-muted-foreground">
                  +{menuTags.length - 2}
                </span>
              ) : null}
            </div>
          ) : null}
        </button>

        {menu.pricePerPersonCents != null ? (
          <div className="hidden sm:block text-xs font-medium text-muted-foreground whitespace-nowrap">
            €{centsToEurosString(menu.pricePerPersonCents)} / Person
          </div>
        ) : null}

        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            aria-label="Menüinhalt kopieren"
            title="Kopieren"
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
            aria-label={menu.isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
            title={menu.isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
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

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="icon-xs"
                aria-label="Optionen"
                title="Optionen"
                onClick={(e) => e.stopPropagation()}
              >
                <MoreHorizontal className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => void handleCopyMenuContent()}>
                <Copy className="size-4" />
                Kopieren
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setEditOpen(true)}>
                <Pencil className="size-4" />
                Bearbeiten
              </DropdownMenuItem>

              {menuActions.onRestore ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void menuActions.onRestore?.()}>
                    {menuActions.restoreIcon ? (
                      <menuActions.restoreIcon className="size-4" />
                    ) : null}
                    {menuActions.restoreLabel}
                  </DropdownMenuItem>
                </>
              ) : null}

              {menuActions.onArchive ? (
                <>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => void menuActions.onArchive?.()}>
                    {menuActions.archiveIcon ? (
                      <menuActions.archiveIcon className="size-4" />
                    ) : null}
                    {menuActions.archiveLabel}
                  </DropdownMenuItem>
                </>
              ) : null}

              <DropdownMenuSeparator />
              <DropdownMenuItem
                variant="destructive"
                onClick={() => void menuActions.onDelete?.()}
              >
                {menuActions.deleteIcon ? (
                  <menuActions.deleteIcon className="size-4" />
                ) : null}
                {menuActions.deleteLabel}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    );
  }

  return (
    <div className="group relative flex flex-col rounded-xl border bg-card overflow-hidden hover:bg-accent/30 transition-colors">
      <div className="absolute top-3 right-3 z-10 flex items-center gap-1">
        <AddMenuDialog open={editOpen} onOpenChange={setEditOpen} menu={menu} />

        <Button
          type="button"
          variant="secondary"
          size="icon-xs"
          className="bg-background/80 backdrop-blur-sm"
          aria-label="Menüinhalt kopieren"
          title="Kopieren"
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
          aria-label={menu.isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
          title={menu.isFavorite ? "Aus Favoriten entfernen" : "Zu Favoriten hinzufügen"}
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

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              type="button"
              variant="secondary"
              size="icon-xs"
              className="bg-background/80 backdrop-blur-sm"
              aria-label="Optionen"
              title="Optionen"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="size-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => void handleCopyMenuContent()}>
              <Copy className="size-4" />
              Kopieren
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setEditOpen(true)}>
              <Pencil className="size-4" />
              Bearbeiten
            </DropdownMenuItem>

            {menuActions.onRestore ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void menuActions.onRestore?.()}>
                  {menuActions.restoreIcon ? (
                    <menuActions.restoreIcon className="size-4" />
                  ) : null}
                  {menuActions.restoreLabel}
                </DropdownMenuItem>
              </>
            ) : null}

            {menuActions.onArchive ? (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => void menuActions.onArchive?.()}>
                  {menuActions.archiveIcon ? (
                    <menuActions.archiveIcon className="size-4" />
                  ) : null}
                  {menuActions.archiveLabel}
                </DropdownMenuItem>
              </>
            ) : null}

            <DropdownMenuSeparator />
            <DropdownMenuItem
              variant="destructive"
              onClick={() => void menuActions.onDelete?.()}
            >
              {menuActions.deleteIcon ? (
                <menuActions.deleteIcon className="size-4" />
              ) : null}
              {menuActions.deleteLabel}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {menu.pricePerPersonCents != null ? (
        <div className="absolute bottom-3 right-3 z-10 text-xs font-medium bg-background/80 backdrop-blur-sm rounded-md px-2 py-1">
          €{centsToEurosString(menu.pricePerPersonCents)} / Person
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
          {menuTags.length > 0 ? (
            <div className="flex flex-wrap gap-1 pt-1">
              {menuTags.slice(0, 3).map((tag) => (
                <Badge
                  key={tag.id}
                  variant="secondary"
                  className="text-[10px] px-1.5 py-0.5"
                >
                  {tag.name}
                </Badge>
              ))}
              {menuTags.length > 3 ? (
                <span className="text-[10px] text-muted-foreground py-0.5">
                  +{menuTags.length - 3} weitere
                </span>
              ) : null}
            </div>
          ) : null}
        </div>
      </button>
    </div>
  );
}
