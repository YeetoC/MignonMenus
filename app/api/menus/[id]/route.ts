import { NextResponse } from "next/server";

import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

const patchSchema = z
  .object({
    status: z.enum(["active", "archived"]).optional(),
    trashed: z.boolean().optional(),
  })
  .strict();

export async function PATCH(
  request: Request,
  context: { params: { id: string } },
) {
  const parsedParams = paramsSchema.safeParse(context.params);

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
  const { status, trashed } = parsedBody.data;

  if (typeof status === "undefined" && typeof trashed === "undefined") {
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
    status?: "active" | "archived";
    deleted_at?: string | null;
  } = {};

  if (typeof status !== "undefined") {
    updates.status = status;
  }

  if (typeof trashed !== "undefined") {
    updates.deleted_at = trashed ? new Date().toISOString() : null;
  }

  const result = await supabase
    .from("menus")
    .update(updates)
    .eq("id", menuId)
    .select("id, status, deleted_at, updated_at")
    .single();

  if (result.error) {
    const statusCode = result.error.code === "PGRST116" ? 404 : 500;
    return NextResponse.json(
      { error: result.error.message },
      { status: statusCode, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    {
      id: result.data.id,
      status: result.data.status,
      deletedAt: result.data.deleted_at,
      updatedAt: result.data.updated_at,
    },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}

export async function DELETE(
  _request: Request,
  context: { params: { id: string } },
) {
  const parsedParams = paramsSchema.safeParse(context.params);

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
