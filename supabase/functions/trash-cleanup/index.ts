import "jsr:@supabase/functions-js/edge-runtime.d.ts";

import { createClient } from "npm:@supabase/supabase-js@2.49.1";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL");
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

if (!SUPABASE_URL) {
  throw new Error("Missing SUPABASE_URL");
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY");
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false,
    detectSessionInUrl: false,
  },
});

function base64UrlToBase64(input: string) {
  let out = input.replace(/-/g, "+").replace(/_/g, "/");
  const pad = out.length % 4;
  if (pad === 2) out += "==";
  if (pad === 3) out += "=";
  if (pad === 1) out += "===";
  return out;
}

function getRoleFromJwt(token: string): string | null {
  const parts = token.split(".");
  if (parts.length < 2) return null;

  try {
    const payloadJson = atob(base64UrlToBase64(parts[1]!));
    const payload = JSON.parse(payloadJson) as { role?: unknown };
    return typeof payload.role === "string" ? payload.role : null;
  } catch {
    return null;
  }
}

type CleanupResult = {
  ok: boolean;
  cutoffIso: string;
  deletedMenus: number;
  attemptedImageRemovals: number;
  storageRemovalError?: string;
  menuDeleteError?: string;
};

type MenuRow = {
  id: string;
  image_path: string | null;
};

async function isAuthorized(req: Request): Promise<boolean> {
  const providedSecret = req.headers.get("x-trash-cleanup-secret");
  if (!providedSecret) {
    return false;
  }

  const secretResult = await supabase.rpc("get_trash_cleanup_secret");

  if (secretResult.error) {
    console.error(secretResult.error);
    return false;
  }

  return secretResult.data === providedSecret;
}

Deno.serve(async (req: Request) => {
  const headers = {
    "Content-Type": "application/json",
    "Cache-Control": "no-store",
  };

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers,
    });
  }

  if (!(await isAuthorized(req))) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers,
    });
  }

  const cutoffIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

  const result: CleanupResult = {
    ok: true,
    cutoffIso,
    deletedMenus: 0,
    attemptedImageRemovals: 0,
  };

  for (let i = 0; i < 50; i++) {
    const selectResult = await supabase
      .from("menus")
      .select("id, image_path")
      .not("deleted_at", "is", null)
      .lt("deleted_at", cutoffIso)
      .order("deleted_at", { ascending: true })
      .limit(200);

    if (selectResult.error) {
      console.error(selectResult.error);
      return new Response(JSON.stringify({ error: selectResult.error.message }), {
        status: 500,
        headers,
      });
    }

    const rows = (selectResult.data ?? []) as MenuRow[];
    if (rows.length === 0) {
      break;
    }

    const ids = rows.map((r: MenuRow) => r.id);
    const imagePaths = rows
      .map((r: MenuRow) => r.image_path)
      .filter((p: string | null): p is string => typeof p === "string" && p.length > 0);

    if (imagePaths.length > 0) {
      result.attemptedImageRemovals += imagePaths.length;
      const removeResult = await supabase.storage
        .from("menu-images")
        .remove(imagePaths);

      if (removeResult.error) {
        console.error(removeResult.error);
        result.ok = false;
        result.storageRemovalError = removeResult.error.message;
        return new Response(JSON.stringify(result), { status: 500, headers });
      }
    }

    const deleteResult = await supabase.from("menus").delete().in("id", ids);

    if (deleteResult.error) {
      console.error(deleteResult.error);
      result.ok = false;
      result.menuDeleteError = deleteResult.error.message;
      return new Response(JSON.stringify(result), { status: 500, headers });
    }

    result.deletedMenus += ids.length;
  }

  return new Response(JSON.stringify(result), { status: 200, headers });
});
