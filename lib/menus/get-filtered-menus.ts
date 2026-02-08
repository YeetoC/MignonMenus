import type { Menu } from "@/lib/read-model";

import type { FilterType, SelectedLocationId, SortBy } from "@/store/menus-ui-store";

type GetFilteredMenusArgs = {
  menus: Menu[];
  selectedLocationId: SelectedLocationId;
  selectedTagIds: string[];
  searchQuery: string;
  filterType: FilterType;
  sortBy: SortBy;
};

function normalizeText(value: string) {
  return value.trim().toLowerCase();
}

function compareDatesDesc(a: string, b: string) {
  return new Date(b).getTime() - new Date(a).getTime();
}

function compareDatesAsc(a: string, b: string) {
  return new Date(a).getTime() - new Date(b).getTime();
}

export function getFilteredMenus({
  menus,
  selectedLocationId,
  selectedTagIds,
  searchQuery,
  filterType,
  sortBy,
}: GetFilteredMenusArgs): Menu[] {
  const query = normalizeText(searchQuery);

  let filtered = menus;

  if (selectedLocationId !== "all") {
    if (selectedLocationId === "unassigned") {
      filtered = filtered.filter((m) => m.locationIds.length === 0);
    } else {
      filtered = filtered.filter((m) => m.locationIds.includes(selectedLocationId));
    }
  }

  if (selectedTagIds.length > 0) {
    filtered = filtered.filter((m) => selectedTagIds.some((tagId) => m.tagIds.includes(tagId)));
  }

  if (query) {
    filtered = filtered.filter((m) => {
      const title = normalizeText(m.title);
      const description = normalizeText(m.description ?? "");
      return title.includes(query) || description.includes(query);
    });
  }

  switch (filterType) {
    case "favorites":
      filtered = filtered.filter((m) => m.isFavorite);
      break;
    case "with-tags":
      filtered = filtered.filter((m) => m.tagIds.length > 0);
      break;
    case "without-tags":
      filtered = filtered.filter((m) => m.tagIds.length === 0);
      break;
    case "all":
      break;
  }

  const sorted = [...filtered];

  switch (sortBy) {
    case "date-newest":
      sorted.sort((a, b) => {
        const diff = compareDatesDesc(a.updatedAt, b.updatedAt);
        if (diff !== 0) return diff;
        return a.title.localeCompare(b.title);
      });
      break;
    case "date-oldest":
      sorted.sort((a, b) => {
        const diff = compareDatesAsc(a.updatedAt, b.updatedAt);
        if (diff !== 0) return diff;
        return a.title.localeCompare(b.title);
      });
      break;
    case "alpha-az":
      sorted.sort((a, b) => {
        const diff = a.title.localeCompare(b.title);
        if (diff !== 0) return diff;
        return compareDatesDesc(a.updatedAt, b.updatedAt);
      });
      break;
    case "alpha-za":
      sorted.sort((a, b) => {
        const diff = b.title.localeCompare(a.title);
        if (diff !== 0) return diff;
        return compareDatesDesc(a.updatedAt, b.updatedAt);
      });
      break;
  }

  return sorted;
}
