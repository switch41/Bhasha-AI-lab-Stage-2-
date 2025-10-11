import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Create a new LLM connection
export const create = mutation({
  args: {
    name: v.string(),
    apiEndpoint: v.string(),
    authType: v.union(v.literal("bearer"), v.literal("api_key"), v.literal("none")),
    apiKey: v.optional(v.string()),
    dataFormat: v.union(v.literal("jsonl"), v.literal("json"), v.literal("csv")),
    statusEndpoint: v.optional(v.string()),
    modelIdentifier: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Validate URL format
    try {
      new URL(args.apiEndpoint);
      if (args.statusEndpoint) new URL(args.statusEndpoint);
    } catch {
      throw new Error("Invalid URL format");
    }

    const connectionId = await ctx.db.insert("llm_connections", {
      userId: user._id,
      name: args.name,
      apiEndpoint: args.apiEndpoint,
      authType: args.authType,
      apiKey: args.apiKey,
      dataFormat: args.dataFormat,
      statusEndpoint: args.statusEndpoint,
      modelIdentifier: args.modelIdentifier,
      isActive: true,
      lastTested: undefined,
      testStatus: undefined,
    });

    return connectionId;
  },
});

// List user's LLM connections
export const list = query({
  args: {},
  handler: async (ctx) => {
    const user = await getCurrentUser(ctx);
    if (!user) return [];

    return await ctx.db
      .query("llm_connections")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();
  },
});

// Get a specific connection
export const get = query({
  args: { id: v.id("llm_connections") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const connection = await ctx.db.get(args.id);
    if (!connection) throw new Error("Connection not found");
    if (connection.userId !== user._id) throw new Error("Not authorized");

    return connection;
  },
});

// Update connection
export const update = mutation({
  args: {
    id: v.id("llm_connections"),
    name: v.optional(v.string()),
    apiEndpoint: v.optional(v.string()),
    authType: v.optional(v.union(v.literal("bearer"), v.literal("api_key"), v.literal("none"))),
    apiKey: v.optional(v.string()),
    dataFormat: v.optional(v.union(v.literal("jsonl"), v.literal("json"), v.literal("csv"))),
    statusEndpoint: v.optional(v.string()),
    modelIdentifier: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const connection = await ctx.db.get(args.id);
    if (!connection) throw new Error("Connection not found");
    if (connection.userId !== user._id) throw new Error("Not authorized");

    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);

    return id;
  },
});

// Delete connection
export const remove = mutation({
  args: { id: v.id("llm_connections") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const connection = await ctx.db.get(args.id);
    if (!connection) throw new Error("Connection not found");
    if (connection.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.delete(args.id);
    return args.id;
  },
});

// Toggle active status
export const toggleActive = mutation({
  args: { id: v.id("llm_connections") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const connection = await ctx.db.get(args.id);
    if (!connection) throw new Error("Connection not found");
    if (connection.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(args.id, { isActive: !connection.isActive });
    return args.id;
  },
});

// Update test status
export const updateTestStatus = mutation({
  args: {
    id: v.id("llm_connections"),
    testStatus: v.union(v.literal("success"), v.literal("failed")),
    lastTested: v.number(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const connection = await ctx.db.get(args.id);
    if (!connection) throw new Error("Connection not found");
    if (connection.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(args.id, {
      testStatus: args.testStatus,
      lastTested: args.lastTested,
    });

    return args.id;
  },
});
