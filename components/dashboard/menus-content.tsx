"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { X } from "lucide-react";

import { useFilteredMenus } from "@/hooks/use-filtered-menus";
import { useMenusUiStore } from "@/store/menus-ui-store";
import { MenusStatsCards } from "@/components/dashboard/menus-stats-cards";
import { MenuCard } from "@/components/dashboard/menu-card";
import { MenuDialogStickyFooter } from "@/components/dashboard/menu-dialog-sticky-footer";

export function MenusContent() {
  const { model, filteredMenus, initialLoading, error, refresh } =
    useFilteredMenus();

  const {
    viewMode,
    selectedTagIds,
    toggleTagId,
    filterType,
    setFilterType,
    sortBy,
    openedMenuId,
    setOpenedMenuId,
  } = useMenusUiStore();

  const openedMenu = React.useMemo(() => {
    if (!openedMenuId) return null;
    return (
      model.menus.find(
        (m) =>
          m.id === openedMenuId &&
          m.status === "active" &&
          !m.deletedAt,
      ) ?? null
    );
  }, [model.menus, openedMenuId]);

  React.useEffect(() => {
    if (openedMenuId && !openedMenu) {
      setOpenedMenuId(null);
    }
  }, [openedMenu, openedMenuId, setOpenedMenuId]);

  const activeTagsData = React.useMemo(() => {
    if (selectedTagIds.length === 0) return [];
    return model.tags.filter((t) => selectedTagIds.includes(t.id));
  }, [model.tags, selectedTagIds]);

  const hasActiveFilters =
    selectedTagIds.length > 0 || filterType !== "all" || sortBy !== "date-newest";

  if (initialLoading) {
    return (
      <div className="flex-1 w-full overflow-auto">
        <div className="p-4 md:p-6 space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <div
                key={index}
                className="flex items-center gap-4 p-4 rounded-xl border bg-card"
              >
                <Skeleton className="size-10 rounded-lg" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-6 w-14" />
                  <Skeleton className="h-4 w-20" />
                </div>
              </div>
            ))}
          </div>

          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {Array.from({ length: 8 }).map((_, index) => (
                <div
                  key={index}
                  className="relative flex flex-col rounded-xl border bg-card overflow-hidden"
                >
                  <Skeleton className="h-32 w-full rounded-none" />
                  <div className="p-4 space-y-2">
                    <Skeleton className="h-5 w-2/3" />
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-4/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {Array.from({ length: 10 }).map((_, index) => (
                <div
                  key={index}
                  className="flex items-center gap-3 p-4 rounded-lg border bg-card"
                >
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-5 w-1/2" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <Skeleton className="h-8 w-8 rounded-md" />
                  <Skeleton className="h-8 w-8 rounded-md" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error && !model.payload) {
    return (
      <div className="flex-1 w-full overflow-auto">
        <div className="p-4 md:p-6 space-y-6">
          <MenusStatsCards />
          <div className="text-sm text-destructive">{error}</div>
          <div>
            <Button type="button" variant="outline" size="sm" onClick={refresh}>
              Erneut versuchen
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full overflow-auto">
      <div className="p-4 md:p-6 space-y-6">
        <MenusStatsCards />

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

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">Alle Menüs</h2>
              <p className="text-sm text-muted-foreground">
                {filteredMenus.length} {filteredMenus.length !== 1 ? "Menüs" : "Menü"}
                {hasActiveFilters && " (gefiltert)"}
              </p>
            </div>

            {(activeTagsData.length > 0 || filterType !== "all") && (
              <div className="flex flex-wrap items-center gap-2">
                {filterType !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
                    {filterType === "favorites" && "Nur Favoriten"}
                    {filterType === "with-tags" && "Mit Tags"}
                    {filterType === "without-tags" && "Ohne Tags"}
                    <button
                      type="button"
                      aria-label="Filter zurücksetzen"
                      title="Zurücksetzen"
                      onClick={() => setFilterType("all")}
                      className="hover:bg-primary/20 rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                )}
                {activeTagsData.map((tag) => (
                  <span
                    key={tag.id}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary text-primary-foreground"
                  >
                    {tag.name}
                    <button
                      type="button"
                      aria-label={`Tag ${tag.name} entfernen`}
                      title="Entfernen"
                      onClick={() => toggleTagId(tag.id)}
                      className="hover:bg-primary-foreground/20 rounded-full p-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                    >
                      <X className="size-3" />
                    </button>
                  </span>
                ))}
              </div>
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
                <svg
                  className="size-6 text-muted-foreground"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v8m4-4H8"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-medium mb-1">Keine Menüs gefunden</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                Passe deine Suche oder Filter an, um das Gewünschte zu finden.
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterType("all");
                  }}
                >
                  Filter zurücksetzen
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
