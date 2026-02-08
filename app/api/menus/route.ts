import { NextResponse } from "next/server";

import { z } from "zod";

import { mapMenuRow } from "@/lib/read-model";
import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const createMenuSchema = z.object({
  id: z.string().uuid(),
  title: z.string().trim().min(1, "Title is required"),
  description: z.string().trim().optional(),
  menuContent: z.string().trim().min(1, "Menu content is required"),
  status: z.enum(["active", "archived"]).default("active"),
  pricePerPersonCents: z.number().int().min(0).nullable().optional(),
  imagePath: z.string().trim().min(1).nullable().optional(),
  tagIds: z.array(z.string().uuid()).default([]),
  locationIds: z.array(z.string().uuid()).default([]),
});

type CreateMenuInput = z.infer<typeof createMenuSchema>;

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const parsed = createMenuSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const input: CreateMenuInput = parsed.data;

  const tagIds = Array.from(new Set(input.tagIds)).filter(Boolean);
  const locationIds = Array.from(new Set(input.locationIds)).filter(Boolean);

  const description = input.description?.trim() ? input.description.trim() : null;

  const insertResult = await supabase
    .from("menus")
    .insert({
      id: input.id,
      title: input.title.trim(),
      description,
      menu_content: input.menuContent.trim(),
      status: input.status,
      price_per_person_cents: input.pricePerPersonCents ?? null,
      image_path: input.imagePath ?? null,
    })
    .select("*")
    .single();

  if (insertResult.error) {
    return NextResponse.json({ error: insertResult.error.message }, { status: 500 });
  }

  const menuRow = insertResult.data;

  if (tagIds.length > 0) {
    const menuTagsResult = await supabase.from("menu_tags").insert(
      tagIds.map((tagId) => ({
        menu_id: menuRow.id,
        tag_id: tagId,
      })),
    );

    if (menuTagsResult.error) {
      await supabase.from("menus").delete().eq("id", menuRow.id);
      return NextResponse.json({ error: menuTagsResult.error.message }, { status: 500 });
    }
  }

  if (locationIds.length > 0) {
    const menuLocationsResult = await supabase.from("menu_locations").insert(
      locationIds.map((locationId) => ({
        menu_id: menuRow.id,
        location_id: locationId,
      })),
    );

    if (menuLocationsResult.error) {
      await supabase.from("menus").delete().eq("id", menuRow.id);
      return NextResponse.json({ error: menuLocationsResult.error.message }, { status: 500 });
    }
  }

  const imageUrl = menuRow.image_path
    ? supabase.storage
        .from("menu-images")
        .getPublicUrl(menuRow.image_path).data.publicUrl
    : null;

  return NextResponse.json(
    mapMenuRow(menuRow, {
      tagIds,
      locationIds,
      isFavorite: false,
      imageUrl: imageUrl || null,
    }),
    { status: 201, headers: { "Cache-Control": "no-store" } },
  );
}
