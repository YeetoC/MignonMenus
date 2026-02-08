import type { Tables } from "@/lib/supabase/database.types";

import type { Location, Menu, MenuStatus, Tag } from "./types";

export type TagRow = Tables<"tags">;
export type LocationRow = Tables<"locations">;
export type MenuRow = Tables<"menus">;

function parseMenuStatus(status: string): MenuStatus {
  if (status === "active" || status === "archived") {
    return status;
  }
  throw new Error(`Invalid menu status: ${status}`);
}

export function mapTagRow(row: TagRow): Tag {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapLocationRow(row: LocationRow): Location {
  return {
    id: row.id,
    name: row.name,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapMenuRow(
  row: MenuRow,
  extras?: {
    tagIds?: string[];
    locationIds?: string[];
    isFavorite?: boolean;
    imageUrl?: string | null;
  },
): Menu {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    menuContent: row.menu_content,
    pricePerPersonCents: row.price_per_person_cents,
    imagePath: row.image_path ?? null,
    imageUrl: extras?.imageUrl ?? null,
    status: parseMenuStatus(row.status),
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    tagIds: extras?.tagIds ?? [],
    locationIds: extras?.locationIds ?? [],
    isFavorite: extras?.isFavorite ?? false,
  };
}
