"use client";

import * as React from "react";

import { Star } from "lucide-react";

import { Button } from "@/components/ui/button";
import { MenuCard } from "@/components/dashboard/menu-card";
import { MenuDialogStickyFooter } from "@/components/dashboard/menu-dialog-sticky-footer";
import { getFilteredMenus } from "@/lib/menus/get-filtered-menus";
import { useMenusModel } from "@/hooks/use-menus-model";
import { useMenusUiStore } from "@/store/menus-ui-store";

export function FavoritesMenusContent() {
  const { model, loading, error } = useMenusModel();

  const {
    viewMode,
    selectedTagIds,
    searchQuery,
    sortBy,
    openedMenuId,
    setOpenedMenuId,
  } = useMenusUiStore();

  const menus = React.useMemo(() => {
    return model.menus.filter((m) => m.isFavorite && !m.deletedAt);
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
  }, [menus, searchQuery, selectedTagIds, sortBy]);

  if (loading && !model.payload) {
    return (
      <div className="flex-1 w-full overflow-auto">
        <div className="p-4 md:p-6 space-y-6">
          <div className="text-sm text-muted-foreground">Favoriten werden geladen…</div>
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
          />
        ) : null}

        <div className="flex items-center gap-3 p-4 rounded-xl border bg-card">
          <div className="size-10 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center">
            <Star className="size-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold">Favorisierte Menüs</h2>
            <p className="text-sm text-muted-foreground">
              {filteredMenus.length} {filteredMenus.length !== 1 ? "Menüs" : "Menü"} als Favorit markiert
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
              <Star className="size-6 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium mb-1">Noch keine Favoriten</h3>
            <p className="text-sm text-muted-foreground max-w-sm mb-4">
              Markiere Menüs als Favoriten über das Herz-Symbol, um sie hier zu sehen.
            </p>
            <Button type="button" variant="outline" size="sm" onClick={() => window.history.back()}>
              Zurück
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
