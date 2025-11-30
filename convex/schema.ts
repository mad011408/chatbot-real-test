import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  chats: defineTable({
    userId: v.string(),
    title: v.string(),
    modelId: v.optional(v.string()),
    createdAt: v.number(),
    updatedAt: v.number(),
  }),
  messages: defineTable({
    chatId: v.id("chats"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    modelId: v.optional(v.string()),
    createdAt: v.number(),
  }).index("by_chat", ["chatId"]),
});


