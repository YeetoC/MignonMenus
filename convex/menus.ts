import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const listAll = query({
  args: {},
  handler: async (ctx) => {
    const menus = await ctx.db
      .query("menus")
      .withIndex("by_updatedAt")
      .order("desc")
      .collect();

    return await Promise.all(
      menus.map(async (menu) => {
        const imageUrl = menu.imageId ? await ctx.storage.getUrl(menu.imageId) : null;
        return {
          ...menu,
          imageUrl,
          isFavorite: false,
        };
      })
    );
  },
});

export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

export const setMenuImage = mutation({
  args: {
    menuId: v.id("menus"),
    imageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.menuId, {
      imageId: args.imageId,
      updatedAt: Date.now(),
    });
  },
});

export const clearMenuImage = mutation({
  args: {
    menuId: v.id("menus"),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.menuId, {
      imageId: undefined,
      updatedAt: Date.now(),
    });
  },
});
