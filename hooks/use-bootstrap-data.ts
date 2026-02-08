"use client";

import * as React from "react";

import type { BootstrapPayload } from "@/lib/read-model";

type BootstrapState = {
  data: BootstrapPayload | null;
  error: string | null;
  loading: boolean;
};

let state: BootstrapState = {
  data: null,
  error: null,
  loading: true,
};

let inFlight: Promise<BootstrapPayload> | null = null;

const listeners = new Set<() => void>();

function emitChange() {
  listeners.forEach((listener) => listener());
}

function setState(next: BootstrapState) {
  state = next;
  emitChange();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

function getSnapshot() {
  return state;
}

async function loadBootstrapPayload(force: boolean): Promise<BootstrapPayload> {
  if (!force && state.data) {
    return state.data;
  }

  if (!force && inFlight) {
    return inFlight;
  }

  const existingData = state.data;

  setState({
    data: existingData,
    error: null,
    loading: true,
  });

  const request = fetch("/api/bootstrap", {
    method: "GET",
    credentials: "include",
    cache: "no-store",
    headers: {
      Accept: "application/json",
    },
  }).then(async (res) => {
    if (!res.ok) {
      let message = `Request failed (${res.status})`;
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

    return (await res.json()) as BootstrapPayload;
  });

  inFlight = request;

  try {
    const data = await request;
    setState({ data, error: null, loading: false });
    return data;
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    setState({ data: existingData, error: message, loading: false });
    throw error;
  } finally {
    inFlight = null;
  }
}

export function useBootstrapData(): BootstrapState & { refresh: () => void } {
  const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  React.useEffect(() => {
    if (snapshot.data || snapshot.error || inFlight) {
      return;
    }

    void loadBootstrapPayload(false);
  }, [snapshot.data, snapshot.error]);

  const refresh = React.useCallback(() => {
    void loadBootstrapPayload(true);
  }, []);

  return {
    ...snapshot,
    refresh,
  };
}
