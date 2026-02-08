"use client";

import * as React from "react";

import { toast } from "sonner";

import { getErrorMessageFromResponse, normalizeNetworkErrorMessage } from "@/lib/http";
import type { BootstrapPayload, Menu, MenuStatus } from "@/lib/read-model";

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

let lastBackgroundErrorToast: { message: string; atMs: number } | null = null;

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

function maybeToastBackgroundError(message: string) {
  const now = Date.now();
  if (
    lastBackgroundErrorToast &&
    lastBackgroundErrorToast.message === message &&
    now - lastBackgroundErrorToast.atMs < 10_000
  ) {
    return;
  }
  lastBackgroundErrorToast = { message, atMs: now };
  toast.error(message);
}

export function patchBootstrapPayload(
  updater: (prev: BootstrapPayload) => BootstrapPayload,
) {
  if (!state.data) {
    return;
  }

  const nextData = updater(state.data);

  setState({
    data: nextData,
    error: state.error,
    loading: state.loading,
  });
}

export function setMenuIsFavorite(menuId: string, isFavorite: boolean) {
  patchBootstrapPayload((prev) => ({
    ...prev,
    menus: prev.menus.map((menu) =>
      menu.id === menuId ? { ...menu, isFavorite } : menu,
    ),
  }));
}

export function patchMenu(menuId: string, patch: Partial<Menu>) {
  patchBootstrapPayload((prev) => ({
    ...prev,
    menus: prev.menus.map((menu) =>
      menu.id === menuId ? { ...menu, ...patch } : menu,
    ),
  }));
}

export function insertMenuIntoBootstrap(menu: Menu, index: number) {
  patchBootstrapPayload((prev) => {
    const without = prev.menus.filter((m) => m.id !== menu.id);
    const clamped = Math.min(Math.max(index, 0), without.length);
    const nextMenus = [
      ...without.slice(0, clamped),
      menu,
      ...without.slice(clamped),
    ];

    return {
      ...prev,
      menus: nextMenus,
    };
  });
}

export function setMenuStatus(menuId: string, status: MenuStatus) {
  patchMenu(menuId, { status });
}

export function setMenuDeletedAt(menuId: string, deletedAt: string | null) {
  patchMenu(menuId, { deletedAt });
}

export function removeMenuFromBootstrap(menuId: string) {
  patchBootstrapPayload((prev) => ({
    ...prev,
    menus: prev.menus.filter((menu) => menu.id !== menuId),
  }));
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
      const message = await getErrorMessageFromResponse(res);
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
    const message = normalizeNetworkErrorMessage(
      error,
      error instanceof Error ? error.message : String(error),
    );
    setState({ data: existingData, error: message, loading: false });

    if (existingData) {
      maybeToastBackgroundError(message);
    }
    throw error;
  } finally {
    inFlight = null;
  }
}

export function useBootstrapData(): BootstrapState & {
  refresh: () => void;
  initialLoading: boolean;
  refreshing: boolean;
} {
  const snapshot = React.useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  React.useEffect(() => {
    if (snapshot.data || snapshot.error || inFlight) {
      return;
    }

    void loadBootstrapPayload(false).catch(() => undefined);
  }, [snapshot.data, snapshot.error]);

  const refresh = React.useCallback(() => {
    void loadBootstrapPayload(true).catch(() => undefined);
  }, []);

  return {
    ...snapshot,
    refresh,
    initialLoading: snapshot.loading && !snapshot.data,
    refreshing: snapshot.loading && Boolean(snapshot.data),
  };
}
