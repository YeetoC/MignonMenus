import type { Id } from "../convex/_generated/dataModel";

/**
 * Upload a file to Convex storage via a generated upload URL.
 *
 * Flow (per Convex docs):
 *  1. Call `generateUploadUrl` mutation to get a short-lived POST URL.
 *  2. POST the file body to that URL → receive `{ storageId }`.
 *  3. Return the storageId so the caller can persist it (e.g. via `setMenuImage`).
 */
export async function uploadFileToConvex(
  file: File,
  generateUploadUrl: () => Promise<string>,
): Promise<Id<"_storage">> {
  // Step 1: get a short-lived upload URL
  const postUrl = await generateUploadUrl();

  // Step 2: POST the file
  const result = await fetch(postUrl, {
    method: "POST",
    headers: { "Content-Type": file.type },
    body: file,
  });

  if (!result.ok) {
    throw new Error(`Upload failed: ${result.status} ${result.statusText}`);
  }

  const { storageId } = (await result.json()) as { storageId: Id<"_storage"> };
  return storageId;
}
