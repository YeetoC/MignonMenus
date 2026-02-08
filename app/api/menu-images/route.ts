import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { getSupabaseServerClient } from "@/lib/supabase/server";
import { getSupabaseServiceClient } from "@/lib/supabase/service";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function getExtensionFromFilename(filename: string): string | null {
  const lastDot = filename.lastIndexOf(".");
  if (lastDot === -1) return null;
  const ext = filename.slice(lastDot + 1).trim().toLowerCase();
  if (!ext) return null;
  return ext;
}

function getExtensionFromMimeType(mimeType: string): string | null {
  switch (mimeType) {
    case "image/jpeg":
      return "jpg";
    case "image/png":
      return "png";
    case "image/webp":
      return "webp";
    default:
      return null;
  }
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

  const formData = await request.formData();
  const file = formData.get("file");
  const menuId = formData.get("menuId");
  const existingPath = formData.get("existingPath");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Missing file" }, { status: 400 });
  }

  if (typeof menuId !== "string" || !menuId) {
    return NextResponse.json({ error: "Missing menuId" }, { status: 400 });
  }

  if (menuId.includes("/")) {
    return NextResponse.json({ error: "Invalid menuId" }, { status: 400 });
  }

  if (
    typeof existingPath === "string" &&
    existingPath &&
    !existingPath.startsWith(`menus/${menuId}/`)
  ) {
    return NextResponse.json({ error: "Invalid existingPath" }, { status: 400 });
  }

  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    return NextResponse.json(
      { error: `Unsupported file type: ${file.type || "unknown"}` },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_FILE_BYTES} bytes)` },
      { status: 400 },
    );
  }

  const ext =
    getExtensionFromFilename(file.name) ?? getExtensionFromMimeType(file.type);

  if (!ext) {
    return NextResponse.json({ error: "Could not determine file extension" }, { status: 400 });
  }

  const path = `menus/${menuId}/${randomUUID()}.${ext}`;

  const service = getSupabaseServiceClient();

  const bytes = await file.arrayBuffer();

  const uploadResult = await service.storage
    .from("menu-images")
    .upload(path, bytes, { contentType: file.type, upsert: false });

  if (uploadResult.error) {
    return NextResponse.json({ error: uploadResult.error.message }, { status: 500 });
  }

  if (typeof existingPath === "string" && existingPath) {
    await service.storage.from("menu-images").remove([existingPath]);
  }

  const publicUrl = service.storage
    .from("menu-images")
    .getPublicUrl(path).data.publicUrl;

  return NextResponse.json({ path, publicUrl }, { status: 200 });
}

export async function DELETE(request: Request) {
  const supabase = await getSupabaseServerClient();

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as { path?: unknown } | null;
  const path = typeof body?.path === "string" ? body.path : "";

  if (!path) {
    return NextResponse.json({ error: "Missing path" }, { status: 400 });
  }

  if (!path.startsWith("menus/")) {
    return NextResponse.json({ error: "Invalid path" }, { status: 400 });
  }

  const service = getSupabaseServiceClient();

  const result = await service.storage.from("menu-images").remove([path]);

  if (result.error) {
    return NextResponse.json({ error: result.error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 200 });
}
