import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// default user roles. can add / remove based on the project as needed
export const ROLES = {
  ADMIN: "admin",
  USER: "user",
  MEMBER: "member",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.USER),
  v.literal(ROLES.MEMBER),
);
export type Role = Infer<typeof roleValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // role of the user. do not remove
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // Content contributions
    content: defineTable({
      userId: v.id("users"),
      text: v.string(),
      language: v.string(),
      contentType: v.union(v.literal("text"), v.literal("proverb"), v.literal("narrative")),
      region: v.optional(v.string()),
      category: v.optional(v.string()),
      source: v.optional(v.string()),
      dialect: v.optional(v.string()),
      culturalContext: v.optional(v.string()),
      status: v.union(v.literal("draft"), v.literal("published")),
      qualityScore: v.number(),
      translatedText: v.optional(v.string()),
      aiAnalysis: v.optional(v.any()),
    }).index("by_user", ["userId"])
      .index("by_language", ["language"])
      .index("by_status", ["status"]),

    // Datasets
    datasets: defineTable({
      userId: v.id("users"),
      name: v.string(),
      language: v.string(),
      contentType: v.string(),
      size: v.number(),
      entryIds: v.array(v.id("content")),
      qualityScore: v.number(),
      metadata: v.object({
        avgTokens: v.number(),
        regions: v.array(v.string()),
        categories: v.array(v.string()),
        tokenDistribution: v.optional(v.object({
          avg: v.number(),
          median: v.number(),
          min: v.number(),
          max: v.number(),
          stdDev: v.number(),
          p25: v.number(),
          p75: v.number(),
          p95: v.number(),
          distribution: v.object({
            short: v.number(),
            medium: v.number(),
            long: v.number(),
          }),
        })),
      }),
      status: v.string(),
    }).index("by_language", ["language"])
      .index("by_user", ["userId"]),

    // Fine-tuning jobs
    finetune_jobs: defineTable({
      userId: v.id("users"),
      datasetId: v.id("datasets"),
      status: v.string(),
      parameters: v.object({
        learningRate: v.number(),
        batchSize: v.number(),
        epochs: v.number(),
        loraRank: v.number(),
        loraAlpha: v.number(),
      }),
      provider: v.string(),
      model: v.string(),
      providerJobId: v.optional(v.string()),
      modelId: v.optional(v.string()),
      metrics: v.object({
        loss: v.array(v.number()),
        steps: v.number(),
        currentEpoch: v.number(),
      }),
      results: v.optional(v.any()),
      estimatedCost: v.number(),
      estimatedTimeMinutes: v.number(),
      completedAt: v.optional(v.number()),
    }).index("by_user", ["userId"])
      .index("by_status", ["status"]),

    // Test prompts for model evaluation
    test_prompts: defineTable({
      userId: v.id("users"),
      jobId: v.id("finetune_jobs"),
      prompt: v.string(),
      expectedOutput: v.optional(v.string()),
      baseModelOutput: v.optional(v.string()),
      fineTunedOutput: v.optional(v.string()),
      bleuScore: v.optional(v.number()),
      culturalAccuracy: v.optional(v.number()),
      status: v.string(),
    }).index("by_job", ["jobId"])
      .index("by_user", ["userId"]),

    // Activity feed
    activities: defineTable({
      userId: v.id("users"),
      action: v.string(),
      contentId: v.optional(v.id("content")),
      datasetId: v.optional(v.id("datasets")),
      finetuneJobId: v.optional(v.id("finetune_jobs")),
      metadata: v.optional(v.any()),
    }).index("by_user", ["userId"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;