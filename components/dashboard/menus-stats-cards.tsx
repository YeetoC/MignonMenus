"use client";

import * as React from "react";

import { UtensilsCrossed, Star, MapPin, Tag } from "lucide-react";

import { useMenusModel } from "@/hooks/use-menus-model";

const stats = [
  {
    label: "Total Menus",
    icon: UtensilsCrossed,
    color: "bg-blue-500/10 text-blue-500",
  },
  {
    label: "Favorites",
    icon: Star,
    color: "bg-amber-500/10 text-amber-500",
  },
  {
    label: "Locations",
    icon: MapPin,
    color: "bg-violet-500/10 text-violet-500",
  },
  {
    label: "Tags",
    icon: Tag,
    color: "bg-emerald-500/10 text-emerald-500",
  },
];

export function MenusStatsCards() {
  const { model } = useMenusModel();

  const values = React.useMemo(() => {
    const menus = model.menus;
    const favorites = menus.filter((m) => m.isFavorite).length;
    return [menus.length, favorites, model.locations.length, model.tags.length];
  }, [model.menus, model.locations.length, model.tags.length]);

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div
          key={stat.label}
          className="flex items-center gap-4 p-4 rounded-xl border bg-card"
        >
          <div
            className={`size-10 rounded-lg ${stat.color} flex items-center justify-center`}
          >
            <stat.icon className="size-5" />
          </div>
          <div>
            <p className="text-2xl font-bold">{values[index]}</p>
            <p className="text-sm text-muted-foreground">{stat.label}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
