import { create } from "zustand";

export type ViewMode = "grid" | "list";
export type SortBy = "date-newest" | "date-oldest" | "alpha-az" | "alpha-za";
export type FilterType = "all" | "favorites" | "with-tags" | "without-tags";

export type SelectedLocationId = "all" | "unassigned" | string;

interface MenusUiState {
  selectedLocationId: SelectedLocationId;
  selectedTagIds: string[];
  searchQuery: string;
  viewMode: ViewMode;
  sortBy: SortBy;
  filterType: FilterType;
  openedMenuId: string | null;
  addMenuOpen: boolean;

  setSelectedLocationId: (locationId: SelectedLocationId) => void;
  toggleTagId: (tagId: string) => void;
  clearTagIds: () => void;
  setSearchQuery: (query: string) => void;
  setViewMode: (mode: ViewMode) => void;
  setSortBy: (sort: SortBy) => void;
  setFilterType: (filter: FilterType) => void;
  setOpenedMenuId: (menuId: string | null) => void;
  setAddMenuOpen: (open: boolean) => void;
}

export const useMenusUiStore = create<MenusUiState>((set) => ({
  selectedLocationId: "all",
  selectedTagIds: [],
  searchQuery: "",
  viewMode: "grid",
  sortBy: "date-newest",
  filterType: "all",
  openedMenuId: null,
  addMenuOpen: false,

  setSelectedLocationId: (locationId) =>
    set({ selectedLocationId: locationId, selectedTagIds: [] }),

  toggleTagId: (tagId) =>
    set((state) => ({
      selectedTagIds: state.selectedTagIds.includes(tagId)
        ? state.selectedTagIds.filter((t) => t !== tagId)
        : [...state.selectedTagIds, tagId],
    })),

  clearTagIds: () => set({ selectedTagIds: [] }),

  setSearchQuery: (query) => set({ searchQuery: query }),

  setViewMode: (mode) => set({ viewMode: mode }),

  setSortBy: (sort) => set({ sortBy: sort }),

  setFilterType: (filter) => set({ filterType: filter }),

  setOpenedMenuId: (menuId) => set({ openedMenuId: menuId }),

  setAddMenuOpen: (open) => set({ addMenuOpen: open }),
}));
