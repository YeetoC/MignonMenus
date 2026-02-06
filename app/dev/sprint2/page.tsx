"use client";

import * as React from "react";
import { useQuery } from "convex/react";
import { anyApi } from "convex/server";

export default function Sprint2DevPage() {
  const menus = useQuery(anyApi.menus.listAll);
  const tags = useQuery(anyApi.tags.listAll);
  const locations = useQuery(anyApi.locations.listAll);

  const loading = menus === undefined || tags === undefined || locations === undefined;

  return (
    <div className="p-6 space-y-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold">Sprint 2 Harness</h1>
        <p className="text-sm text-muted-foreground">Convex provider + schema + read queries.</p>
      </div>

      {loading ? (
        <div className="text-sm text-muted-foreground">Loading…</div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Menus</div>
              <div className="text-lg font-semibold">{menus.length}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Tags</div>
              <div className="text-lg font-semibold">{tags.length}</div>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-xs text-muted-foreground">Locations</div>
              <div className="text-lg font-semibold">{locations.length}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="rounded-md border p-3">
              <div className="text-sm font-medium mb-2">Tags</div>
              <pre className="text-xs overflow-auto">{JSON.stringify(tags, null, 2)}</pre>
            </div>
            <div className="rounded-md border p-3">
              <div className="text-sm font-medium mb-2">Locations</div>
              <pre className="text-xs overflow-auto">{JSON.stringify(locations, null, 2)}</pre>
            </div>
          </div>

          <div className="rounded-md border p-3">
            <div className="text-sm font-medium mb-2">Menus</div>
            <pre className="text-xs overflow-auto">{JSON.stringify(menus, null, 2)}</pre>
          </div>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Note: This page uses convex/server anyApi so it can run before convex codegen creates convex/_generated/api.
      </div>
    </div>
  );
}
