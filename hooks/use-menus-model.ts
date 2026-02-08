"use client";

import * as React from "react";

import type { BootstrapPayload, Location, Menu, Tag } from "@/lib/read-model";
import { useBootstrapData } from "@/hooks/use-bootstrap-data";

type MenusModel = {
  payload: BootstrapPayload | null;
  menus: Menu[];
  tags: Tag[];
  locations: Location[];
  tagById: Map<string, Tag>;
  locationById: Map<string, Location>;
};

export function useMenusModel(): {
  model: MenusModel;
  loading: boolean;
  error: string | null;
  refresh: () => void;
} {
  const { data, loading, error, refresh } = useBootstrapData();

  const model = React.useMemo<MenusModel>(() => {
    const payload = data;
    const menus = payload?.menus ?? [];
    const tags = payload?.tags ?? [];
    const locations = payload?.locations ?? [];

    const tagById = new Map<string, Tag>();
    tags.forEach((t) => tagById.set(t.id, t));

    const locationById = new Map<string, Location>();
    locations.forEach((l) => locationById.set(l.id, l));

    return {
      payload,
      menus,
      tags,
      locations,
      tagById,
      locationById,
    };
  }, [data]);

  return {
    model,
    loading,
    error,
    refresh,
  };
}
