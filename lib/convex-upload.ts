/**
 * Upload a file to Convex storage via a generated upload URL.
 *
 * Flow (per Convex docs):
 *  1. Call `generateUploadUrl` mutation to get a short-lived POST URL.
 *  2. POST the file body to that URL → receive `{ storageId }`.
 *  3. Return the storageId so the caller can persist it (e.g. via `setMenuImage`).
 */
import { getErrorMessageFromResponse, normalizeNetworkErrorMessage } from "@/lib/http";

export async function uploadMenuImageToSupabase(args: {
  file: File;
  menuId: string;
  existingPath?: string | null;
}): Promise<{ path: string; publicUrl: string }> {
  const formData = new FormData();
  formData.set("file", args.file);
  formData.set("menuId", args.menuId);
  if (args.existingPath) {
    formData.set("existingPath", args.existingPath);
  }

  try {
    const res = await fetch("/api/menu-images", {
      method: "POST",
      credentials: "include",
      body: formData,
    });

    if (!res.ok) {
      const message = await getErrorMessageFromResponse(
        res,
        `Upload failed (${res.status})`,
      );
      throw new Error(message);
    }

    return (await res.json()) as { path: string; publicUrl: string };
  } catch (error: unknown) {
    const message = normalizeNetworkErrorMessage(
      error,
      error instanceof Error ? error.message : "Upload failed",
    );
    throw new Error(message);
  }
}

export async function deleteMenuImageFromSupabase(path: string): Promise<void> {
  try {
    const res = await fetch("/api/menu-images", {
      method: "DELETE",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({ path }),
    });

    if (!res.ok) {
      const message = await getErrorMessageFromResponse(
        res,
        `Delete failed (${res.status})`,
      );
      throw new Error(message);
    }
  } catch (error: unknown) {
    const message = normalizeNetworkErrorMessage(
      error,
      error instanceof Error ? error.message : "Delete failed",
    );
    throw new Error(message);
  }
}
