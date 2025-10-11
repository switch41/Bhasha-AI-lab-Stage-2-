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
    const pipeline = await ctx.db.get(args.pipelineId);
    if (!pipeline) throw new Error("Pipeline not found");

    const validatedRecords: any[] = [];
    const errors: string[] = [];

    for (let i = 0; i < args.data.length; i++) {
      const record = args.data[i];
      
      try {
        // Validate required fields
        if (!record.text || typeof record.text !== 'string') {
          throw new Error(`Row ${i + 1}: Missing or invalid 'text' field`);
        }
        
        if (!record.language || typeof record.language !== 'string') {
          throw new Error(`Row ${i + 1}: Missing or invalid 'language' field`);
        }
        
        if (!record.contentType || typeof record.contentType !== 'string') {
          throw new Error(`Row ${i + 1}: Missing or invalid 'contentType' field`);
        }

        // Validate text length
        if (record.text.length < 10) {
          throw new Error(`Row ${i + 1}: Text too short (minimum 10 characters)`);
        }
        
        if (record.text.length > 10000) {
          throw new Error(`Row ${i + 1}: Text too long (maximum 10,000 characters)`);
        }

        // Validate token count (approximate)
        const tokenCount = Math.ceil(record.text.length / 3);
        if (tokenCount > 2000) {
          throw new Error(`Row ${i + 1}: Token count exceeds maximum (2000 tokens)`);
        }

        // Validate quality score if present
        if (record.qualityScore !== undefined) {
          const score = parseFloat(record.qualityScore);
          if (isNaN(score) || score < 0 || score > 10) {
            throw new Error(`Row ${i + 1}: Invalid quality score (must be 0-10)`);
          }
          record.qualityScore = score;
        } else {
          record.qualityScore = pipeline.config.minQualityThreshold || 0;
        }

        // Validate content type
        const validContentTypes = ['text', 'proverb', 'narrative'];
        if (!validContentTypes.includes(record.contentType)) {
          record.contentType = pipeline.config.defaultContentType || 'text';
        }

        // Validate language (Indian languages)
        const validLanguages = [
          'hindi', 'bengali', 'tamil', 'telugu', 'marathi', 
          'gujarati', 'kannada', 'malayalam', 'punjabi', 'odia'
        ];
        if (!validLanguages.includes(record.language.toLowerCase())) {
          throw new Error(`Row ${i + 1}: Unsupported language '${record.language}'`);
        }

        validatedRecords.push(record);
      } catch (error: any) {
        errors.push(error.message);
        
        // Stop if too many errors
        if (errors.length > 100) {
          errors.push("Validation stopped: Too many errors (>100)");
          break;
        }
      }
    }

    // Update pipeline with error log
    if (errors.length > 0) {
      await ctx.db.patch(args.pipelineId, {
        errorLog: errors,
      });
    }

    // Update external dataset with progress
    const externalDataset = await ctx.db.get(pipeline.externalDatasetId);
    if (externalDataset) {
      await ctx.db.patch(pipeline.externalDatasetId, {
        totalRecords: args.data.length,
        processedRecords: validatedRecords.length,
      });
    }

    return validatedRecords;
  },
});

// Ingest content step (internal)
export const ingestContent = internalMutation({
  args: {
    pipelineId: v.id("import_pipelines"),
    data: v.any(),
  },
  handler: async (ctx, args) => {
    const pipeline = await ctx.db.get(args.pipelineId);
    if (!pipeline) throw new Error("Pipeline not found");

    const contentIds: any[] = [];

    for (const record of args.data) {
      try {
        const contentId = await ctx.db.insert("content", {
          userId: pipeline.userId,
          text: record.text,
          language: record.language,
          contentType: record.contentType,
          region: record.region || undefined,
          category: record.category || undefined,
          source: record.source || "external_import",
          dialect: record.dialect || undefined,
          culturalContext: record.culturalContext || undefined,
          status: pipeline.config.defaultStatus as "draft" | "published",
          qualityScore: record.qualityScore || 0,
        });

        contentIds.push(contentId);
      } catch (error: any) {
        console.error("Failed to insert content:", error);
      }
    }

    // Update pipeline with content IDs
    await ctx.db.patch(args.pipelineId, {
      contentIds,
    });

    return contentIds;
  },
});

// Create dataset from pipeline (internal)
export const createDatasetFromPipeline = internalMutation({
  args: {
    pipelineId: v.id("import_pipelines"),
    contentIds: v.array(v.id("content")),
  },
  handler: async (ctx, args) => {
    const pipeline = await ctx.db.get(args.pipelineId);
    if (!pipeline) throw new Error("Pipeline not found");

    const externalDataset = await ctx.db.get(pipeline.externalDatasetId);
    if (!externalDataset) throw new Error("External dataset not found");

    // Get content for analysis
    const content = await Promise.all(
      args.contentIds.map((id) => ctx.db.get(id))
    );
    const validContent = content.filter(Boolean);

    if (validContent.length === 0) {
      throw new Error("No valid content to create dataset");
    }

    // Calculate metrics
    const avgQuality = validContent.reduce((sum, c) => sum + c!.qualityScore, 0) / validContent.length;
    const tokenCounts = validContent.map(c => Math.ceil(c!.text.length / 3));
    const avgTokens = Math.round(tokenCounts.reduce((a, b) => a + b, 0) / tokenCounts.length);

    // Determine language and content type from majority
    const languages = validContent.map(c => c!.language);
    const language = languages.sort((a, b) =>
      languages.filter(v => v === a).length - languages.filter(v => v === b).length
    ).pop() || "mixed";

    const contentTypes = validContent.map(c => c!.contentType);
    const contentType = contentTypes.sort((a, b) =>
      contentTypes.filter(v => v === a).length - contentTypes.filter(v => v === b).length
    ).pop() || "mixed";

    // Create dataset
    const datasetName = pipeline.config.datasetConfig?.name || externalDataset.name;
    
    const datasetId = await ctx.db.insert("datasets", {
      name: datasetName,
      language,
      contentType,
      size: validContent.length,
      entryIds: args.contentIds,
      qualityScore: avgQuality,
      metadata: {
        avgTokens,
        regions: [...new Set(validContent.map(c => c!.region).filter(Boolean))],
        categories: [...new Set(validContent.map(c => c!.category).filter(Boolean))],
        tokenDistribution: {
          avg: avgTokens,
          median: avgTokens,
          min: Math.min(...tokenCounts),
          max: Math.max(...tokenCounts),
          stdDev: 0,
          p25: avgTokens,
          p75: avgTokens,
          p95: avgTokens,
          distribution: {
            short: tokenCounts.filter(t => t < 50).length,
            medium: tokenCounts.filter(t => t >= 50 && t < 200).length,
            long: tokenCounts.filter(t => t >= 200).length,
          },
        },
      },
      status: "ready",
      userId: pipeline.userId,
    });

    return datasetId;
  },
});

// Start fine-tuning from pipeline (internal)
export const startFinetuning = internalMutation({
  args: {
    pipelineId: v.id("import_pipelines"),
    datasetId: v.id("datasets"),
  },
  handler: async (ctx, args) => {
    const pipeline = await ctx.db.get(args.pipelineId);
    if (!pipeline) throw new Error("Pipeline not found");

    const dataset = await ctx.db.get(args.datasetId);
    if (!dataset) throw new Error("Dataset not found");

    const finetuneConfig = pipeline.config.finetuneConfig;
    if (!finetuneConfig) return undefined;

    // Calculate AI-optimized parameters
    const datasetSize = dataset.size;
    const tokenDist = dataset.metadata.tokenDistribution;
    const avgTokens = tokenDist?.avg || dataset.metadata.avgTokens || 100;

    const learningRate = datasetSize < 1000 ? 5e-5 : datasetSize < 5000 ? 3e-5 : 2e-5;
    const batchSize = datasetSize < 1000 ? 8 : datasetSize < 5000 ? 16 : 32;
    const epochs = avgTokens < 50 ? 5 : avgTokens < 100 ? 4 : 3;
    const loraRank = datasetSize < 500 ? 4 : datasetSize < 2000 ? 8 : 16;
    const loraAlpha = loraRank * 2;

    const totalTokens = datasetSize * avgTokens * epochs;
    const estimatedCost = (totalTokens / 1000) * 0.008;
    const estimatedTimeMinutes = Math.ceil((datasetSize * epochs) / 1000 * 60);

    // Create fine-tuning job
    const jobId = await ctx.db.insert("finetune_jobs", {
      userId: pipeline.userId,
      datasetId: args.datasetId,
      status: "pending",
      parameters: {
        learningRate,
        batchSize,
        epochs,
        loraRank,
        loraAlpha,
      },
      provider: finetuneConfig.provider || "openai",
      model: finetuneConfig.model || "gpt-3.5-turbo",
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

    // Schedule job submission based on provider
    if (finetuneConfig.provider === "openai") {
      await ctx.scheduler.runAfter(0, (internal as any).providers_openai.submitJob, {
        jobId,
        datasetId: args.datasetId,
        model: finetuneConfig.model || "gpt-3.5-turbo",
        parameters: { learningRate, batchSize, epochs, loraRank, loraAlpha },
      });
    } else if (finetuneConfig.provider === "custom" && finetuneConfig.connectionId) {
      await ctx.scheduler.runAfter(0, (internal as any).providers_custom.submitJob, {
        jobId,
        datasetId: args.datasetId,
        connectionId: finetuneConfig.connectionId,
        parameters: { learningRate, batchSize, epochs, loraRank, loraAlpha },
      });
    }

    return jobId;
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