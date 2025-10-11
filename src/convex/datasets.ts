import { v } from "convex/values";
import { mutation, query, internalQuery } from "./_generated/server";
import { getCurrentUser } from "./users";

// Create dataset from content
export const create = mutation({
  args: {
    name: v.string(),
    language: v.string(),
    contentType: v.optional(v.string()),
    minQualityScore: v.optional(v.number()),
    contentIds: v.optional(v.array(v.id("content"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Get content based on filters
    let content = await ctx.db.query("content")
      .filter((q) => q.eq(q.field("status"), "published"))
      .collect();

    // Apply filters
    content = content.filter((c) => c.language === args.language);
    if (args.contentType) {
      content = content.filter((c) => c.contentType === args.contentType);
    }
    if (args.minQualityScore !== undefined) {
      content = content.filter((c) => c.qualityScore >= args.minQualityScore!);
    }
    if (args.contentIds && args.contentIds.length > 0) {
      content = content.filter((c) => args.contentIds!.includes(c._id));
    }

    const entryIds = content.map((c) => c._id);
    const avgQuality = content.length > 0
      ? content.reduce((sum, c) => sum + c.qualityScore, 0) / content.length
      : 0;

    const datasetId = await ctx.db.insert("datasets", {
      name: args.name,
      language: args.language,
      contentType: args.contentType || "mixed",
      size: content.length,
      entryIds,
      qualityScore: avgQuality,
      metadata: {
        avgTokens: Math.floor(content.reduce((sum, c) => sum + c.text.length / 4, 0) / content.length),
        regions: [...new Set(content.map((c) => c.region).filter((r): r is string => Boolean(r)))],
        categories: [...new Set(content.map((c) => c.category).filter((cat): cat is string => Boolean(cat)))],
      },
      status: "ready",
      userId: user._id,
    });

    return datasetId;
  },
});

// List datasets
export const list = query({
  args: {
    language: v.optional(v.string()),
    contentType: v.optional(v.string()),
    minQuality: v.optional(v.number()),
    minSize: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let datasets = await ctx.db.query("datasets").collect();

    if (args.language) {
      datasets = datasets.filter((d) => d.language === args.language);
    }
    if (args.contentType) {
      datasets = datasets.filter((d) => d.contentType === args.contentType);
    }
    if (args.minQuality !== undefined) {
      datasets = datasets.filter((d) => d.qualityScore >= args.minQuality!);
    }
    if (args.minSize !== undefined) {
      datasets = datasets.filter((d) => d.size >= args.minSize!);
    }

    return datasets.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Get dataset (public - for frontend)
export const getById = query({
  args: { id: v.id("datasets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get dataset (internal - for backend)
export const get = internalQuery({
  args: { id: v.id("datasets") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Get dataset preview
export const preview = query({
  args: {
    id: v.id("datasets"),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const dataset = await ctx.db.get(args.id);
    if (!dataset) throw new Error("Dataset not found");

    const limit = args.limit || 10;
    const sampleIds = dataset.entryIds.slice(0, limit);
    
    const samples = await Promise.all(
      sampleIds.map((id) => ctx.db.get(id))
    );

    return samples.filter(Boolean);
  },
});

// Get dataset statistics
export const stats = query({
  args: { id: v.id("datasets") },
  handler: async (ctx, args) => {
    const dataset = await ctx.db.get(args.id);
    if (!dataset) throw new Error("Dataset not found");

    const content = await Promise.all(
      dataset.entryIds.map((id) => ctx.db.get(id))
    );

    const validContent = content.filter(Boolean);
    
    return {
      totalEntries: dataset.size,
      avgTokens: dataset.metadata.avgTokens,
      regions: dataset.metadata.regions,
      categories: dataset.metadata.categories,
      qualityScore: dataset.qualityScore,
      language: dataset.language,
      contentType: dataset.contentType,
    };
  },
});

// Export dataset (returns data for download) - internal
export const exportData = internalQuery({
  args: {
    id: v.id("datasets"),
    format: v.union(v.literal("jsonl"), v.literal("csv")),
    split: v.optional(v.object({
      train: v.number(),
      validation: v.number(),
      test: v.number(),
    })),
  },
  handler: async (ctx, args) => {
    const dataset = await ctx.db.get(args.id);
    if (!dataset) throw new Error("Dataset not found");

    const content = await Promise.all(
      dataset.entryIds.map((id) => ctx.db.get(id))
    );

    const validContent = content.filter(Boolean);

    // Apply split if specified
    const split = args.split || { train: 0.8, validation: 0.1, test: 0.1 };
    const trainSize = Math.floor(validContent.length * split.train);
    const valSize = Math.floor(validContent.length * split.validation);

    const shuffled = [...validContent].sort(() => Math.random() - 0.5);
    const trainData = shuffled.slice(0, trainSize);
    const valData = shuffled.slice(trainSize, trainSize + valSize);
    const testData = shuffled.slice(trainSize + valSize);

    return {
      train: trainData,
      validation: valData,
      test: testData,
      metadata: {
        datasetName: dataset.name,
        language: dataset.language,
        totalSamples: validContent.length,
        splits: {
          train: trainData.length,
          validation: valData.length,
          test: testData.length,
        },
      },
    };
  },
});