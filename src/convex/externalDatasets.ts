import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";

// Create external dataset entry
export const create = mutation({
  args: {
    name: v.string(),
    source: v.union(v.literal("kaggle"), v.literal("upload"), v.literal("url")),
    sourceIdentifier: v.string(),
    fileStorageId: v.optional(v.id("_storage")),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const datasetId = await ctx.db.insert("external_datasets", {
      userId: user._id,
      name: args.name,
      source: args.source,
      sourceIdentifier: args.sourceIdentifier,
      status: "pending",
      totalRecords: 0,
      processedRecords: 0,
      fileStorageId: args.fileStorageId,
      errorLog: [],
      metadata: args.metadata,
    });

    return datasetId;
  },
});

// List external datasets
export const list = query({
  args: {
    status: v.optional(v.string()),
    source: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    let datasets = await ctx.db
      .query("external_datasets")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (args.status) {
      datasets = datasets.filter((d) => d.status === args.status);
    }
    if (args.source) {
      datasets = datasets.filter((d) => d.source === args.source);
    }

    return datasets.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Get single external dataset
export const get = query({
  args: { id: v.id("external_datasets") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const dataset = await ctx.db.get(args.id);
    if (!dataset) throw new Error("Dataset not found");
    if (dataset.userId !== user._id) throw new Error("Not authorized");

    return dataset;
  },
});

// Update external dataset status
export const updateStatus = mutation({
  args: {
    id: v.id("external_datasets"),
    status: v.union(v.literal("pending"), v.literal("processing"), v.literal("completed"), v.literal("failed")),
    totalRecords: v.optional(v.number()),
    processedRecords: v.optional(v.number()),
    errorLog: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates as any);
    return id;
  },
});

// Delete external dataset
export const remove = mutation({
  args: { id: v.id("external_datasets") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const dataset = await ctx.db.get(args.id);
    if (!dataset) throw new Error("Dataset not found");
    if (dataset.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.delete(args.id);
  },
});
