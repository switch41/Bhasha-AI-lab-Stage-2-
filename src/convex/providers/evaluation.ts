"use node";

import { internalAction } from "../_generated/server";
import { internal } from "../_generated/api";
import { v } from "convex/values";

// Evaluate a test prompt against both base and fine-tuned models
export const evaluatePrompt = internalAction({
  args: {
    promptId: v.id("test_prompts"),
    jobId: v.id("finetune_jobs"),
    prompt: v.string(),
    expectedOutput: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error("OPENAI_API_KEY not configured");
    }

    // Get job details to find the models
    const job: any = await ctx.runQuery((internal as any).finetune.getStatusInternal, { jobId: args.jobId });
    if (!job) throw new Error("Job not found");

    // Generate output from base model
    const baseModelOutput = await generateCompletion(apiKey, job.model, args.prompt);

    // Generate output from fine-tuned model (if available)
    let fineTunedOutput = "";
    if (job.modelId) {
      fineTunedOutput = await generateCompletion(apiKey, job.modelId, args.prompt);
    }

    // Calculate BLEU score if expected output is provided
    let bleuScore: number | undefined;
    let culturalAccuracy: number | undefined;

    if (args.expectedOutput) {
      bleuScore = calculateBLEU(fineTunedOutput, args.expectedOutput);
      culturalAccuracy = calculateCulturalAccuracy(fineTunedOutput, args.expectedOutput);
    }

    // Update the test prompt with results
    await ctx.runMutation((internal as any).testPrompts.updateResults, {
      id: args.promptId,
      baseModelOutput,
      fineTunedOutput,
      bleuScore,
      culturalAccuracy,
      status: "completed",
    });

    return {
      baseModelOutput,
      fineTunedOutput,
      bleuScore,
      culturalAccuracy,
    };
  },
});

// Helper function to generate completion from OpenAI
async function generateCompletion(apiKey: string, model: string, prompt: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: model,
      messages: [
        { role: "user", content: prompt }
      ],
      max_tokens: 500,
      temperature: 0.7,
    }),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI API error: ${error}`);
  }

  const data = await response.json();
  return data.choices[0]?.message?.content || "";
}

// Calculate BLEU score (simplified implementation)
function calculateBLEU(candidate: string, reference: string): number {
  // Tokenize
  const candidateTokens = candidate.toLowerCase().split(/\s+/);
  const referenceTokens = reference.toLowerCase().split(/\s+/);

  if (candidateTokens.length === 0 || referenceTokens.length === 0) {
    return 0;
  }

  // Calculate unigram precision
  let matches = 0;
  const refSet = new Set(referenceTokens);
  
  for (const token of candidateTokens) {
    if (refSet.has(token)) {
      matches++;
    }
  }

  const precision = matches / candidateTokens.length;

  // Brevity penalty
  const bp = candidateTokens.length >= referenceTokens.length 
    ? 1 
    : Math.exp(1 - referenceTokens.length / candidateTokens.length);

  // BLEU score (simplified unigram version)
  return bp * precision;
}

// Calculate cultural accuracy (semantic similarity approximation)
function calculateCulturalAccuracy(candidate: string, reference: string): number {
  // Simple word overlap-based similarity
  const candidateWords = new Set(candidate.toLowerCase().split(/\s+/));
  const referenceWords = new Set(reference.toLowerCase().split(/\s+/));

  const intersection = new Set([...candidateWords].filter(x => referenceWords.has(x)));
  const union = new Set([...candidateWords, ...referenceWords]);

  return union.size > 0 ? intersection.size / union.size : 0;
}
