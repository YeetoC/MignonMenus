import { NextResponse } from "next/server";

import type { Tables } from "@/lib/supabase/database.types";
import { getSupabaseServerClient } from "@/lib/supabase/server";
import type { BootstrapPayload } from "@/lib/read-model";
import { mapLocationRow, mapMenuRow, mapTagRow } from "@/lib/read-model";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401, headers: { "Cache-Control": "no-store" } },
    );
  }

  const [
    menusResult,
    tagsResult,
    locationsResult,
    menuTagsResult,
    menuLocationsResult,
    favoritesResult,
  ] = await Promise.all([
    supabase
      .from("menus")
      .select("*")
      .order("updated_at", { ascending: false })
      .order("title", { ascending: true }),
    supabase.from("tags").select("*").order("name", { ascending: true }),
    supabase
      .from("locations")
      .select("*")
      .order("name", { ascending: true }),
    supabase.from("menu_tags").select("menu_id, tag_id"),
    supabase.from("menu_locations").select("menu_id, location_id"),
    supabase.from("menu_favorites").select("menu_id").eq("user_id", user.id),
  ]);

  if (menusResult.error) {
    return NextResponse.json(
      { error: menusResult.error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (tagsResult.error) {
    return NextResponse.json(
      { error: tagsResult.error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (locationsResult.error) {
    return NextResponse.json(
      { error: locationsResult.error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (menuTagsResult.error) {
    return NextResponse.json(
      { error: menuTagsResult.error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (menuLocationsResult.error) {
    return NextResponse.json(
      { error: menuLocationsResult.error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (favoritesResult.error) {
    return NextResponse.json(
      { error: favoritesResult.error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  const tagIdsByMenuId = new Map<string, string[]>();
  (menuTagsResult.data satisfies Pick<Tables<"menu_tags">, "menu_id" | "tag_id">[]).forEach(
    (row) => {
      const existing = tagIdsByMenuId.get(row.menu_id);
      if (existing) {
        existing.push(row.tag_id);
      } else {
        tagIdsByMenuId.set(row.menu_id, [row.tag_id]);
      }
    },
  );

  const locationIdsByMenuId = new Map<string, string[]>();
  (
    menuLocationsResult.data satisfies Pick<
      Tables<"menu_locations">,
      "menu_id" | "location_id"
    >[]
  ).forEach((row) => {
    const existing = locationIdsByMenuId.get(row.menu_id);
    if (existing) {
      existing.push(row.location_id);
    } else {
      locationIdsByMenuId.set(row.menu_id, [row.location_id]);
    }
  });

  const favoriteMenuIds = new Set(
    favoritesResult.data.map((row) => row.menu_id),
  );

  const publicImageUrlByMenuId = new Map<string, string>();
  menusResult.data.forEach((row) => {
    if (!row.image_path) {
      return;
    }

    const url = supabase.storage
      .from("menu-images")
      .getPublicUrl(row.image_path).data.publicUrl;

    if (url) {
      publicImageUrlByMenuId.set(row.id, url);
    }
  });

  const payload: BootstrapPayload = {
    menus: menusResult.data.map((row) =>
      mapMenuRow(row, {
        tagIds: tagIdsByMenuId.get(row.id) ?? [],
        locationIds: locationIdsByMenuId.get(row.id) ?? [],
        isFavorite: favoriteMenuIds.has(row.id),
        imageUrl: publicImageUrlByMenuId.get(row.id) ?? null,
      }),
    ),
    tags: tagsResult.data.map(mapTagRow),
    locations: locationsResult.data.map(mapLocationRow),
  };

  return NextResponse.json(payload, {
    status: 200,
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
