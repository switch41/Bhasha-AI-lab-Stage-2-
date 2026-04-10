import { describe, it, expect } from "vitest";

function validateRecord(record: any, requiredFields: string[]): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  for (const field of requiredFields) {
    if (!record[field] || String(record[field]).trim() === "") {
      errors.push(`Missing required field: ${field}`);
    }
  }
  if (record.text && record.text.length < 10) {
    errors.push("Text must be at least 10 characters");
  }
  if (record.text && record.text.length > 10000) {
    errors.push("Text cannot exceed 10,000 characters");
  }
  return { valid: errors.length === 0, errors };
}

function normalizeText(text: string): string {
  return text.trim().replace(/\s+/g, " ").replace(/[\r\n]+/g, " ");
}

function deduplicateRecords(records: { text: string; [key: string]: any }[]) {
  const seen = new Set<string>();
  return records.filter(r => {
    const normalized = normalizeText(r.text || "").toLowerCase();
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
}

function pipelineSplit(datasetSize: number): { train: number; validation: number; test: number } {
  if (datasetSize < 100) return { train: 0.85, validation: 0.10, test: 0.05 };
  if (datasetSize < 500) return { train: 0.80, validation: 0.10, test: 0.10 };
  if (datasetSize < 2000) return { train: 0.75, validation: 0.15, test: 0.10 };
  return { train: 0.70, validation: 0.20, test: 0.10 };
}

describe("pipelineSplit", () => {
  it("should maximize training for tiny datasets", () => {
    const s = pipelineSplit(50);
    expect(s.train).toBe(0.85);
    expect(s.validation).toBe(0.10);
    expect(s.test).toBe(0.05);
  });

  it("should use 80-10-10 for small datasets", () => {
    const s = pipelineSplit(300);
    expect(s.train).toBe(0.80);
    expect(s.validation).toBe(0.10);
    expect(s.test).toBe(0.10);
  });

  it("should use 75-15-10 for medium datasets", () => {
    const s = pipelineSplit(1000);
    expect(s.train).toBe(0.75);
    expect(s.validation).toBe(0.15);
    expect(s.test).toBe(0.10);
  });

  it("should use 70-20-10 for large datasets", () => {
    const s = pipelineSplit(5000);
    expect(s.train).toBe(0.70);
    expect(s.validation).toBe(0.20);
    expect(s.test).toBe(0.10);
  });

  it("should always sum to 1.0", () => {
    for (const size of [10, 50, 100, 500, 1000, 5000, 20000]) {
      const s = pipelineSplit(size);
      expect(s.train + s.validation + s.test).toBeCloseTo(1.0, 5);
    }
  });
});

describe("validateRecord", () => {
  it("should pass for valid record with all required fields", () => {
    const r = validateRecord({ text: "Hello world valid", language: "hi" }, ["text", "language"]);
    expect(r.valid).toBe(true);
  });

  it("should fail when required field is missing", () => {
    const r = validateRecord({ text: "Hello world" }, ["text", "language"]);
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("Missing required field: language");
  });

  it("should fail when text is too short", () => {
    const r = validateRecord({ text: "Hi", language: "hi" }, ["text", "language"]);
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("Text must be at least 10 characters");
  });

  it("should fail when text is too long", () => {
    const r = validateRecord({ text: "x".repeat(10001), language: "hi" }, ["text"]);
    expect(r.valid).toBe(false);
    expect(r.errors).toContain("Text cannot exceed 10,000 characters");
  });

  it("should report multiple validation errors", () => {
    const r = validateRecord({ text: "Hi" }, ["text", "language"]);
    expect(r.errors.length).toBeGreaterThanOrEqual(2);
  });
});

describe("deduplicateRecords", () => {
  it("should remove exact duplicates", () => {
    const result = deduplicateRecords([
      { text: "Hello world", language: "hi" },
      { text: "Hello world", language: "hi" },
    ]);
    expect(result).toHaveLength(1);
  });

  it("should treat whitespace-different texts as duplicates", () => {
    const result = deduplicateRecords([
      { text: "Hello   world", language: "hi" },
      { text: "Hello world", language: "ta" },
    ]);
    expect(result).toHaveLength(1);
  });

  it("should keep first occurrence of duplicates", () => {
    const result = deduplicateRecords([
      { text: "Duplicate", extra: "first" },
      { text: "Duplicate", extra: "second" },
    ]);
    expect(result[0].extra).toBe("first");
  });

  it("should filter out records with empty text", () => {
    const result = deduplicateRecords([
      { text: "", language: "hi" },
      { text: "Valid", language: "hi" },
    ]);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Valid");
  });
});
