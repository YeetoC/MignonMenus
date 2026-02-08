import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { mapTagRow } from "@/lib/read-model";

export const dynamic = "force-dynamic";

function normalizeName(input: string): string {
  const trimmed = input.trim().replace(/\s+/g, " ");
  if (!trimmed) return "";

  return trimmed
    .split(" ")
    .map((token) => {
      const parts = token.split("-");
      return parts
        .map((part) => {
          if (!part) return part;

          if (part.length <= 3 && /^[a-z]+$/i.test(part)) {
            return part.toUpperCase();
          }

          const lower = part.toLowerCase();
          return lower[0].toUpperCase() + lower.slice(1);
        })
        .join("-");
    })
    .join(" ");
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { name?: unknown } | null;
  const rawName = typeof body?.name === "string" ? body.name : "";
  const name = normalizeName(rawName);

  if (!name) {
    return NextResponse.json({ error: "Missing name" }, { status: 400 });
  }

  const result = await supabase
    .from("tags")
    .upsert({ name }, { onConflict: "name" })
    .select("*")
    .single();

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json(mapTagRow(result.data), { status: 200 });
}
