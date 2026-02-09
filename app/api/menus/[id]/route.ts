import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const patchSchema = z
  .object({
    title: z.string().trim().min(1).optional(),
    description: z.string().trim().nullable().optional(),
    menuContent: z.string().trim().min(1).optional(),
    status: z.enum(["active", "archived"]).optional(),
    pricePerPersonCents: z.number().int().min(0).nullable().optional(),
    imagePath: z.string().trim().min(1).nullable().optional(),
    trashed: z.boolean().optional(),
    tagIds: z.array(z.string().uuid()).optional(),
    locationIds: z.array(z.string().uuid()).optional(),
  })
  .strict();

export async function PATCH(
  request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const rawParams = await Promise.resolve(context.params as unknown);
  const parsedParams = paramsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid menu id", details: parsedParams.error.flatten() },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const body = (await request.json().catch(() => null)) as unknown;
  const parsedBody = patchSchema.safeParse(body);

  if (!parsedBody.success) {
    return NextResponse.json(
      { error: "Invalid request", details: parsedBody.error.flatten() },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { id: menuId } = parsedParams.data;
  const {
    title,
    description,
    menuContent,
    status,
    pricePerPersonCents,
    imagePath,
    trashed,
    tagIds,
    locationIds,
  } = parsedBody.data;

  if (
    typeof title === "undefined" &&
    typeof description === "undefined" &&
    typeof menuContent === "undefined" &&
    typeof status === "undefined" &&
    typeof pricePerPersonCents === "undefined" &&
    typeof imagePath === "undefined" &&
    typeof trashed === "undefined" &&
    typeof tagIds === "undefined" &&
    typeof locationIds === "undefined"
  ) {
    return NextResponse.json(
      { error: "No changes provided" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

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

  const updates: {
    title?: string;
    description?: string | null;
    menu_content?: string;
    status?: "active" | "archived";
    price_per_person_cents?: number | null;
    image_path?: string | null;
    deleted_at?: string | null;
  } = {};

  if (typeof title !== "undefined") {
    updates.title = title.trim();
  }

  if (typeof description !== "undefined") {
    const trimmed = (description ?? "").trim();
    updates.description = trimmed ? trimmed : null;
  }

  if (typeof menuContent !== "undefined") {
    updates.menu_content = menuContent.trim();
  }

  if (typeof status !== "undefined") {
    updates.status = status;
  }

  if (typeof pricePerPersonCents !== "undefined") {
    updates.price_per_person_cents = pricePerPersonCents ?? null;
  }

  if (typeof imagePath !== "undefined") {
    updates.image_path = imagePath ?? null;
  }

  if (typeof trashed !== "undefined") {
    updates.deleted_at = trashed ? new Date().toISOString() : null;
  }

  let menuRow: {
    id: string;
    title: string;
    description: string | null;
    menu_content: string;
    price_per_person_cents: number | null;
    image_path: string | null;
    status: string;
    deleted_at: string | null;
    updated_at: string;
  };

  if (Object.keys(updates).length > 0) {
    const result = await supabase
      .from("menus")
      .update(updates)
      .eq("id", menuId)
      .select(
        "id, title, description, menu_content, price_per_person_cents, image_path, status, deleted_at, updated_at",
      )
      .single();

    if (result.error) {
      const statusCode = result.error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json(
        { error: result.error.message },
        { status: statusCode, headers: { "Cache-Control": "no-store" } },
      );
    }

    menuRow = result.data;
  } else {
    const result = await supabase
      .from("menus")
      .select(
        "id, title, description, menu_content, price_per_person_cents, image_path, status, deleted_at, updated_at",
      )
      .eq("id", menuId)
      .single();

    if (result.error) {
      const statusCode = result.error.code === "PGRST116" ? 404 : 500;
      return NextResponse.json(
        { error: result.error.message },
        { status: statusCode, headers: { "Cache-Control": "no-store" } },
      );
    }

    menuRow = result.data;
  }

  if (typeof tagIds !== "undefined") {
    const uniqueTagIds = Array.from(new Set(tagIds)).filter(Boolean);

    const deleteResult = await supabase
      .from("menu_tags")
      .delete()
      .eq("menu_id", menuId);

    if (deleteResult.error) {
      return NextResponse.json(
        { error: deleteResult.error.message },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (uniqueTagIds.length > 0) {
      const insertResult = await supabase.from("menu_tags").insert(
        uniqueTagIds.map((tagId) => ({
          menu_id: menuId,
          tag_id: tagId,
        })),
      );

      if (insertResult.error) {
        return NextResponse.json(
          { error: insertResult.error.message },
          { status: 500, headers: { "Cache-Control": "no-store" } },
        );
      }
    }
  }

  if (typeof locationIds !== "undefined") {
    const uniqueLocationIds = Array.from(new Set(locationIds)).filter(Boolean);

    const deleteResult = await supabase
      .from("menu_locations")
      .delete()
      .eq("menu_id", menuId);

    if (deleteResult.error) {
      return NextResponse.json(
        { error: deleteResult.error.message },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }

    if (uniqueLocationIds.length > 0) {
      const insertResult = await supabase.from("menu_locations").insert(
        uniqueLocationIds.map((locationId) => ({
          menu_id: menuId,
          location_id: locationId,
        })),
      );

      if (insertResult.error) {
        return NextResponse.json(
          { error: insertResult.error.message },
          { status: 500, headers: { "Cache-Control": "no-store" } },
        );
      }
    }
  }

  const imageUrl = menuRow.image_path
    ? supabase.storage.from("menu-images").getPublicUrl(menuRow.image_path).data
        .publicUrl
    : null;

  return NextResponse.json(
    {
      id: menuRow.id,
      title: menuRow.title,
      description: menuRow.description,
      menuContent: menuRow.menu_content,
      pricePerPersonCents: menuRow.price_per_person_cents,
      imagePath: menuRow.image_path,
      imageUrl: imageUrl || null,
      status: menuRow.status as "active" | "archived",
      deletedAt: menuRow.deleted_at,
      updatedAt: menuRow.updated_at,
      ...(typeof tagIds !== "undefined"
        ? { tagIds: Array.from(new Set(tagIds)).filter(Boolean) }
        : {}),
      ...(typeof locationIds !== "undefined"
        ? { locationIds: Array.from(new Set(locationIds)).filter(Boolean) }
        : {}),
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
): Promise<Response> {
  const rawParams = await Promise.resolve(context.params as unknown);
  const parsedParams = paramsSchema.safeParse(rawParams);

  if (!parsedParams.success) {
    return NextResponse.json(
      { error: "Invalid menu id", details: parsedParams.error.flatten() },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const { id: menuId } = parsedParams.data;

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

  const menuResult = await supabase
    .from("menus")
    .select("id, deleted_at, image_path")
    .eq("id", menuId)
    .single();

  if (menuResult.error) {
    const statusCode = menuResult.error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json(
      { error: menuResult.error.message },
      { status: statusCode, headers: { "Cache-Control": "no-store" } },
    );
  }

  if (!menuResult.data.deleted_at) {
    return NextResponse.json(
      { error: "Menu must be in trash to delete permanently" },
      { status: 400, headers: { "Cache-Control": "no-store" } },
    );
  }

  const imagePath = menuResult.data.image_path;

  if (imagePath) {
    const service = getSupabaseServiceClient();
    const removeResult = await service.storage.from("menu-images").remove([imagePath]);
    if (removeResult.error) {
      return NextResponse.json(
        { error: removeResult.error.message },
        { status: 500, headers: { "Cache-Control": "no-store" } },
      );
    }
  }

  const deleteResult = await supabase
    .from("menus")
    .delete()
    .eq("id", menuId)
    .select("id")
    .single();

  if (deleteResult.error) {
    return NextResponse.json(
      { error: deleteResult.error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { ok: true },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
