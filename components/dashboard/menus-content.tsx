"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

import { useFilteredMenus } from "@/hooks/use-filtered-menus";
import { useMenusUiStore } from "@/store/menus-ui-store";
import { MenusStatsCards } from "@/components/dashboard/menus-stats-cards";

function MenuListItem({
  title,
  description,
}: {
  title: string;
  description: string | null;
}) {
  return (
    <div className="flex flex-col gap-1 p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <h3 className="font-medium line-clamp-1">{title}</h3>
      {description ? (
        <p className="text-sm text-muted-foreground line-clamp-2">
          {description}
        </p>
      ) : null}
    </div>
  );
}

export function MenusContent() {
  const { model, filteredMenus, loading, error } = useFilteredMenus();

  const { viewMode, selectedTagIds, toggleTagId, filterType, setFilterType, sortBy } =
    useMenusUiStore();

  const activeTagsData = React.useMemo(() => {
    if (selectedTagIds.length === 0) return [];
    return model.tags.filter((t) => selectedTagIds.includes(t.id));
  }, [model.tags, selectedTagIds]);

  const hasActiveFilters =
    selectedTagIds.length > 0 || filterType !== "all" || sortBy !== "date-newest";

  if (loading && !model.payload) {
    return (
      <div className="flex-1 w-full overflow-auto">
        <div className="p-4 md:p-6 space-y-6">
          <MenusStatsCards />
          <div className="text-sm text-muted-foreground">Loading menus…</div>
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
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 w-full overflow-auto">
      <div className="p-4 md:p-6 space-y-6">
        <MenusStatsCards />

        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h2 className="text-lg font-semibold">All Menus</h2>
              <p className="text-sm text-muted-foreground">
                {filteredMenus.length} menu{filteredMenus.length !== 1 ? "s" : ""}
                {hasActiveFilters && " (filtered)"}
              </p>
            </div>

            {(activeTagsData.length > 0 || filterType !== "all") && (
              <div className="flex flex-wrap items-center gap-2">
                {filterType !== "all" && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium bg-primary/10 text-primary">
                    {filterType === "favorites" && "Favorites only"}
                    {filterType === "with-tags" && "With tags"}
                    {filterType === "without-tags" && "Without tags"}
                    <button
                      onClick={() => setFilterType("all")}
                      className="hover:bg-primary/20 rounded-full p-0.5"
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
                      onClick={() => toggleTagId(tag.id)}
                      className="hover:bg-primary-foreground/20 rounded-full p-0.5"
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
                <MenuListItem
                  key={menu.id}
                  title={menu.title}
                  description={menu.description}
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col gap-2">
              {filteredMenus.map((menu) => (
                <MenuListItem
                  key={menu.id}
                  title={menu.title}
                  description={menu.description}
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
              <h3 className="text-lg font-medium mb-1">No menus found</h3>
              <p className="text-sm text-muted-foreground max-w-sm mb-4">
                Try adjusting your search or filter to find what you&apos;re looking for.
              </p>
              {hasActiveFilters && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setFilterType("all");
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
