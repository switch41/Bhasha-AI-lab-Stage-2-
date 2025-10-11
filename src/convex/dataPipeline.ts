import { v } from "convex/values";
import { mutation, query, internalAction, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { getCurrentUser } from "./users";
import { detectFormat, parseCSV, parseJSON, applyFieldMapping, normalizeText, validateRecord, deduplicateRecords } from "./dataTransform";

// Create a new import pipeline
export const create = mutation({
  args: {
    externalDatasetId: v.id("external_datasets"),
    config: v.object({
      fieldMappings: v.any(),
      autoDetectLanguage: v.boolean(),
      removeDuplicates: v.boolean(),
      enableAIAnalysis: v.boolean(),
      defaultContentType: v.optional(v.string()),
      defaultStatus: v.string(),
      minQualityThreshold: v.number(),
      autoCreateDataset: v.boolean(),
      datasetConfig: v.optional(v.any()),
      autoFinetune: v.boolean(),
      finetuneConfig: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    // Validate external dataset exists
    const externalDataset = await ctx.db.get(args.externalDatasetId);
    if (!externalDataset) throw new Error("External dataset not found");
    if (externalDataset.userId !== user._id) throw new Error("Not authorized");

    // Calculate total steps
    let totalSteps = 3; // normalize, validate, ingest
    if (args.config.autoCreateDataset) totalSteps++;
    if (args.config.autoFinetune) totalSteps++;

    const pipelineId = await ctx.db.insert("import_pipelines", {
      userId: user._id,
      externalDatasetId: args.externalDatasetId,
      status: "pending",
      currentStep: 0,
      totalSteps,
      contentIds: [],
      config: args.config,
      errorLog: [],
    });

    // Schedule pipeline processing
    await ctx.scheduler.runAfter(0, internal.dataPipeline.processPipeline, {
      pipelineId,
    });

    return pipelineId;
  },
});

// Process the pipeline (internal action)
export const processPipeline = internalAction({
  args: { pipelineId: v.id("import_pipelines") },
  handler: async (ctx, args) => {
    const pipeline = await ctx.runQuery(internal.dataPipeline.getPipeline, {
      pipelineId: args.pipelineId,
    });
    
    if (!pipeline) throw new Error("Pipeline not found");

    try {
      // Step 1: Normalize data
      await ctx.runMutation(internal.dataPipeline.updatePipelineStatus, {
        pipelineId: args.pipelineId,
        status: "normalizing",
        currentStep: 1,
      });

      const normalizedData = await ctx.runMutation(internal.dataPipeline.normalizeData, {
        pipelineId: args.pipelineId,
      });

      // Step 2: Validate data
      await ctx.runMutation(internal.dataPipeline.updatePipelineStatus, {
        pipelineId: args.pipelineId,
        status: "validating",
        currentStep: 2,
      });

      const validatedData = await ctx.runMutation(internal.dataPipeline.validateData, {
        pipelineId: args.pipelineId,
        data: normalizedData,
      });

      // Step 3: Ingest content
      await ctx.runMutation(internal.dataPipeline.updatePipelineStatus, {
        pipelineId: args.pipelineId,
        status: "ingesting",
        currentStep: 3,
      });

      const contentIds = await ctx.runMutation(internal.dataPipeline.ingestContent, {
        pipelineId: args.pipelineId,
        data: validatedData,
      });

      // Step 4: Create dataset (if enabled)
      let datasetId: any = undefined;
      if (pipeline.config.autoCreateDataset) {
        await ctx.runMutation(internal.dataPipeline.updatePipelineStatus, {
          pipelineId: args.pipelineId,
          status: "creating_dataset",
          currentStep: 4,
        });

        datasetId = await ctx.runMutation(internal.dataPipeline.createDatasetFromPipeline, {
          pipelineId: args.pipelineId,
          contentIds,
        });
      }

      // Step 5: Start fine-tuning (if enabled)
      if (pipeline.config.autoFinetune && datasetId) {
        await ctx.runMutation(internal.dataPipeline.updatePipelineStatus, {
          pipelineId: args.pipelineId,
          status: "fine_tuning",
          currentStep: 5,
        });

        const finetuneJobId = await ctx.runMutation(internal.dataPipeline.startFinetuning, {
          pipelineId: args.pipelineId,
          datasetId,
        });

        await ctx.runMutation(internal.dataPipeline.updatePipelineStatus, {
          pipelineId: args.pipelineId,
          status: "completed",
          currentStep: pipeline.totalSteps,
          finetuneJobId: finetuneJobId || undefined,
          completedAt: Date.now(),
        });
      } else {
        await ctx.runMutation(internal.dataPipeline.updatePipelineStatus, {
          pipelineId: args.pipelineId,
          status: "completed",
          currentStep: pipeline.totalSteps,
          datasetId,
          completedAt: Date.now(),
        });
      }
    } catch (error: any) {
      await ctx.runMutation(internal.dataPipeline.updatePipelineStatus, {
        pipelineId: args.pipelineId,
        status: "failed",
        errorLog: [error.message],
      });
    }
  },
});

// Get pipeline (internal query)
export const getPipeline = internalQuery({
  args: { pipelineId: v.id("import_pipelines") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.pipelineId);
  },
});

// Update pipeline status (internal)
export const updatePipelineStatus = internalMutation({
  args: {
    pipelineId: v.id("import_pipelines"),
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("normalizing"),
      v.literal("validating"),
      v.literal("ingesting"),
      v.literal("creating_dataset"),
      v.literal("fine_tuning"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("cancelled")
    )),
    currentStep: v.optional(v.number()),
    datasetId: v.optional(v.id("datasets")),
    finetuneJobId: v.optional(v.id("finetune_jobs")),
    errorLog: v.optional(v.array(v.string())),
    completedAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const { pipelineId, ...updates } = args;
    
    if (updates.status === "pending" || updates.status === "normalizing") {
      await ctx.db.patch(pipelineId, {
        ...updates,
        startedAt: Date.now(),
      } as any);
    } else {
      await ctx.db.patch(pipelineId, updates as any);
    }
  },
});

// Normalize data step (internal)
export const normalizeData = internalMutation({
  args: { pipelineId: v.id("import_pipelines") },
  handler: async (ctx, args) => {
    // Placeholder - will be implemented with actual data processing
    return [];
  },
});

// Validate data step (internal)
export const validateData = internalMutation({
  args: {
    pipelineId: v.id("import_pipelines"),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    // Placeholder - will be implemented with actual validation
    return args.data;
  },
});

// Ingest content step (internal)
export const ingestContent = internalMutation({
  args: {
    pipelineId: v.id("import_pipelines"),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    // Placeholder - will be implemented with actual ingestion
    return [];
  },
});

// Create dataset from pipeline (internal)
export const createDatasetFromPipeline = internalMutation({
  args: {
    pipelineId: v.id("import_pipelines"),
    contentIds: v.array(v.id("content")),
  },
  handler: async (ctx, args) => {
    // Placeholder - will be implemented
    return undefined;
  },
});

// Start fine-tuning from pipeline (internal)
export const startFinetuning = internalMutation({
  args: {
    pipelineId: v.id("import_pipelines"),
    datasetId: v.id("datasets"),
  },
  handler: async (ctx, args) => {
    // Placeholder - will be implemented
    return undefined;
  },
});

// List pipelines
export const list = query({
  args: {
    status: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    let pipelines = await ctx.db
      .query("import_pipelines")
      .withIndex("by_user", (q) => q.eq("userId", user._id))
      .collect();

    if (args.status) {
      pipelines = pipelines.filter((p) => p.status === args.status);
    }

    return pipelines.sort((a, b) => b._creationTime - a._creationTime);
  },
});

// Get pipeline status
export const getStatus = query({
  args: { pipelineId: v.id("import_pipelines") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const pipeline = await ctx.db.get(args.pipelineId);
    if (!pipeline) throw new Error("Pipeline not found");
    if (pipeline.userId !== user._id) throw new Error("Not authorized");

    return pipeline;
  },
});

// Cancel pipeline
export const cancel = mutation({
  args: { pipelineId: v.id("import_pipelines") },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const pipeline = await ctx.db.get(args.pipelineId);
    if (!pipeline) throw new Error("Pipeline not found");
    if (pipeline.userId !== user._id) throw new Error("Not authorized");

    await ctx.db.patch(args.pipelineId, {
      status: "cancelled",
      completedAt: Date.now(),
    });
  },
});
