import { v } from "convex/values";
import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { getCurrentUser } from "./users";
import { internal } from "./_generated/api";

// Create test prompt
export const create = mutation({
  args: {
    jobId: v.id("finetune_jobs"),
    prompt: v.string(),
    expectedOutput: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const promptId = await ctx.db.insert("test_prompts", {
      userId: user._id,
      jobId: args.jobId,
      prompt: args.prompt,
      expectedOutput: args.expectedOutput,
      baseModelOutput: undefined,
      fineTunedOutput: undefined,
      bleuScore: undefined,
      culturalAccuracy: undefined,
      status: "pending",
    });

    return promptId;
  },
});

// List test prompts for a job
export const listByJob = query({
  args: { jobId: v.id("finetune_jobs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("test_prompts")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .collect();
  },
});

// Internal version for backend use
export const listByJobInternal = internalQuery({
  args: { jobId: v.id("finetune_jobs") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("test_prompts")
      .withIndex("by_job", (q) => q.eq("jobId", args.jobId))
      .collect();
  },
});

// Get test prompt
export const get = query({
  args: { id: v.id("test_prompts") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});

// Update test results (internal for backend use)
export const updateResults = internalMutation({
  args: {
    id: v.id("test_prompts"),
    baseModelOutput: v.optional(v.string()),
    fineTunedOutput: v.optional(v.string()),
    bleuScore: v.optional(v.number()),
    culturalAccuracy: v.optional(v.number()),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const { id, ...updates } = args;
    await ctx.db.patch(id, updates);
    return id;
  },
});

// Trigger evaluation for a test prompt
export const triggerEvaluation = mutation({
  args: {
    promptId: v.id("test_prompts"),
  },
  handler: async (ctx, args) => {
    const user = await getCurrentUser(ctx);
    if (!user) throw new Error("Not authenticated");

    const prompt = await ctx.db.get(args.promptId);
    if (!prompt) throw new Error("Prompt not found");

    // Schedule evaluation
    await ctx.scheduler.runAfter(0, (internal as any).providers_evaluation.evaluatePrompt, {
      promptId: args.promptId,
      jobId: prompt.jobId,
      prompt: prompt.prompt,
      expectedOutput: prompt.expectedOutput,
    });

    return args.promptId;
  },
});