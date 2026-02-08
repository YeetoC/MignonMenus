"use client";

import * as React from "react";

import { Archive, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { MenuCard } from "@/components/dashboard/menu-card";
import { MenuDialogStickyFooter } from "@/components/dashboard/menu-dialog-sticky-footer";
import { getFilteredMenus } from "@/lib/menus/get-filtered-menus";
import { useMenusModel } from "@/hooks/use-menus-model";
import { useMenusUiStore } from "@/store/menus-ui-store";
import { patchMenu, setMenuDeletedAt, setMenuStatus } from "@/hooks/use-bootstrap-data";

async function patchMenuApi(
  menuId: string,
  patch: { status?: "active" | "archived"; trashed?: boolean },
) {
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

  return (await res.json()) as {
    id: string;
    status: "active" | "archived";
    deletedAt: string | null;
    updatedAt: string;
  };
}

export function ArchiveMenusContent() {
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
    return model.menus.filter((m) => m.status === "archived" && !m.deletedAt);
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

  const handleUnarchive = async (menuId: string) => {
    const prevMenu = model.menus.find((m) => m.id === menuId) ?? null;

    setMenuStatus(menuId, "active");

    try {
      const json = await patchMenuApi(menuId, { status: "active" });
      patchMenu(menuId, {
        status: json.status,
        deletedAt: json.deletedAt,
        updatedAt: json.updatedAt,
      });
      toast.success("Restored from archive");
      setOpenedMenuId(null);
    } catch (error: unknown) {
      if (prevMenu) {
        patchMenu(menuId, prevMenu);
      }
      const message = error instanceof Error ? error.message : "Could not unarchive";
      toast.error(message);
      refresh();
    }
  };

  const handleMoveToTrash = async (menuId: string) => {
    const prevMenu = model.menus.find((m) => m.id === menuId) ?? null;

    const optimisticDeletedAt = new Date().toISOString();
    setMenuDeletedAt(menuId, optimisticDeletedAt);

    try {
      const json = await patchMenuApi(menuId, { trashed: true });
      patchMenu(menuId, {
        status: json.status,
        deletedAt: json.deletedAt,
        updatedAt: json.updatedAt,
      });
      toast.success("Moved to trash");
      setOpenedMenuId(null);
    } catch (error: unknown) {
      if (prevMenu) {
        patchMenu(menuId, prevMenu);
      }
      const message = error instanceof Error ? error.message : "Could not move to trash";
      toast.error(message);
      refresh();
    }
  };

  if (loading && !model.payload) {
    return (
      <div className="flex-1 w-full overflow-auto">
        <div className="p-4 md:p-6 space-y-6">
          <div className="text-sm text-muted-foreground">Loading archive…</div>
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
                  onClick={() => void handleUnarchive(openedMenu.id)}
                >
                  <RotateCcw className="size-4" />
                  Restore
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => void handleMoveToTrash(openedMenu.id)}
                >
                  <Trash2 className="size-4" />
                  Move to Trash
                </Button>
              </>
            }
          />
        ) : null}

        <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
          <div className="size-10 rounded-lg bg-violet-500/10 text-violet-500 flex items-center justify-center">
            <Archive className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Archived Menus</h2>
            <p className="text-sm text-muted-foreground">
              {filteredMenus.length} menu{filteredMenus.length !== 1 ? "s" : ""} in archive
            </p>
          </div>
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
              <Archive className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">Archive is empty</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              Archived menus will appear here.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
