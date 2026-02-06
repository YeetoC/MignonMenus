import { v } from "convex/values";
import { mutation } from "./_generated/server";

export const seedInitialLocationsAndTags = mutation({
  args: {
    locations: v.array(v.string()),
    tags: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    for (const name of args.locations) {
      const existing = await ctx.db
        .query("locations")
        .withIndex("by_name", (q) => q.eq("name", name))
        .first();

      if (!existing) {
        await ctx.db.insert("locations", {
          name,
          createdAt: now,
          updatedAt: now,
        });
      }
    }

    for (const name of args.tags) {
      const existing = await ctx.db
        .query("tags")
        .withIndex("by_name", (q) => q.eq("name", name))
        .first();

      if (!existing) {
        await ctx.db.insert("tags", {
          name,
          createdAt: now,
          updatedAt: now,
        });
      }
    }
  },
});
