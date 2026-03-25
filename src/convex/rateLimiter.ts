import { MutationCtx, QueryCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";

// Rate limit configuration
// Action names must match what's logged in the activities table
const RATE_LIMITS = {
  content_created: { maxRequests: 20, windowMs: 60 * 1000 },      // 20 per minute
  dataset_created: { maxRequests: 5, windowMs: 60 * 1000 },       // 5 per minute
  finetune_started: { maxRequests: 3, windowMs: 60 * 1000 },      // 3 per minute
  llm_connection_created: { maxRequests: 5, windowMs: 60 * 1000 }, // 5 per minute
} as const;

type RateLimitAction = keyof typeof RATE_LIMITS;

/**
 * Check if a user has exceeded the rate limit for a given action.
 * Throws an error if rate limited.
 */
export async function checkRateLimit(
  ctx: MutationCtx,
  userId: Id<"users">,
  action: RateLimitAction,
): Promise<void> {
  const config = RATE_LIMITS[action];
  const now = Date.now();
  const windowStart = now - config.windowMs;

  // Query recent activities by this user for rate limiting
  const recentActions = await ctx.db
    .query("activities")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  // Filter to only the relevant action type within the time window
  const recentCount = recentActions.filter(
    (a) => a.action === action && a._creationTime >= windowStart,
  ).length;

  if (recentCount >= config.maxRequests) {
    throw new Error(
      `Rate limit exceeded for ${action}. Maximum ${config.maxRequests} requests per ${config.windowMs / 1000}s. Please try again later.`,
    );
  }
}

/**
 * Track a rate-limited action by creating an activity entry.
 */
export async function trackAction(
  ctx: MutationCtx,
  userId: Id<"users">,
  action: string,
  metadata?: Record<string, any>,
): Promise<void> {
  await ctx.db.insert("activities", {
    userId,
    action,
    metadata: metadata || {},
  });
}
