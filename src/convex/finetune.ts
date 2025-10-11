import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./users";

// AI Parameter Optimizer
export const recommend = query({
  args: {
    datasetId: v.id("datasets"),
    targetModel: v.optional(v.string()),
    objective: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const dataset = await ctx.db.get(args.datasetId);
    if (!dataset) throw new Error("Dataset not found");

    const datasetSize = dataset.size;
    const avgTokens = dataset.metadata.avgTokens || 100;

    // Calculate learning rate
    const learningRate = datasetSize < 1000 ? 5e-5 :
                        datasetSize < 5000 ? 3e-5 :
                        datasetSize < 10000 ? 2e-5 : 1e-5;

    // Calculate batch size
    const batchSize = datasetSize < 1000 ? 8 :
                     datasetSize < 5000 ? 16 :
                     datasetSize < 10000 ? 32 : 64;

    // Calculate epochs
    const epochs = avgTokens < 50 ? 5 :
                  avgTokens < 100 ? 4 :
                  avgTokens < 200 ? 3 : 2;

    // Estimate cost (OpenAI pricing: $0.008 per 1K tokens)
    const totalTokens = datasetSize * avgTokens * epochs;
    const estimatedCost = (totalTokens / 1000) * 0.008;

    // Estimate time (rough estimate: 1000 samples per hour)
    const estimatedTimeMinutes = Math.ceil((datasetSize * epochs) / 1000 * 60);

    // LoRA configuration
    const loraRank = 8;
    const loraAlpha = 16;

    return {
      parameters: {
        learningRate,
        batchSize,
        epochs,
        loraRank,
        loraAlpha,
      },
      reasoning: {
        learningRate: `Based on dataset size of ${datasetSize}, using ${learningRate} to balance convergence speed and stability.`,
        batchSize: `Optimal batch size of ${batchSize} for ${datasetSize} samples to maximize GPU utilization.`,
        epochs: `${epochs} epochs recommended for average token length of ${avgTokens} to prevent overfitting.`,
        lora: `LoRA rank ${loraRank} and alpha ${loraAlpha} provide efficient fine-tuning with minimal parameter overhead.`,
      },
      estimatedCost: Math.round(estimatedCost * 100) / 100,
      estimatedTimeMinutes,
      confidence: 0.85,
      datasetAnalysis: {
        size: datasetSize,
        avgTokens,
        language: dataset.language,
        qualityScore: dataset.qualityScore,
      },
    };
  },
});

// Create fine-tuning job
export const create = mutation({
  args: {
    datasetId: v.id("datasets"),
    parameters: v.object({
      learningRate: v.number(),
      batchSize: v.number(),
      epochs: v.number(),
      loraRank: v.number(),
      loraAlpha: v.number(),
    }),
    provider: v.string(),
    model: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const dataset = await ctx.db.get(args.datasetId);
    if (!dataset) throw new Error("Dataset not found");

    // Calculate estimates
    const totalTokens = dataset.size * (dataset.metadata.avgTokens || 100) * args.parameters.epochs;
    const estimatedCost = (totalTokens / 1000) * 0.008;
    const estimatedTimeMinutes = Math.ceil((dataset.size * args.parameters.epochs) / 1000 * 60);

    const jobId = await ctx.db.insert("finetune_jobs", {
      userId: user._id,
      datasetId: args.datasetId,
      status: "pending",
      parameters: args.parameters,
      provider: args.provider,
      model: args.model,
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

    // Log activity
    await ctx.db.insert("activities", {
      userId: user._id,
      action: "finetune_started",
      finetuneJobId: jobId,
      metadata: { datasetId: args.datasetId, provider: args.provider },
    });

    // Schedule job submission for OpenAI
    if (args.provider === "openai") {
      await ctx.scheduler.runAfter(0, (internal as any).providers_openai.submitJob, {
        jobId,
        datasetId: args.datasetId,
        model: args.model,
        parameters: args.parameters,
      });
    }

    return jobId;
  },
});

// Get job status (make it internal as well for backend use)
export const getStatus = query({
  args: { jobId: v.id("finetune_jobs") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.jobId);
  },
});

// List jobs
export const listJobs = query({
  args: {
    userId: v.optional(v.id("users")),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let jobs = await ctx.db.query("finetune_jobs").collect();

    if (args.userId) {
      jobs = jobs.filter((j) => j.userId === args.userId);
    }
    if (args.status) {
      jobs = jobs.filter((j) => j.status === args.status);
    }

    const sorted = jobs.sort((a, b) => b._creationTime - a._creationTime);
    return args.limit ? sorted.slice(0, args.limit) : sorted;
  },
});

// Update job status (internal use)
export const updateStatus = internalMutation({
  args: {
    jobId: v.id("finetune_jobs"),
    status: v.string(),
    providerJobId: v.optional(v.string()),
    modelId: v.optional(v.string()),
    metrics: v.optional(v.object({
      loss: v.array(v.number()),
      steps: v.number(),
      currentEpoch: v.number(),
    })),
    results: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const { jobId, ...updates } = args;
    
    if (updates.status === "completed") {
      await ctx.db.patch(jobId, {
        ...updates,
        completedAt: Date.now(),
      });
    } else {
      await ctx.db.patch(jobId, updates);
    }

    return jobId;
  },
});

// Cancel job
export const cancel = mutation({
  args: { jobId: v.id("finetune_jobs") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const job = await ctx.db.get(args.jobId);
    if (!job) throw new Error("Job not found");
    if (job.userId !== user._id) throw new Error("Not authorized");

    // Cancel on provider if running
    if (job.status === "running" && job.providerJobId && job.provider === "openai") {
      await ctx.scheduler.runAfter(0, (internal as any).providers_openai.cancelJob, {
        providerJobId: job.providerJobId,
      });
    }

    await ctx.db.patch(args.jobId, {
      status: "cancelled",
      completedAt: Date.now(),
    });

    return args.jobId;
  },
});

// Poll running jobs (called by cron)
export const pollRunningJobs = internalMutation({
  args: {},
  handler: async (ctx) => {
    const runningJobs = await ctx.db
      .query("finetune_jobs")
      .filter((q) => q.eq(q.field("status"), "running"))
      .collect();

    for (const job of runningJobs) {
      if (job.providerJobId && job.provider === "openai") {
        await ctx.scheduler.runAfter(0, (internal as any).providers_openai.pollJobStatus, {
          jobId: job._id,
          providerJobId: job.providerJobId,
        });
      }
    }
  },
});