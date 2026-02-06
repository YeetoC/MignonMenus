import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  menus: defineTable({
    title: v.string(),
    description: v.optional(v.string()),
    menuContent: v.string(),
    pricePerPersonCents: v.optional(v.number()),
    imageId: v.optional(v.id("_storage")),
    locationIds: v.array(v.id("locations")),
    tagIds: v.array(v.id("tags")),
    status: v.union(v.literal("active"), v.literal("archived")),
    deletedAt: v.union(v.null(), v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_deletedAt", ["deletedAt"])
    .index("by_updatedAt", ["updatedAt"]),

  tags: defineTable({
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),

  locations: defineTable({
    name: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_name", ["name"]),
});
