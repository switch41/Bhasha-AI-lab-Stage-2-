"use node";

import { v } from "convex/values";
import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";

// Submit fine-tuning job to custom LLM
export const submitJob: any = internalAction({
  args: {
    jobId: v.id("finetune_jobs"),
    datasetId: v.id("datasets"),
    connectionId: v.id("llm_connections"),
    parameters: v.object({
      learningRate: v.number(),
      batchSize: v.number(),
      epochs: v.number(),
      loraRank: v.number(),
      loraAlpha: v.number(),
    }),
  },
  handler: async (ctx, args): Promise<string> => {
    // Get connection details
    const connection: any = await ctx.runQuery((internal as any).llmConnections.get, {
      id: args.connectionId,
    });

    if (!connection) throw new Error("LLM connection not found");
    if (!connection.isActive) throw new Error("LLM connection is not active");

    // Get dataset content
    const dataset: any = await ctx.runQuery(internal.datasets.get, { id: args.datasetId });
    if (!dataset) throw new Error("Dataset not found");

    // Export dataset in the configured format
    const exportData: any = await ctx.runQuery(internal.datasets.exportData, {
      id: args.datasetId,
      format: connection.dataFormat,
      split: { train: 0.9, validation: 0.1, test: 0 },
    });

    // Prepare request headers
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (connection.authType === "bearer" && connection.apiKey) {
      headers["Authorization"] = `Bearer ${connection.apiKey}`;
    } else if (connection.authType === "api_key" && connection.apiKey) {
      headers["X-API-Key"] = connection.apiKey;
    }

    // Prepare request body with flexible structure
    const requestBody = {
      training_data: exportData.train,
      validation_data: exportData.validation,
      parameters: {
        learning_rate: args.parameters.learningRate,
        batch_size: args.parameters.batchSize,
        epochs: args.parameters.epochs,
        lora_rank: args.parameters.loraRank,
        lora_alpha: args.parameters.loraAlpha,
      },
      model_identifier: connection.modelIdentifier || dataset.language,
      dataset_info: {
        language: dataset.language,
        size: dataset.size,
        quality_score: dataset.qualityScore,
      },
    };

    // Submit job to custom LLM API
    let response: Response;
    let retries = 3;
    
    while (retries > 0) {
      try {
        response = await fetch(connection.apiEndpoint, {
          method: "POST",
          headers,
          body: JSON.stringify(requestBody),
        });

        if (response.ok) break;
        
        retries--;
        if (retries > 0) {
          await new Promise(resolve => setTimeout(resolve, 2000));
        }
      } catch (error) {
        retries--;
        if (retries === 0) {
          throw new Error(`Failed to connect to custom LLM API: ${error}`);
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
      }
    }

    if (!response!.ok) {
      const errorText = await response!.text();
      throw new Error(`Custom LLM API error: ${errorText}`);
    }

    const result: any = await response!.json();

    // Extract job ID from response (flexible field names)
    const providerJobId = result.job_id || result.id || result.task_id || result.request_id || "custom-job";

    // Update job with provider ID
    await ctx.runMutation(internal.finetune.updateStatus, {
      jobId: args.jobId,
      status: "running",
      providerJobId,
    });

    return providerJobId;
  },
});

// Poll job status from custom LLM
export const pollJobStatus: any = internalAction({
  args: {
    jobId: v.id("finetune_jobs"),
    providerJobId: v.string(),
    connectionId: v.id("llm_connections"),
  },
  handler: async (ctx, args) => {
    const connection: any = await ctx.runQuery((internal as any).llmConnections.get, {
      id: args.connectionId,
    });

    if (!connection) throw new Error("LLM connection not found");

    // Use status endpoint if provided, otherwise use main endpoint
    const statusUrl = connection.statusEndpoint 
      ? `${connection.statusEndpoint}/${args.providerJobId}`
      : `${connection.apiEndpoint}/${args.providerJobId}`;

    const headers: Record<string, string> = {};
    if (connection.authType === "bearer" && connection.apiKey) {
      headers["Authorization"] = `Bearer ${connection.apiKey}`;
    } else if (connection.authType === "api_key" && connection.apiKey) {
      headers["X-API-Key"] = connection.apiKey;
    }

    const response = await fetch(statusUrl, { headers });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Failed to fetch job status: ${error}`);
    }

    const result: any = await response.json();

    // Map custom status to our status (flexible field names)
    const customStatus = result.status || result.state || result.job_status || "unknown";
    let status = "running";
    
    if (["completed", "success", "finished", "done"].includes(customStatus.toLowerCase())) {
      status = "completed";
    } else if (["failed", "error", "cancelled", "canceled"].includes(customStatus.toLowerCase())) {
      status = "failed";
    }

    // Extract metrics (flexible structure)
    const metrics = {
      loss: result.metrics?.loss || result.loss || [],
      steps: result.metrics?.steps || result.steps || result.iterations || 0,
      currentEpoch: result.metrics?.epoch || result.epoch || result.current_epoch || 0,
    };

    // Extract model ID
    const modelId = result.model_id || result.model || result.fine_tuned_model || undefined;

    // Update job status
    await ctx.runMutation(internal.finetune.updateStatus, {
      jobId: args.jobId,
      status,
      modelId,
      metrics,
      results: result,
    });

    return status;
  },
});

// Test connection
export const testConnection: any = internalAction({
  args: {
    connectionId: v.id("llm_connections"),
  },
  handler: async (ctx, args) => {
    const connection: any = await ctx.runQuery((internal as any).llmConnections.get, {
      id: args.connectionId,
    });

    if (!connection) throw new Error("LLM connection not found");

    const headers: Record<string, string> = {};
    if (connection.authType === "bearer" && connection.apiKey) {
      headers["Authorization"] = `Bearer ${connection.apiKey}`;
    } else if (connection.authType === "api_key" && connection.apiKey) {
      headers["X-API-Key"] = connection.apiKey;
    }

    try {
      const response = await fetch(connection.apiEndpoint, {
        method: "GET",
        headers,
      });

      const testStatus = response.ok ? "success" : "failed";
      
      await ctx.runMutation((internal as any).llmConnections.updateTestStatus, {
        id: args.connectionId,
        testStatus,
        lastTested: Date.now(),
      });

      return { success: response.ok, status: response.status };
    } catch (error) {
      await ctx.runMutation((internal as any).llmConnections.updateTestStatus, {
        id: args.connectionId,
        testStatus: "failed",
        lastTested: Date.now(),
      });

      throw new Error(`Connection test failed: ${error}`);
    }
  },
});
