"use client";

import * as React from "react";
import { useShallow } from "zustand/react/shallow";

import { getFilteredMenus } from "@/lib/menus/get-filtered-menus";
import { useMenusModel } from "@/hooks/use-menus-model";
import { useMenusUiStore } from "@/store/menus-ui-store";

export function useFilteredMenus() {
  const { model, loading, error, refresh } = useMenusModel();

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
      menus: model.menus,
      selectedLocationId,
      selectedTagIds,
      searchQuery,
      filterType,
      sortBy,
    });
  }, [
    model.menus,
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
    error,
    refresh,
  };
}
