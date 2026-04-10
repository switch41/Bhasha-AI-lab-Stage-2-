import { describe, it, expect } from "vitest";
import {
  detectFormat,
  parseCSV,
  parseJSON,
  applyFieldMapping,
  normalizeText,
  validateRecord,
  deduplicateRecords,
} from "./dataTransform";

// ─── detectFormat ───────────────────────────────────────────────────────────

describe("detectFormat", () => {
  it("should detect CSV format with comma-separated data", () => {
    expect(detectFormat("a,b,c\n1,2,3")).toBe("csv");
  });

  it("should detect CSV with single row", () => {
    expect(detectFormat("header1,header2\nval1,val2")).toBe("csv");
  });

  it("should detect JSONL format (newline-delimited JSON)", () => {
    const jsonl = '{"a":1}\n{"a":2}\n{"a":3}';
    expect(detectFormat(jsonl)).toBe("jsonl");
  });

  it("should detect JSONL with single line", () => {
    expect(detectFormat('{"a":1}')).toBe("jsonl");
  });

  it("should detect JSON array format", () => {
    // Multi-line JSON array — JSONL check fails because each line isn't valid JSON
    expect(detectFormat('[\n{"a":1},\n{"a":2}\n]')).toBe("json");
  });

  it("should return unknown for empty string", () => {
    expect(detectFormat("")).toBe("unknown");
  });

  it("should return unknown for whitespace-only", () => {
    expect(detectFormat("   \n  \n   ")).toBe("unknown");
  });

  it("should return unknown for plain text", () => {
    expect(detectFormat("hello world")).toBe("unknown");
  });

  it("should return CSV for data that looks like CSV even if JSON-like", () => {
    // Values separated by commas with multiple lines
    expect(detectFormat('{"a":1},{"b":2}\n{"a":3},{"b":4}')).toBe("csv");
  });

  it("should prefer JSONL over CSV when each line is valid JSON", () => {
    // Each line is valid JSON, so detected as JSONL even though it has commas
    expect(detectFormat('{"a":"b,c"}\n{"d":"e,f"}')).toBe("jsonl");
  });

  it("should return unknown for JSONL with empty lines (each line must pass JSON.parse)", () => {
    // Empty line causes JSONL detection to fail, and no commas means it's not CSV either
    expect(detectFormat('{"a":1}\n\n{"a":2}')).toBe("unknown");
  });

  it("should detect CSV with quoted fields containing commas", () => {
    expect(detectFormat('"a,b",c\n1,2')).toBe("csv");
  });
});

// ─── parseCSV ───────────────────────────────────────────────────────────────

describe("parseCSV", () => {
  it("should parse CSV with header and multiple rows", () => {
    const csv = "name,age,city\nAlice,30,NYC\nBob,25,LA";
    const result = parseCSV(csv);
    expect(result).toEqual([
      { name: "Alice", age: "30", city: "NYC" },
      { name: "Bob", age: "25", city: "LA" },
    ]);
  });

  it("should return empty array for less than 2 lines", () => {
    expect(parseCSV("header")).toEqual([]);
    expect(parseCSV("")).toEqual([]);
  });

  it("should strip surrounding quotes from values", () => {
    // Note: simple parser splits by comma first, so quoted fields with
    // internal commas produce truncated values — known limitation
    const csv = 'name,desc\nAlice,"Hello"\nBob,"Test"';
    const result = parseCSV(csv);
    expect(result).toEqual([
      { name: "Alice", desc: "Hello" },
      { name: "Bob", desc: "Test" },
    ]);
  });

  it("should handle empty trailing values", () => {
    const csv = "a,b,c\n1,,3";
    const result = parseCSV(csv);
    expect(result).toEqual([{ a: "1", b: "", c: "3" }]);
  });

  it("should handle missing trailing fields", () => {
    const csv = "a,b,c\n1,2";
    const result = parseCSV(csv);
    expect(result).toEqual([{ a: "1", b: "2", c: "" }]);
  });

  it("should trim whitespace from headers and values", () => {
    const csv = "  name , age \n  Alice , 30 ";
    const result = parseCSV(csv);
    expect(result).toEqual([{ name: "Alice", age: "30" }]);
  });

  it("should handle single column CSV", () => {
    const csv = "value\nabc\ndef";
    const result = parseCSV(csv);
    expect(result).toEqual([{ value: "abc" }, { value: "def" }]);
  });
});

// ─── parseJSON ──────────────────────────────────────────────────────────────

describe("parseJSON", () => {
  it("should parse JSON array", () => {
    const data = '[{"id":1,"name":"Alice"},{"id":2,"name":"Bob"}]';
    const result = parseJSON(data, "json");
    expect(result).toEqual([
      { id: 1, name: "Alice" },
      { id: 2, name: "Bob" },
    ]);
  });

  it("should parse JSONL format", () => {
    const data = '{"id":1}\n{"id":2}\n{"id":3}';
    const result = parseJSON(data, "jsonl");
    expect(result).toEqual([{ id: 1 }, { id: 2 }, { id: 3 }]);
  });

  it("should parse JSONL with trailing newline", () => {
    const data = '{"id":1}\n{"id":2}\n';
    const result = parseJSON(data, "jsonl");
    expect(result).toEqual([{ id: 1 }, { id: 2 }]);
  });

  it("should parse empty JSON array", () => {
    expect(parseJSON("[]", "json")).toEqual([]);
  });

  it("should throw on malformed JSON", () => {
    expect(() => parseJSON("{invalid}", "json")).toThrow();
  });
});

// ─── applyFieldMapping ──────────────────────────────────────────────────────

describe("applyFieldMapping", () => {
  it("should map source fields to target fields", () => {
    const record = { content: "Hello", lang: "hi", type: "text" };
    const mappings = { text: "content", language: "lang", contentType: "type" };
    expect(applyFieldMapping(record, mappings)).toEqual({
      text: "Hello",
      language: "hi",
      // record.type is "text", so contentType gets the VALUE "text"
      contentType: "text",
    });
  });

  it("should skip mappings where source field is missing", () => {
    const record = { content: "Hello" };
    const mappings = { text: "content", language: "lang" };
    const result = applyFieldMapping(record, mappings);
    expect(result).toEqual({ text: "Hello" });
    expect(result).not.toHaveProperty("language");
  });

  it("should skip mappings with empty source field name", () => {
    const record = { content: "Hello", lang: "hi" };
    const mappings = { text: "content", language: "" };
    const result = applyFieldMapping(record, mappings);
    expect(result).toEqual({ text: "Hello" });
    expect(result).not.toHaveProperty("language");
  });

  it("should handle undefined source field value", () => {
    const record = { content: "Hello", lang: undefined };
    const mappings = { text: "content", language: "lang" };
    const result = applyFieldMapping(record, mappings);
    expect(result).toEqual({ text: "Hello" });
    expect(result).not.toHaveProperty("language");
  });

  it("should handle empty mappings object", () => {
    expect(applyFieldMapping({ a: 1 }, {})).toEqual({});
  });

  it("should concatenate textColumns into text field", () => {
    const record = { name: "Alice", age: "30", city: "NYC", lang: "en" };
    const mappings = { category: "name", language: "lang" };
    const result = applyFieldMapping(record, mappings, ["name", "age", "city"]);
    expect(result.text).toBe("Alice 30 NYC");
    expect(result.category).toBe("Alice");
  });

  it("should skip empty/null values in textColumns", () => {
    const record = { col1: "Hello", col2: "", col3: null };
    const result = applyFieldMapping(record, {}, ["col1", "col2", "col3"]);
    expect(result.text).toBe("Hello");
  });

  it("should fall back to mappings.text when textColumns is empty", () => {
    const record = { content: "Hello world", lang: "hi" };
    const mappings = { text: "content", language: "lang" };
    const result = applyFieldMapping(record, mappings, []);
    expect(result.text).toBe("Hello world");
    expect(result.language).toBe("hi");
  });

  it("should prefer textColumns over mappings.text when both are given", () => {
    const record = { content: "Hello", colA: "A", colB: "B", lang: "en" };
    const mappings = { text: "content", language: "lang" };
    const result = applyFieldMapping(record, mappings, ["colA", "colB"]);
    expect(result.text).toBe("A B");
    expect(result.language).toBe("en");
  });
});

// ─── normalizeText ──────────────────────────────────────────────────────────

describe("normalizeText", () => {
  it("should trim whitespace", () => {
    expect(normalizeText("  hello world  ")).toBe("hello world");
  });

  it("should collapse multiple spaces into one", () => {
    expect(normalizeText("hello    world   test")).toBe("hello world test");
  });

  it("should replace newlines with space", () => {
    expect(normalizeText("hello\nworld\rtest")).toBe("hello world test");
  });

  it("should handle empty string", () => {
    expect(normalizeText("")).toBe("");
  });

  it("should handle already-normalized text", () => {
    expect(normalizeText("hello world")).toBe("hello world");
  });

  it("should handle text with only whitespace", () => {
    expect(normalizeText("   \n  \r  ")).toBe("");
  });
});

// ─── validateRecord ─────────────────────────────────────────────────────────

describe("validateRecord", () => {
  it("should return valid for a complete record", () => {
    const record = { text: "Hello world", language: "hi" };
    const result = validateRecord(record, ["text", "language"]);
    expect(result.valid).toBe(true);
    expect(result.errors).toEqual([]);
  });

  it("should fail when required field is missing", () => {
    const record = { text: "Hello" };
    const result = validateRecord(record, ["text", "language"]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing required field: language");
  });

  it("should fail when required field is empty string", () => {
    const record = { text: "", language: "hi" };
    const result = validateRecord(record, ["text"]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing required field: text");
  });

  it("should fail when text is too short", () => {
    const record = { text: "Hi", language: "hi" };
    const result = validateRecord(record, ["text", "language"]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Text must be at least 10 characters");
  });

  it("should fail when text is too long", () => {
    const record = { text: "x".repeat(10001), language: "hi" };
    const result = validateRecord(record, ["text", "language"]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Text cannot exceed 10,000 characters");
  });

  it("should report multiple errors", () => {
    const record = { text: "Hi" };
    const result = validateRecord(record, ["text", "language"]);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain("Missing required field: language");
    expect(result.errors).toContain("Text must be at least 10 characters");
  });

  it("should pass when text is exactly at the minimum boundary", () => {
    const record = { text: "1234567890", language: "hi" };
    const result = validateRecord(record, ["text", "language"]);
    expect(result.valid).toBe(true);
  });

  it("should pass when text is exactly at the maximum boundary", () => {
    const record = { text: "x".repeat(10000), language: "hi" };
    const result = validateRecord(record, ["text", "language"]);
    expect(result.valid).toBe(true);
  });
});

// ─── deduplicateRecords ─────────────────────────────────────────────────────

describe("deduplicateRecords", () => {
  it("should remove exact duplicate texts", () => {
    const records = [
      { text: "Hello world", language: "hi" },
      { text: "Hello world", language: "hi" },
      { text: "Different text", language: "ta" },
    ];
    const result = deduplicateRecords(records);
    expect(result).toHaveLength(2);
    expect(result.map((r) => r.text)).toContain("Hello world");
    expect(result.map((r) => r.text)).toContain("Different text");
  });

  it("should treat whitespace-different texts as duplicates", () => {
    const records = [
      { text: "Hello   world", language: "hi" },
      { text: "Hello world", language: "ta" },
    ];
    const result = deduplicateRecords(records);
    expect(result).toHaveLength(1);
  });

  it("should treat case-different texts as duplicates", () => {
    const records = [
      { text: "Hello World", language: "hi" },
      { text: "hello world", language: "ta" },
    ];
    const result = deduplicateRecords(records);
    expect(result).toHaveLength(1);
  });

  it("should return all unique records unchanged", () => {
    const records = [
      { text: "First content", language: "hi" },
      { text: "Second content", language: "ta" },
      { text: "Third content", language: "te" },
    ];
    const result = deduplicateRecords(records);
    expect(result).toHaveLength(3);
  });

  it("should handle empty array", () => {
    expect(deduplicateRecords([])).toEqual([]);
  });

  it("should handle records with missing text field", () => {
    const records = [
      { text: "Hello", language: "hi" },
      { language: "ta" } as any,
    ];
    const result = deduplicateRecords(records);
    expect(result).toHaveLength(1);
    expect(result[0].text).toBe("Hello");
  });

  it("should keep the first occurrence of a duplicate", () => {
    const records = [
      { text: "Unique A", language: "hi" },
      { text: "Duplicate", language: "ta", extra: "first" },
      { text: "Duplicate", language: "te", extra: "second" },
    ];
    const result = deduplicateRecords(records);
    expect(result).toHaveLength(2);
    const dup = result.find((r) => r.text === "Duplicate");
    expect(dup?.extra).toBe("first");
  });
});
