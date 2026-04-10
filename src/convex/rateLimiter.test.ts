import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { checkRateLimit, trackAction } from "./rateLimiter";
import type { Id } from "./_generated/dataModel";

// ─── Mock Convex context ────────────────────────────────────────────────────

function createMockCtx(activities: any[] = []) {
  const insertMock = vi.fn().mockResolvedValue("new-activity-id");

  return {
    db: {
      query: vi.fn(() => ({
        withIndex: vi.fn(() => ({
          collect: vi.fn().mockResolvedValue(activities),
        })),
        collect: vi.fn().mockResolvedValue(activities),
      })),
      insert: insertMock,
    },
  } as any;
}

// ─── checkRateLimit ─────────────────────────────────────────────────────────

describe("checkRateLimit", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-05T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should allow requests within the limit", async () => {
    const ctx = createMockCtx([]);
    await expect(
      checkRateLimit(ctx, "user123" as Id<"users">, "content_created"),
    ).resolves.toBeUndefined();
  });

  it("should allow requests one below the limit, block at the limit", async () => {
    const now = Date.now();
    // 19 actions: passes (19 < 20 limit)
    const activities = Array.from({ length: 19 }, (_, i) => ({
      action: "content_created",
      _creationTime: now - i * 1000,
    }));

    const ctx = createMockCtx(activities);
    await expect(
      checkRateLimit(ctx, "user123" as Id<"users">, "content_created"),
    ).resolves.toBeUndefined();

    // 20 actions: throws (20 ≥ 20 limit)
    const atLimit = Array.from({ length: 20 }, (_, i) => ({
      action: "content_created",
      _creationTime: now - i * 1000,
    }));
    const ctxAtLimit = createMockCtx(atLimit);
    await expect(
      checkRateLimit(ctxAtLimit, "user123" as Id<"users">, "content_created"),
    ).rejects.toThrow("Rate limit exceeded for content_created");
  });

  it("should throw when exceeding the rate limit", async () => {
    const now = Date.now();
    const activities = Array.from({ length: 20 }, (_, i) => ({
      action: "content_created",
      _creationTime: now - i * 1000, // each 1 second apart
    }));

    const ctx = createMockCtx(activities);
    await expect(
      checkRateLimit(ctx, "user123" as Id<"users">, "content_created"),
    ).rejects.toThrow("Rate limit exceeded");
  });

  it("should NOT count actions outside the time window", async () => {
    const now = Date.now();
    // 20 actions, but the oldest is 61 seconds ago (outside the 60s window)
    const activities = Array.from({ length: 20 }, (_, i) => ({
      action: "content_created",
      _creationTime: now - 61_000 - i * 1000,
    }));

    const ctx = createMockCtx(activities);
    await expect(
      checkRateLimit(ctx, "user123" as Id<"users">, "content_created"),
    ).resolves.toBeUndefined();
  });

  it("should NOT count different action types", async () => {
    const now = Date.now();
    // 20 dataset_created actions, but we're checking content_created
    const activities = Array.from({ length: 20 }, (_, i) => ({
      action: "dataset_created" as const,
      _creationTime: now - i * 1000,
    }));

    const ctx = createMockCtx(activities);
    await expect(
      checkRateLimit(ctx, "user123" as Id<"users">, "content_created"),
    ).resolves.toBeUndefined();
  });

  it("should enforce different limits for different action types", async () => {
    const now = Date.now();
    // finetune_started limit is 3/min — at limit (≥3) it throws
    // 2 activities: passes (2 < 3)
    const twoActivities = Array.from({ length: 2 }, (_, i) => ({
      action: "finetune_started" as const,
      _creationTime: now - i * 1000,
    }));

    const ctxPass = createMockCtx(twoActivities);
    await expect(
      checkRateLimit(ctxPass, "user123" as Id<"users">, "finetune_started"),
    ).resolves.toBeUndefined();

    // 3 activities: throws (3 ≥ 3)
    const threeActivities = Array.from({ length: 3 }, (_, i) => ({
      action: "finetune_started" as const,
      _creationTime: now - i * 1000,
    }));
    const ctxFail = createMockCtx(threeActivities);
    await expect(
      checkRateLimit(ctxFail, "user123" as Id<"users">, "finetune_started"),
    ).rejects.toThrow("Rate limit exceeded for finetune_started");
  });

  it("should use the by_user index to query", async () => {
    const queryMock = vi.fn(() => ({
      withIndex: vi.fn((_indexName: string, _predicate: any) => ({
        collect: vi.fn().mockResolvedValue([]),
      })),
    }));
    const ctx = { db: { query: queryMock, insert: vi.fn() } } as any;

    await checkRateLimit(ctx, "user456" as Id<"users">, "content_created");

    expect(queryMock).toHaveBeenCalledWith("activities");
  });
});

// ─── trackAction ────────────────────────────────────────────────────────────

describe("trackAction", () => {
  it("should insert an activity record", async () => {
    const insertMock = vi.fn().mockResolvedValue("activity-id");
    const ctx = { db: { insert: insertMock } } as any;

    await trackAction(ctx, "user123" as Id<"users">, "content_created", {
      contentId: "content-1",
    });

    expect(insertMock).toHaveBeenCalledWith("activities", {
      userId: "user123",
      action: "content_created",
      metadata: { contentId: "content-1" },
    });
  });

  it("should accept action without metadata", async () => {
    const insertMock = vi.fn().mockResolvedValue("activity-id");
    const ctx = { db: { insert: insertMock } } as any;

    await trackAction(ctx, "user123" as Id<"users">, "dataset_created");

    expect(insertMock).toHaveBeenCalledWith("activities", {
      userId: "user123",
      action: "dataset_created",
      metadata: {},
    });
  });
});
