export type JsonErrorPayload = {
  error?: string;
};

export async function getErrorMessageFromResponse(
  res: Response,
  fallback?: string,
): Promise<string> {
  const base = fallback ?? `Request failed (${res.status})`;

  try {
    const json = (await res.json()) as JsonErrorPayload;
    if (json?.error) {
      return json.error;
    }
  } catch {
    return base;
  }

  return base;
}

export function normalizeNetworkErrorMessage(
  error: unknown,
  fallback: string,
): string {
  if (error instanceof Error) {
    const message = error.message || fallback;
    if (
      message === "Failed to fetch" ||
      message === "Load failed" ||
      message.toLowerCase().includes("networkerror")
    ) {
      return "Network error. Check your connection and try again.";
    }
    return message;
  }

  const message = String(error);
  if (message.toLowerCase().includes("failed to fetch")) {
    return "Network error. Check your connection and try again.";
  }
  return message || fallback;
}
