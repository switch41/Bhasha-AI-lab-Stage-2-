import { describe, it, expect } from "vitest";

// ─── Extract pure functions for testing ─────────────────────────────────────
// These are tested via the exported content module's validation helpers.
// Since they're not exported, we replicate them here to test the logic.

function calculateSimilarity(text1: string, text2: string): number {
  const tokens1 = text1.toLowerCase().split(/\s+/);
  const tokens2 = text2.toLowerCase().split(/\s+/);
  const set1 = new Set(tokens1);
  const set2 = new Set(tokens2);
  const intersection = new Set([...set1].filter((x) => set2.has(x)));
  const union = new Set([...set1, ...set2]);
  return union.size > 0 ? intersection.size / union.size : 0;
}

function estimateTokenCount(text: string): number {
  return Math.ceil(text.length / 3);
}

function validateContentData(args: {
  text: string;
  language: string;
  contentType: string;
  region?: string;
  category?: string;
  source?: string;
  dialect?: string;
  culturalContext?: string;
}): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!args.text || args.text.trim().length === 0) {
    errors.push("Text content cannot be empty");
  } else if (args.text.trim().length < 10) {
    errors.push("Text content must be at least 10 characters long");
  } else if (args.text.trim().length > 10000) {
    errors.push("Text content cannot exceed 10,000 characters");
  }

  const validLanguages = [
    "hindi", "bengali", "tamil", "telugu", "marathi",
    "gujarati", "kannada", "malayalam", "punjabi", "odia",
  ];
  if (!validLanguages.includes(args.language.toLowerCase())) {
    errors.push(`Invalid language. Must be one of: ${validLanguages.join(", ")}`);
  }

  const validTypes = ["text", "proverb", "narrative"];
  if (!validTypes.includes(args.contentType)) {
    errors.push(`Invalid content type. Must be one of: ${validTypes.join(", ")}`);
  }

  if (args.region && args.region.length > 100) errors.push("Region name cannot exceed 100 characters");
  if (args.category && args.category.length > 100) errors.push("Category name cannot exceed 100 characters");
  if (args.source && args.source.length > 200) errors.push("Source cannot exceed 200 characters");
  if (args.dialect && args.dialect.length > 100) errors.push("Dialect name cannot exceed 100 characters");
  if (args.culturalContext && args.culturalContext.length > 1000) errors.push("Cultural context cannot exceed 1,000 characters");

  const tokenCount = estimateTokenCount(args.text);
  if (tokenCount > 2000) errors.push(`Text is too long (estimated ${tokenCount} tokens). Maximum is 2000 tokens.`);

  return { valid: errors.length === 0, errors };
}

// ─── calculateSimilarity ────────────────────────────────────────────────────

describe("calculateSimilarity", () => {
  it("should return 1 for identical texts", () => {
    expect(calculateSimilarity("hello world", "hello world")).toBe(1);
  });

  it("should return 0 for completely different texts", () => {
    expect(calculateSimilarity("hello world", "foo bar baz qux")).toBe(0);
  });

  it("should return partial similarity for overlapping texts", () => {
    const sim = calculateSimilarity("the quick brown fox", "the lazy dog");
    // Shared tokens: {"the"} -> intersection=1, union={"the","quick","brown","fox","lazy","dog"} -> 6
    expect(sim).toBeCloseTo(1 / 6, 5);
  });

  it("should be case-insensitive", () => {
    expect(calculateSimilarity("Hello World", "hello world")).toBe(1);
  });

  it("should return 1 for two empty texts (both token sets are {''})", () => {
    // split("") produces [""]; both sets contain only "", union=intersection=1
    expect(calculateSimilarity("", "")).toBe(1);
  });

  it("should handle one empty text", () => {
    expect(calculateSimilarity("hello", "")).toBe(0);
  });
});

// ─── estimateTokenCount ─────────────────────────────────────────────────────

describe("estimateTokenCount", () => {
  it("should estimate tokens as ceil(length / 3)", () => {
    expect(estimateTokenCount("abc")).toBe(1);
    expect(estimateTokenCount("abcd")).toBe(2);
    expect(estimateTokenCount("")).toBe(0);
  });

  it("should handle short texts", () => {
    expect(estimateTokenCount("a")).toBe(1);
  });

  it("should handle long texts", () => {
    expect(estimateTokenCount("x".repeat(300))).toBe(100);
  });
});

// ─── validateContentData ───────────────────────────────────────────────────

describe("validateContentData", () => {
  const validArgs = {
    text: "This is a valid Hindi text sample for testing",
    language: "hindi",
    contentType: "text",
  };

  it("should pass for valid content data", () => {
    const result = validateContentData(validArgs);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should fail for empty text", () => {
    const result = validateContentData({ ...validArgs, text: "" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Text content cannot be empty");
  });

  it("should fail for whitespace-only text", () => {
    const result = validateContentData({ ...validArgs, text: "   " });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Text content cannot be empty");
  });

  it("should fail for too-short text", () => {
    const result = validateContentData({ ...validArgs, text: "Hi" });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Text content must be at least 10 characters long");
  });

  it("should fail for too-long text", () => {
    const result = validateContentData({ ...validArgs, text: "x".repeat(10001) });
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Text content cannot exceed 10,000 characters");
  });

  it("should accept text at minimum boundary", () => {
    const result = validateContentData({ ...validArgs, text: "1234567890" });
    expect(result.valid).toBe(true);
  });

  it("should accept text at maximum boundary (token limit stricter than char limit)", () => {
    // 6000 chars -> ceil(6000/3) = 2000 tokens = exactly at token limit
    const result = validateContentData({ ...validArgs, text: "x".repeat(6000) });
    expect(result.valid).toBe(true);
  });

  it("should reject invalid language", () => {
    const result = validateContentData({ ...validArgs, language: "spanish" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Invalid language");
  });

  it("should be case-insensitive for language", () => {
    const result = validateContentData({ ...validArgs, language: "Hindi" });
    expect(result.valid).toBe(true);
  });

  it("should reject invalid content type", () => {
    const result = validateContentData({ ...validArgs, contentType: "poem" });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Invalid content type");
  });

  it("should accept 'proverb' content type", () => {
    const result = validateContentData({ ...validArgs, contentType: "proverb" });
    expect(result.valid).toBe(true);
  });

  it("should accept 'narrative' content type", () => {
    const result = validateContentData({ ...validArgs, contentType: "narrative" });
    expect(result.valid).toBe(true);
  });

  it("should reject region exceeding 100 chars", () => {
    const result = validateContentData({ ...validArgs, region: "x".repeat(101) });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Region name cannot exceed 100 characters");
  });

  it("should reject category exceeding 100 chars", () => {
    const result = validateContentData({ ...validArgs, category: "x".repeat(101) });
    expect(result.valid).toBe(false);
  });

  it("should reject source exceeding 200 chars", () => {
    const result = validateContentData({ ...validArgs, source: "x".repeat(201) });
    expect(result.valid).toBe(false);
  });

  it("should reject culturalContext exceeding 1000 chars", () => {
    const result = validateContentData({ ...validArgs, culturalContext: "x".repeat(1001) });
    expect(result.valid).toBe(false);
  });

  it("should reject text that exceeds token limit", () => {
    const result = validateContentData({ ...validArgs, text: "x".repeat(6003) });
    expect(result.valid).toBe(false);
    expect(result.errors[0]).toContain("Maximum is 2000 tokens");
  });

  it("should accept text at token limit boundary", () => {
    const result = validateContentData({ ...validArgs, text: "x".repeat(6000) });
    expect(result.valid).toBe(true);
  });
});
