"use client";

import * as React from "react";
import { useShallow } from "zustand/react/shallow";

import { getFilteredMenus } from "@/lib/menus/get-filtered-menus";
import { useMenusModel } from "@/hooks/use-menus-model";
import { useMenusUiStore } from "@/store/menus-ui-store";

export function useFilteredMenus() {
  const { model, loading, initialLoading, refreshing, error, refresh } =
    useMenusModel();

  const baseMenus = React.useMemo(() => {
    return model.menus.filter((m) => m.status === "active" && !m.deletedAt);
  }, [model.menus]);

  const {
    selectedLocationId,
    selectedTagIds,
    searchQuery,
    filterType,
    sortBy,
  } = useMenusUiStore(
    useShallow((s) => ({
      selectedLocationId: s.selectedLocationId,
      selectedTagIds: s.selectedTagIds,
      searchQuery: s.searchQuery,
      filterType: s.filterType,
      sortBy: s.sortBy,
    })),
  );

  const filteredMenus = React.useMemo(() => {
    return getFilteredMenus({
      menus: baseMenus,
      selectedLocationId,
      selectedTagIds,
      searchQuery,
      filterType,
      sortBy,
    });
  }, [
    baseMenus,
    selectedLocationId,
    selectedTagIds,
    searchQuery,
    filterType,
    sortBy,
  ]);

  return {
    model,
    filteredMenus,
    loading,
    initialLoading,
    refreshing,
    error,
    refresh,
  };
}
