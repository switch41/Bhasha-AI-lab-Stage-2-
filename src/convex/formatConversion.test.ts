import { describe, it, expect } from "vitest";

function buildMessages(item: { contentType: string; text: string; culturalContext?: string }, language: string) {
  const systemMsg = { role: "system" as const, content: `You are an AI assistant specialized in ${language} language and culture.` };
  let userContent: string;
  switch (item.contentType) {
    case "proverb":
      userContent = `Generate a ${language} proverb with its cultural context.`;
      break;
    case "narrative":
      userContent = `Write a ${language} narrative.`;
      break;
    case "text":
      userContent = `Write text in ${language}.`;
      break;
    default:
      userContent = `Generate ${language} content.`;
  }
  const assistantContent = item.culturalContext
    ? `${item.text}\n\nCultural context: ${item.culturalContext}`
    : item.text;
  return [systemMsg, { role: "user" as const, content: userContent }, { role: "assistant" as const, content: assistantContent }];
}

function toJSONL(items: { contentType: string; text: string; culturalContext?: string }[], language: string): string {
  return items.map(item => JSON.stringify({ messages: buildMessages(item, language) })).join("\n");
}

describe("toJSONL format conversion", () => {
  it("should produce valid JSONL string", () => {
    const jsonl = toJSONL([{ contentType: "text", text: "Hello world" }], "hindi");
    const lines = jsonl.split("\n");
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed).toHaveProperty("messages");
  });

  it("should produce one line per item", () => {
    const items = [
      { contentType: "text", text: "First" },
      { contentType: "text", text: "Second" },
      { contentType: "text", text: "Third" },
    ];
    const jsonl = toJSONL(items, "tamil");
    expect(jsonl.split("\n")).toHaveLength(3);
  });

  it("should not contain empty lines", () => {
    const jsonl = toJSONL([{ contentType: "text", text: "Test" }], "hindi");
    expect(jsonl).not.toContain("\n\n");
  });

  it("should include cultural context in assistant response when present", () => {
    const jsonl = toJSONL([{ contentType: "proverb", text: "Proverb", culturalContext: "Context" }], "hindi");
    const parsed = JSON.parse(jsonl);
    expect(parsed.messages[2].content).toContain("Cultural context: Context");
  });

  it("should only include role and content keys in each message", () => {
    const jsonl = toJSONL([{ contentType: "text", text: "Hello" }], "hindi");
    const parsed = JSON.parse(jsonl);
    for (const msg of parsed.messages) {
      expect(Object.keys(msg)).toEqual(["role", "content"]);
    }
  });
});

describe("buildMessages edge cases", () => {
  it("should handle very long text", () => {
    const longText = "x".repeat(5000);
    const messages = buildMessages({ contentType: "text", text: longText }, "hindi");
    expect(messages[1].content).toBe("Write text in hindi.");
    expect(messages[2].content).toBe(longText);
  });

  it("should handle empty culturalContext gracefully", () => {
    const messages = buildMessages({ contentType: "text", text: "Sample", culturalContext: "" }, "tamil");
    expect(messages[2].content).toBe("Sample");
  });

  it("should handle text with special characters", () => {
    const specialText = "Hello\nWorld\tTest\"Quote\"";
    const messages = buildMessages({ contentType: "text", text: specialText }, "hindi");
    expect(messages[2].content).toBe(specialText);
  });

  it("should handle all supported content types with consistent structure", () => {
    const types = ["text", "proverb", "narrative", "poem"] as const;
    for (const contentType of types) {
      const messages = buildMessages({ contentType, text: "Test content" }, "tamil");
      expect(messages).toHaveLength(3);
      expect(messages[0].role).toBe("system");
      expect(messages[1].role).toBe("user");
      expect(messages[2].role).toBe("assistant");
      expect(typeof messages[0].content).toBe("string");
      expect(typeof messages[1].content).toBe("string");
      expect(typeof messages[2].content).toBe("string");
    }
  });

  it("should never include input text in user message", () => {
    const items = [
      { contentType: "proverb", text: "secret-proverb-text" },
      { contentType: "narrative", text: "secret-narrative-text" },
      { contentType: "text", text: "secret-text-content" },
    ];
    for (const item of items) {
      const messages = buildMessages(item, "tamil");
      expect(messages[1].content).not.toContain("secret");
    }
  });
});
