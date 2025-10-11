"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

// OpenAI Fine-tuning Integration
export const submitJob: any = internalAction({
  args: {
    jobId: v.id("finetune_jobs"),
    datasetId: v.id("datasets"),
    model: v.string(),
    parameters: v.object({
      learningRate: v.number(),
      batchSize: v.number(),
      epochs: v.number(),
      loraRank: v.number(),
      loraAlpha: v.number(),
    }),
  },
  handler: async (ctx, args): Promise<string> => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // Get dataset content
    const dataset: any = await ctx.runQuery(internal.datasets.get, { id: args.datasetId });
    if (!dataset) throw new Error("Dataset not found");

    // Export dataset to JSONL format
    const exportData: any = await ctx.runQuery(internal.datasets.exportData, {
      id: args.datasetId,
      format: "jsonl",
      split: { train: 0.9, validation: 0.1, test: 0 },
    });

    // Convert to OpenAI fine-tuning format
    const trainingData = exportData.train.map((item: any) => ({
      messages: [
        { role: "system", content: `You are an AI assistant trained on ${dataset.language} language data.` },
        { role: "user", content: item.text },
        { role: "assistant", content: item.text },
      ],
    }));

    const validationData: any[] = exportData.validation.map((item: any) => ({
      messages: [
        { role: "system", content: `You are an AI assistant trained on ${dataset.language} language data.` },
        { role: "user", content: item.text },
        { role: "assistant", content: item.text },
      ],
    }));

    // Upload training file
    const trainingFile = await uploadFile(apiKey, trainingData, "training");
    const validationFile: any = validationData.length > 0 
      ? await uploadFile(apiKey, validationData, "validation")
      : null;

    // Create fine-tuning job
    const response: any = await fetch("https://api.openai.com/v1/fine_tuning/jobs", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        training_file: trainingFile.id,
        validation_file: validationFile?.id,
        model: args.model === "gpt-4" ? "gpt-4-0613" : "gpt-3.5-turbo-0613",
        hyperparameters: {
          n_epochs: args.parameters.epochs,
          batch_size: args.parameters.batchSize,
          learning_rate_multiplier: args.parameters.learningRate / 0.00003,
        },
        suffix: `bhasha-${dataset.language}`,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`OpenAI API error: ${error}`);
    }

    const job: any = await response.json();

    // Update job with provider ID
    await ctx.runMutation(internal.finetune.updateStatus, {
      jobId: args.jobId,
      status: "running",
      providerJobId: job.id,
    });

    return job.id;
  },
});

// Helper function to upload files to OpenAI
async function uploadFile(apiKey: string, data: any[], purpose: string) {
  const jsonl = data.map(item => JSON.stringify(item)).join("\n");
  const blob = new Blob([jsonl], { type: "application/jsonl" });
  
  const formData = new FormData();
  formData.append("file", blob, `${purpose}.jsonl`);
  formData.append("purpose", "fine-tune");

  const response = await fetch("https://api.openai.com/v1/files", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to upload file: ${error}`);
  }

  return await response.json();
}

// Poll job status
export const pollJobStatus: any = internalAction({
  args: {
    jobId: v.id("finetune_jobs"),
    providerJobId: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await fetch(
      `https://api.openai.com/v1/fine_tuning/jobs/${args.providerJobId}`,
      {
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch job status: ${error}`);
    }

    const job = await response.json();

    // Map OpenAI status to our status
    let status = "running";
    if (job.status === "succeeded") status = "completed";
    if (job.status === "failed") status = "failed";
    if (job.status === "cancelled") status = "cancelled";

    // Extract metrics
    const metrics = {
      loss: job.result_files?.length > 0 ? [parseFloat(job.trained_tokens) / 1000000] : [],
      steps: job.trained_tokens || 0,
      currentEpoch: job.hyperparameters?.n_epochs || 0,
    };

    // Update job status
    await ctx.runMutation(internal.finetune.updateStatus, {
      jobId: args.jobId,
      status,
      modelId: job.fine_tuned_model,
      metrics,
      results: {
        fineTunedModel: job.fine_tuned_model,
        trainedTokens: job.trained_tokens,
        resultFiles: job.result_files,
      },
    });

    return status;
  },
});

// Cancel job
export const cancelJob: any = internalAction({
  args: {
    providerJobId: v.string(),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    const response = await fetch(
      `https://api.openai.com/v1/fine_tuning/jobs/${args.providerJobId}/cancel`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${apiKey}`,
        },
      }
    );

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to cancel job: ${error}`);
    }

    return await response.json();
  },
});
