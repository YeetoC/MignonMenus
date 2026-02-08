import { NextResponse } from "next/server";

import { z } from "zod";

import { getSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const paramsSchema = z.object({
  id: z.string().uuid(),
});

export async function POST(
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

  const deleteResult = await supabase
    .from("menu_favorites")
    .delete()
    .eq("user_id", user.id)
    .eq("menu_id", menuId)
    .select("menu_id");

  if (deleteResult.error) {
    return NextResponse.json(
      { error: deleteResult.error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  if ((deleteResult.data?.length ?? 0) > 0) {
    return NextResponse.json(
      { isFavorite: false },
      { status: 200, headers: { "Cache-Control": "no-store" } },
    );
  }

  const insertResult = await supabase.from("menu_favorites").insert({
    user_id: user.id,
    menu_id: menuId,
  });

  if (insertResult.error) {
    return NextResponse.json(
      { error: insertResult.error.message },
      { status: 500, headers: { "Cache-Control": "no-store" } },
    );
  }

  return NextResponse.json(
    { isFavorite: true },
    { status: 200, headers: { "Cache-Control": "no-store" } },
  );
}
