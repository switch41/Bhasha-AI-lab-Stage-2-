import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";

// ─── Replicate the in-memory rate limiter from auth/emailOtp.ts ─────────────

const otpRateLimits = new Map<string, { count: number; windowStart: number }>();
const OTP_RATE_MAX = 3;
const OTP_RATE_WINDOW_MS = 60 * 1000;
const OTP_DAILY_MAX = 10;
const dailyLimits = new Map<string, { count: number; dayStart: number }>();

function checkOtpRateLimit(email: string): void {
  const now = Date.now();

  const minuteEntry = otpRateLimits.get(email);
  if (minuteEntry && now - minuteEntry.windowStart < OTP_RATE_WINDOW_MS) {
    if (minuteEntry.count >= OTP_RATE_MAX) {
      throw new Error("Too many OTP requests. Please wait a minute and try again.");
    }
    minuteEntry.count++;
  } else {
    otpRateLimits.set(email, { count: 1, windowStart: now });
  }

  const dayStart = new Date();
  dayStart.setHours(0, 0, 0, 0);
  const dayEntry = dailyLimits.get(email);
  if (dayEntry && dayEntry.dayStart === dayStart.getTime()) {
    if (dayEntry.count >= OTP_DAILY_MAX) {
      throw new Error("Daily OTP limit reached. Try again tomorrow.");
    }
    dayEntry.count++;
  } else {
    dailyLimits.set(email, { count: 1, dayStart: dayStart.getTime() });
  }
}

// ─── Minute window ──────────────────────────────────────────────────────────

describe("OTP rate limiter — minute window", () => {
  beforeEach(() => {
    otpRateLimits.clear();
    dailyLimits.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-05T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should allow first 3 OTP requests within a minute", () => {
    expect(() => checkOtpRateLimit("user@test.com")).not.toThrow();
    expect(() => checkOtpRateLimit("user@test.com")).not.toThrow();
    expect(() => checkOtpRateLimit("user@test.com")).not.toThrow();
  });

  it("should block the 4th OTP request within the same minute", () => {
    checkOtpRateLimit("user@test.com");
    checkOtpRateLimit("user@test.com");
    checkOtpRateLimit("user@test.com");
    expect(() => checkOtpRateLimit("user@test.com")).toThrow(
      "Too many OTP requests",
    );
  });

  it("should reset the rate limit after the minute window passes", () => {
    checkOtpRateLimit("user@test.com");
    checkOtpRateLimit("user@test.com");
    checkOtpRateLimit("user@test.com");

    // Advance 61 seconds — window resets
    vi.advanceTimersByTime(61_000);

    // Now the minute window has expired — should be allowed again
    expect(() => checkOtpRateLimit("user@test.com")).not.toThrow();
  });

  it("should track different emails independently", () => {
    checkOtpRateLimit("alice@test.com");
    checkOtpRateLimit("alice@test.com");
    checkOtpRateLimit("alice@test.com");

    // bob uses a different email — should be allowed
    expect(() => checkOtpRateLimit("bob@test.com")).not.toThrow();

    // alice is still blocked
    expect(() => checkOtpRateLimit("alice@test.com")).toThrow(
      "Too many OTP requests",
    );
  });
});

// ─── Daily window ───────────────────────────────────────────────────────────

describe("OTP rate limiter — daily window", () => {
  beforeEach(() => {
    otpRateLimits.clear();
    dailyLimits.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-05T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should allow up to 10 OTPs per day per email", () => {
    // Do 3, wait >1min, do 3, wait >1min, do 3, wait >1min, do 1
    for (let batch = 0; batch < 3; batch++) {
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(1000);
        expect(() => checkOtpRateLimit("daily@test.com")).not.toThrow();
      }
      // Advance past the 1-min window before the next batch
      vi.advanceTimersByTime(61_000);
    }
    // 10th OTP
    vi.advanceTimersByTime(1000);
    expect(() => checkOtpRateLimit("daily@test.com")).not.toThrow();
  });

  it("should block the 11th OTP on the same day", () => {
    // 10 OTPs in 4 minute windows
    for (let batch = 0; batch < 3; batch++) {
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(1000);
        checkOtpRateLimit("daily@test.com");
      }
      vi.advanceTimersByTime(61_000);
    }
    vi.advanceTimersByTime(1000);
    checkOtpRateLimit("daily@test.com"); // 10th

    // 11th — blocked by daily limit
    vi.advanceTimersByTime(1000);
    expect(() => checkOtpRateLimit("daily@test.com")).toThrow(
      "Daily OTP limit reached",
    );
  });

  it("should reset daily limit on the next calendar day", () => {
    // 10 OTPs in 4 minute windows
    for (let batch = 0; batch < 3; batch++) {
      for (let i = 0; i < 3; i++) {
        vi.advanceTimersByTime(1000);
        checkOtpRateLimit("daily@test.com");
      }
      vi.advanceTimersByTime(61_000);
    }
    vi.advanceTimersByTime(1000);
    checkOtpRateLimit("daily@test.com"); // 10th

    // Advance to June 6 (next day at midnight)
    vi.setSystemTime(new Date("2026-06-06T00:00:01Z"));

    expect(() => checkOtpRateLimit("daily@test.com")).not.toThrow();
  });
});

// ─── Combined limits ────────────────────────────────────────────────────────

describe("OTP rate limiter — combined", () => {
  beforeEach(() => {
    otpRateLimits.clear();
    dailyLimits.clear();
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-06-05T12:00:00Z"));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("should enforce both minute and daily limits", () => {
    // 3 OTPs — minute limit hit
    checkOtpRateLimit("combined@test.com");
    checkOtpRateLimit("combined@test.com");
    checkOtpRateLimit("combined@test.com");

    // 4th blocked by minute limit
    expect(() => checkOtpRateLimit("combined@test.com")).toThrow(
      "Too many OTP requests",
    );

    // Advance past minute window
    vi.advanceTimersByTime(61_000);

    // 3 more (4-6)
    checkOtpRateLimit("combined@test.com");
    checkOtpRateLimit("combined@test.com");
    checkOtpRateLimit("combined@test.com");

    // Advance past minute window
    vi.advanceTimersByTime(61_000);

    // 3 more (7-9)
    checkOtpRateLimit("combined@test.com");
    checkOtpRateLimit("combined@test.com");
    checkOtpRateLimit("combined@test.com");

    // Advance past minute window
    vi.advanceTimersByTime(61_000);

    // 10th
    checkOtpRateLimit("combined@test.com");

    // 11th — blocked by daily limit
    vi.advanceTimersByTime(1000);
    expect(() => checkOtpRateLimit("combined@test.com")).toThrow(
      "Daily OTP limit reached",
    );
  });
});
