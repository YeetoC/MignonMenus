"use client";

import * as React from "react";

import { Trash2, RotateCcw, XCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MenuCard } from "@/components/dashboard/menu-card";
import { MenuDialogStickyFooter } from "@/components/dashboard/menu-dialog-sticky-footer";
import { getFilteredMenus } from "@/lib/menus/get-filtered-menus";
import { getErrorMessageFromResponse, normalizeNetworkErrorMessage } from "@/lib/http";
import { useMenusModel } from "@/hooks/use-menus-model";
import { useMenusUiStore } from "@/store/menus-ui-store";
import {
  patchMenu,
  insertMenuIntoBootstrap,
  removeMenuFromBootstrap,
  setMenuDeletedAt,
} from "@/hooks/use-bootstrap-data";

async function patchMenuApi(menuId: string, patch: { trashed: boolean }) {
  try {
    const res = await fetch(`/api/menus/${menuId}`, {
      method: "PATCH",
      credentials: "include",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(patch),
    });

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
}

async function deleteMenuApi(menuId: string) {
  try {
    const res = await fetch(`/api/menus/${menuId}`, {
      method: "DELETE",
      credentials: "include",
      headers: {
        Accept: "application/json",
      },
    });

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
}

export function TrashMenusContent() {
  const { model, loading, error, refresh } = useMenusModel();

  const {
    viewMode,
    selectedTagIds,
    searchQuery,
    sortBy,
    openedMenuId,
    setOpenedMenuId,
  } = useMenusUiStore();

  const menus = React.useMemo(() => {
    return model.menus.filter((m) => Boolean(m.deletedAt));
  }, [model.menus]);

  const openedMenu = React.useMemo(() => {
    if (!openedMenuId) return null;
    return model.menus.find((m) => m.id === openedMenuId) ?? null;
  }, [model.menus, openedMenuId]);

  React.useEffect(() => {
    if (openedMenuId && !openedMenu) {
      setOpenedMenuId(null);
    }
  }, [openedMenu, openedMenuId, setOpenedMenuId]);

  const filteredMenus = React.useMemo(() => {
    return getFilteredMenus({
      menus,
      selectedLocationId: "all",
      selectedTagIds,
      searchQuery,
      filterType: "all",
      sortBy,
    });
  }, [menus, selectedTagIds, searchQuery, sortBy]);

  const handleRestore = async (menuId: string) => {
    const prev = openedMenu;

    setMenuDeletedAt(menuId, null);

    try {
      const json = await patchMenuApi(menuId, { trashed: false });
      patchMenu(menuId, {
        status: json.status,
        deletedAt: json.deletedAt,
        updatedAt: json.updatedAt,
      });
      toast.success("Aus dem Papierkorb wiederhergestellt");
      setOpenedMenuId(null);
    } catch (error: unknown) {
      if (prev) {
        patchMenu(menuId, prev);
      }
      const message = error instanceof Error ? error.message : "Wiederherstellen fehlgeschlagen";
      toast.error(message);
      refresh();
    }
  };

  const handleDeletePermanently = async (menuId: string) => {
    const prevMenu = model.menus.find((m) => m.id === menuId) ?? null;
    const prevIndex = model.menus.findIndex((m) => m.id === menuId);

    removeMenuFromBootstrap(menuId);

    try {
      await deleteMenuApi(menuId);
      toast.success("Endgültig gelöscht");
      setOpenedMenuId(null);
    } catch (error: unknown) {
      if (prevMenu) {
        insertMenuIntoBootstrap(prevMenu, prevIndex >= 0 ? prevIndex : 0);
      }
      const message = error instanceof Error ? error.message : "Löschen fehlgeschlagen";
      toast.error(message);
      refresh();
    }
  };

  if (loading && !model.payload) {
    return (
      <div className="flex-1 w-full overflow-auto">
        <div className="p-4 md:p-6 space-y-6">
          <div className="text-sm text-muted-foreground">Papierkorb wird geladen…</div>
        </div>
      </div>
    );
  }

  if (error && !model.payload) {
    return (
      <div className="flex-1 w-full overflow-auto">
        <div className="p-4 md:p-6 space-y-6">
          <div className="text-sm text-destructive">{error}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full overflow-auto">
      <div className="p-4 md:p-6 space-y-6">
        {openedMenu ? (
          <MenuDialogStickyFooter
            open={true}
            onOpenChange={(open) => {
              if (!open) {
                setOpenedMenuId(null);
              }
            }}
            menu={openedMenu}
            tags={model.tags}
            locations={model.locations}
            footerActions={
              <>
                <Button
                  type="button"
                  variant="outline"
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  onClick={() => void handleRestore(openedMenu.id)}
                >
                  <RotateCcw className="size-4" />
                  Wiederherstellen
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  className="focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                  onClick={() => void handleDeletePermanently(openedMenu.id)}
                >
                  <XCircle className="size-4" />
                  Endgültig löschen
                </Button>
              </>
            }
          />
        ) : null}

        <div className="flex items-center justify-between gap-4 p-4 rounded-xl border bg-card">
          <div className="flex items-center gap-3">
            <div className="size-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center">
              <Trash2 className="size-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold">Papierkorb</h2>
              <p className="text-sm text-muted-foreground">
                {filteredMenus.length} {filteredMenus.length !== 1 ? "Menüs" : "Menü"} im Papierkorb
              </p>
            </div>
          </div>
          {filteredMenus.length > 0 && (
            <p className="text-xs text-muted-foreground hidden sm:block">
              Einträge im Papierkorb werden nach 30 Tagen endgültig gelöscht
            </p>
          )}
        </div>

        {viewMode === "grid" ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filteredMenus.map((menu) => (
              <MenuCard
                key={menu.id}
                menu={menu}
                variant="grid"
                onClick={() => setOpenedMenuId(menu.id)}
              />
            ))}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            {filteredMenus.map((menu) => (
              <MenuCard
                key={menu.id}
                menu={menu}
                variant="list"
                onClick={() => setOpenedMenuId(menu.id)}
              />
            ))}
          </div>
        )}

        {filteredMenus.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <div className="size-12 rounded-full bg-muted flex items-center justify-center mb-4">
              <Trash2 className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">Papierkorb ist leer</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Gelöschte Menüs werden hier angezeigt. Du kannst sie wiederherstellen oder endgültig löschen.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
