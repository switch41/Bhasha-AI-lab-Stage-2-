import { v } from "convex/values";
import { mutation, query, internalQuery, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./users";

// Helper function to analyze token distribution
function analyzeTokenDistribution(content: any[]) {
  const tokenCounts = content.map(c => Math.ceil(c.text.length / 3));
  
  const sorted = [...tokenCounts].sort((a, b) => a - b);
  const sum = tokenCounts.reduce((a, b) => a + b, 0);
  const avg = sum / tokenCounts.length;
  
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  
  const min = Math.min(...tokenCounts);
  const max = Math.max(...tokenCounts);
  
  // Calculate standard deviation
  const variance = tokenCounts.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / tokenCounts.length;
  const stdDev = Math.sqrt(variance);
  
  // Calculate percentiles
  const p25 = sorted[Math.floor(sorted.length * 0.25)];
  const p75 = sorted[Math.floor(sorted.length * 0.75)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  
  return {
    avg: Math.round(avg),
    median: Math.round(median),
    min,
    max,
    stdDev: Math.round(stdDev),
    p25,
    p75,
    p95,
    distribution: {
      short: tokenCounts.filter(t => t < 50).length,
      medium: tokenCounts.filter(t => t >= 50 && t < 200).length,
      long: tokenCounts.filter(t => t >= 200).length,
    },
  };
}

// Normalize and optimize dataset
export const normalize = mutation({
  args: {
    id: v.id("datasets"),
    options: v.optional(v.object({
      removeDuplicates: v.optional(v.boolean()),
      minTextLength: v.optional(v.number()),
      maxTextLength: v.optional(v.number()),
      minQualityScore: v.optional(v.number()),
    })),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const dataset = await ctx.db.get(args.id);
    if (!dataset) throw new Error("Dataset not found");
    if (dataset.userId !== user._id) throw new Error("Not authorized");

    // Get all content entries
    const content = await Promise.all(
      dataset.entryIds.map((id) => ctx.db.get(id))
    );

    let validContent = content.filter(Boolean);

    // Apply normalization options
    const options = args.options || {};
    
    // Filter by text length
    if (options.minTextLength) {
      validContent = validContent.filter(c => c!.text.length >= options.minTextLength!);
    }
    if (options.maxTextLength) {
      validContent = validContent.filter(c => c!.text.length <= options.maxTextLength!);
    }
    
    // Filter by quality score
    if (options.minQualityScore) {
      validContent = validContent.filter(c => c!.qualityScore >= options.minQualityScore!);
    }

    // Remove duplicates if requested
    if (options.removeDuplicates) {
      const uniqueContent: any[] = [];
      const seenTexts = new Set<string>();
      
      for (const item of validContent) {
        const normalizedText = item!.text.toLowerCase().trim();
        if (!seenTexts.has(normalizedText)) {
          seenTexts.add(normalizedText);
          uniqueContent.push(item);
        }
      }
      validContent = uniqueContent;
    }

    // Recalculate metrics
    const entryIds = validContent.map((c) => c!._id);
    const avgQuality = validContent.length > 0
      ? validContent.reduce((sum, c) => sum + c!.qualityScore, 0) / validContent.length
      : 0;

    const tokenAnalysis = analyzeTokenDistribution(validContent);

    // Update dataset
    await ctx.db.patch(args.id, {
      size: validContent.length,
      entryIds,
      qualityScore: avgQuality,
      metadata: {
        avgTokens: tokenAnalysis.avg,
        regions: [...new Set(validContent.map((c) => c!.region).filter((r): r is string => Boolean(r)))],
        categories: [...new Set(validContent.map((c) => c!.category).filter((cat): cat is string => Boolean(cat)))],
        tokenDistribution: tokenAnalysis,
      },
    });

    return {
      originalSize: dataset.size,
      newSize: validContent.length,
      removed: dataset.size - validContent.length,
      qualityScore: avgQuality,
    };
  },
});

// Create dataset from content (enhanced with auto-fine-tune option)
export const create = mutation({
  args: {
    name: v.string(),
    language: v.string(),
    contentType: v.optional(v.string()),
    minQualityScore: v.optional(v.number()),
    contentIds: v.optional(v.array(v.id("content"))),
    autoFinetune: v.optional(v.boolean()),
    finetuneConfig: v.optional(v.object({
      provider: v.string(),
      model: v.string(),
      connectionId: v.optional(v.id("llm_connections")),
    })),
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

    // Auto-deduplication within dataset
    const uniqueContent: any[] = [];
    const seenTexts = new Set<string>();
    
    for (const item of content) {
      const normalizedText = item.text.toLowerCase().trim();
      if (!seenTexts.has(normalizedText)) {
        seenTexts.add(normalizedText);
        uniqueContent.push(item);
      }
    }

    if (uniqueContent.length < content.length) {
      console.log(`Removed ${content.length - uniqueContent.length} duplicate entries from dataset`);
    }

    const entryIds = uniqueContent.map((c) => c._id);
    const avgQuality = uniqueContent.length > 0
      ? uniqueContent.reduce((sum, c) => sum + c.qualityScore, 0) / uniqueContent.length
      : 0;

    // Perform tokenization analysis
    const tokenAnalysis = analyzeTokenDistribution(uniqueContent);

    const datasetId = await ctx.db.insert("datasets", {
      name: args.name,
      language: args.language,
      contentType: args.contentType || "mixed",
      size: uniqueContent.length,
      entryIds,
      qualityScore: avgQuality,
      metadata: {
        avgTokens: tokenAnalysis.avg,
        regions: [...new Set(uniqueContent.map((c) => c.region).filter((r): r is string => Boolean(r)))],
        categories: [...new Set(uniqueContent.map((c) => c.category).filter((cat): cat is string => Boolean(cat)))],
        tokenDistribution: tokenAnalysis,
      },
      status: "ready",
      userId: user._id,
    });

    // Auto-start fine-tuning if requested
    if (args.autoFinetune && args.finetuneConfig && uniqueContent.length >= 10) {
      await ctx.scheduler.runAfter(0, internal.datasets.autoStartFinetune, {
        datasetId,
        config: args.finetuneConfig,
      });
    }

    return datasetId;
  },
});

// Auto-start fine-tuning (internal)
export const autoStartFinetune = internalMutation({
  args: {
    datasetId: v.id("datasets"),
    config: v.object({
      provider: v.string(),
      model: v.string(),
      connectionId: v.optional(v.id("llm_connections")),
    }),
  },
  handler: async (ctx, args) => {
    // Get AI-optimized parameters
    const dataset = await ctx.db.get(args.datasetId);
    if (!dataset) return;

    const datasetSize = dataset.size;
    const tokenDist = dataset.metadata.tokenDistribution;
    const avgTokens = tokenDist?.avg || dataset.metadata.avgTokens || 100;
    const stdDev = tokenDist?.stdDev || 0;
    const maxTokens = tokenDist?.max || avgTokens * 2;

    // Calculate optimal parameters
    const learningRate = datasetSize < 1000 ? 5e-5 :
                        datasetSize < 5000 ? 3e-5 :
                        datasetSize < 10000 ? 2e-5 : 1e-5;

    let batchSize = datasetSize < 1000 ? 8 :
                   datasetSize < 5000 ? 16 :
                   datasetSize < 10000 ? 32 : 64;
    
    if (stdDev > avgTokens * 0.5 || maxTokens > 500) {
      batchSize = Math.max(4, Math.floor(batchSize / 2));
    }

    const epochs = avgTokens < 50 ? 5 :
                  avgTokens < 100 ? 4 :
                  avgTokens < 200 ? 3 : 2;

    let loraRank: number;
    if (datasetSize < 500) {
      loraRank = 4;
    } else if (datasetSize < 2000) {
      loraRank = 8;
    } else if (datasetSize < 5000) {
      loraRank = 16;
    } else if (datasetSize < 10000) {
      loraRank = 32;
    } else {
      loraRank = 64;
    }

    if (tokenDist) {
      const tokenComplexity = stdDev / avgTokens;
      if (tokenComplexity > 0.5 && loraRank < 32) {
        loraRank = Math.min(loraRank * 2, 32);
      }
      if (maxTokens > 500 && loraRank < 32) {
        loraRank = Math.min(loraRank * 1.5, 32);
      }
    }

    const loraAlpha = datasetSize < 500 ? loraRank * 4 : loraRank * 2;

    const totalTokens = datasetSize * avgTokens * epochs;
    const estimatedCost = (totalTokens / 1000) * 0.008;
    const timeMultiplier = avgTokens > 200 ? 1.5 : avgTokens > 100 ? 1.2 : 1.0;
    const estimatedTimeMinutes = Math.ceil((datasetSize * epochs) / 1000 * 60 * timeMultiplier);

    // Create fine-tuning job
    const jobId = await ctx.db.insert("finetune_jobs", {
      userId: dataset.userId,
      datasetId: args.datasetId,
      status: "pending",
      parameters: {
        learningRate,
        batchSize,
        epochs,
        loraRank,
        loraAlpha,
      },
      provider: args.config.provider,
      model: args.config.model,
      providerJobId: undefined,
      modelId: undefined,
      metrics: {
        loss: [],
        steps: 0,
        currentEpoch: 0,
      },
      results: undefined,
      estimatedCost,
      estimatedTimeMinutes,
      completedAt: undefined,
    });

    // Schedule job submission
    if (args.config.provider === "openai") {
      await ctx.scheduler.runAfter(0, (internal as any).providers_openai.submitJob, {
        jobId,
        datasetId: args.datasetId,
        model: args.config.model,
        parameters: {
          learningRate,
          batchSize,
          epochs,
          loraRank,
          loraAlpha,
        },
      });
    } else if (args.config.provider === "custom" && args.config.connectionId) {
      await ctx.scheduler.runAfter(0, (internal as any).providers_custom.submitJob, {
        jobId,
        datasetId: args.datasetId,
        connectionId: args.config.connectionId,
        parameters: {
          learningRate,
          batchSize,
          epochs,
          loraRank,
          loraAlpha,
        },
      });
    }

    return jobId;
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