import { v } from "convex/values";

// Helper to detect data format
export function detectFormat(data: string): "csv" | "json" | "jsonl" | "unknown" {
  const trimmed = data.trim();
  
  // Check for JSONL (newline-delimited JSON)
  if (trimmed.split("\n").every(line => {
    try {
      JSON.parse(line.trim());
      return true;
    } catch {
      return false;
    }
  })) {
    return "jsonl";
  }
  
  // Check for JSON array
  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) return "json";
  } catch {}
  
  // Check for CSV (simple heuristic: comma-separated with header)
  if (trimmed.includes(",") && trimmed.split("\n").length > 1) {
    return "csv";
  }
  
  return "unknown";
}

// Parse CSV data
export function parseCSV(data: string): Array<Record<string, string>> {
  const lines = data.trim().split("\n");
  if (lines.length < 2) return [];
  
  const headers = lines[0].split(",").map(h => h.trim().replace(/^"|"$/g, ""));
  const records: Array<Record<string, string>> = [];
  
  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map(v => v.trim().replace(/^"|"$/g, ""));
    const record: Record<string, string> = {};
    
    headers.forEach((header, index) => {
      record[header] = values[index] || "";
    });
    
    records.push(record);
  }
  
  return records;
}

// Parse JSON/JSONL data
export function parseJSON(data: string, format: "json" | "jsonl"): Array<Record<string, any>> {
  if (format === "json") {
    return JSON.parse(data);
  } else {
    return data.trim().split("\n").map(line => JSON.parse(line.trim()));
  }
}

// Apply field mappings to a record
export function applyFieldMapping(
  record: Record<string, any>,
  mappings: Record<string, string>
): Record<string, any> {
  const mapped: Record<string, any> = {};
  
  for (const [targetField, sourceField] of Object.entries(mappings)) {
    if (sourceField && record[sourceField] !== undefined) {
      mapped[targetField] = record[sourceField];
    }
  }
  
  return mapped;
}

// Normalize text content
export function normalizeText(text: string): string {
  return text
    .trim()
    .replace(/\s+/g, " ")
    .replace(/[\r\n]+/g, " ");
}

// Validate a single record
export function validateRecord(
  record: Record<string, any>,
  requiredFields: string[]
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  
  for (const field of requiredFields) {
    if (!record[field] || String(record[field]).trim().length === 0) {
      errors.push(`Missing required field: ${field}`);
    }
  }
  
  // Validate text length
  if (record.text) {
    const textLength = String(record.text).length;
    if (textLength < 10) {
      errors.push("Text must be at least 10 characters");
    }
    if (textLength > 10000) {
      errors.push("Text cannot exceed 10,000 characters");
    }
  }
  
  return {
    valid: errors.length === 0,
    errors,
  };
}

// Deduplicate records by text similarity
export function deduplicateRecords(records: Array<Record<string, any>>): Array<Record<string, any>> {
  const unique: Array<Record<string, any>> = [];
  const seenTexts = new Set<string>();
  
  for (const record of records) {
    const normalizedText = normalizeText(String(record.text || "")).toLowerCase();
    if (normalizedText && !seenTexts.has(normalizedText)) {
      seenTexts.add(normalizedText);
      unique.push(record);
    }
  }
  
  return unique;
}
