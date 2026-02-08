/**
 * Upload a file to Convex storage via a generated upload URL.
 *
 * Flow (per Convex docs):
 *  1. Call `generateUploadUrl` mutation to get a short-lived POST URL.
 *  2. POST the file body to that URL → receive `{ storageId }`.
 *  3. Return the storageId so the caller can persist it (e.g. via `setMenuImage`).
 */
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

  const res = await fetch("/api/menu-images", {
    method: "POST",
    credentials: "include",
    body: formData,
  });

  if (!res.ok) {
    let message = `Upload failed (${res.status})`;
    try {
      const json = (await res.json()) as { error?: string };
      if (json?.error) {
        message = json.error;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }

  return (await res.json()) as { path: string; publicUrl: string };
}

export async function deleteMenuImageFromSupabase(path: string): Promise<void> {
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
    let message = `Delete failed (${res.status})`;
    try {
      const json = (await res.json()) as { error?: string };
      if (json?.error) {
        message = json.error;
      }
    } catch {
      // ignore
    }
    throw new Error(message);
  }
}
