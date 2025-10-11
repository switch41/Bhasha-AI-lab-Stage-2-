import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getCurrentUser } from "./users";
import { internal } from "./_generated/api";

// Create content entry
export const create = mutation({
  args: {
    text: v.string(),
    language: v.string(),
    contentType: v.union(v.literal("text"), v.literal("proverb"), v.literal("narrative")),
    region: v.optional(v.string()),
    category: v.optional(v.string()),
    source: v.optional(v.string()),
    dialect: v.optional(v.string()),
    culturalContext: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
    enableAIAnalysis: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const { enableAIAnalysis, ...contentData } = args;

    // Create content with initial quality score
    const contentId = await ctx.db.insert("content", {
      ...contentData,
      userId: user._id,
      status: args.status || "draft",
      qualityScore: 0,
      translatedText: undefined,
      aiAnalysis: undefined,
    });

    // Schedule AI analysis if enabled
    if (enableAIAnalysis) {
      await ctx.scheduler.runAfter(0, (internal as any).providers_gemini.analyzeQuality, {
        text: args.text,
        language: args.language,
        contentType: args.contentType,
        culturalContext: args.culturalContext,
      }).then(async (result: any) => {
        await ctx.db.patch(contentId, {
          qualityScore: result.qualityScore,
          aiAnalysis: result.analysis,
        });
      });
    }

    // Log activity
    await ctx.db.insert("activities", {
      userId: user._id,
      action: "content_created",
      contentId,
      metadata: { language: args.language, contentType: args.contentType },
    });

    return contentId;
  },
});

// List content with filters
export const list = query({
  args: {
    language: v.optional(v.string()),
    contentType: v.optional(v.string()),
    status: v.optional(v.string()),
    userId: v.optional(v.id("users")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let results;

    if (args.userId !== undefined) {
      results = await ctx.db.query("content")
        .withIndex("by_user", (q) => q.eq("userId", args.userId!))
        .collect();
    } else {
      results = await ctx.db.query("content").collect();
    }

    let filtered = results;
    if (args.language) {
      filtered = filtered.filter((c) => c.language === args.language);
    }
    if (args.contentType) {
      filtered = filtered.filter((c) => c.contentType === args.contentType);
    }
    if (args.status) {
      filtered = filtered.filter((c) => c.status === args.status);
    }

    const limited = args.limit ? filtered.slice(0, args.limit) : filtered;

    return limited.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Get single content
export const get = query({
  args: { id: v.id("content") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update content
export const update = mutation({
  args: {
    id: v.id("content"),
    text: v.optional(v.string()),
    language: v.optional(v.string()),
    contentType: v.optional(v.union(v.literal("text"), v.literal("proverb"), v.literal("narrative"))),
    region: v.optional(v.string()),
    category: v.optional(v.string()),
    source: v.optional(v.string()),
    dialect: v.optional(v.string()),
    culturalContext: v.optional(v.string()),
    status: v.optional(v.union(v.literal("draft"), v.literal("published"))),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const { id, ...updates } = args;
    const content = await ctx.db.get(id);
    if (!content) throw new Error("Content not found");
    if (content.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(id, updates);
    return id;
  },
});

// Delete content
export const remove = mutation({
  args: { id: v.id("content") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const content = await ctx.db.get(args.id);
    if (!content) throw new Error("Content not found");
    if (content.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.delete(args.id);
  },
});

// Search content
export const search = query({
  args: {
    searchTerm: v.string(),
    language: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const allContent = await ctx.db.query("content").collect();
    
    const searchLower = args.searchTerm.toLowerCase();
    let filtered = allContent.filter((c) => 
      c.text.toLowerCase().includes(searchLower) ||
      (c.category && c.category.toLowerCase().includes(searchLower)) ||
      (c.culturalContext && c.culturalContext.toLowerCase().includes(searchLower))
    );

    if (args.language) {
      filtered = filtered.filter((c) => c.language === args.language);
    }

    return filtered.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Get statistics
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const allContent = await ctx.db.query("content").collect();
    const published = allContent.filter((c) => c.status === "published");

    const byLanguage = published.reduce((acc, c) => {
      acc[c.language] = (acc[c.language] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const byType = published.reduce((acc, c) => {
      acc[c.contentType] = (acc[c.contentType] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const avgQuality = published.length > 0
      ? published.reduce((sum, c) => sum + c.qualityScore, 0) / published.length
      : 0;

    return {
      total: published.length,
      byLanguage,
      byType,
      avgQuality,
    };
  },
});