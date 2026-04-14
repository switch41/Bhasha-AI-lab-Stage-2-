import { describe, it, expect } from "vitest";

// ─── BuildMessages logic extracted from openai.ts submitJob ─────────────────

function buildMessages(item: { contentType: string; text: string; culturalContext?: string }, language: string) {
  const systemMsg = {
    role: "system" as const,
    content: `You are an AI assistant specialized in ${language} language and culture.`,
  };
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

// ─── Messages structure ─────────────────────────────────────────────────────

describe("buildMessages", () => {
  it("should produce a system/user/assistant message triplet", () => {
    const messages = buildMessages({ contentType: "text", text: "Hello" }, "hindi");
    expect(messages).toHaveLength(3);
    expect(messages[0].role).toBe("system");
    expect(messages[1].role).toBe("user");
    expect(messages[2].role).toBe("assistant");
  });

  it("should include language in system message", () => {
    const messages = buildMessages({ contentType: "text", text: "Hello" }, "tamil");
    expect(messages[0].content).toContain("tamil");
  });
});

// ─── Content-type-specific user prompts ─────────────────────────────────────

describe("buildMessages — user prompt per contentType", () => {
  it("should use generate-style prompt for proverbs", () => {
    const messages = buildMessages(
      { contentType: "proverb", text: "Astitva ka arth" },
      "hindi",
    );
    expect(messages[1].content).toBe("Generate a hindi proverb with its cultural context.");
    expect(messages[2].content).toBe("Astitva ka arth");
  });

  it("should use write-style prompt for narratives", () => {
    const messages = buildMessages(
      { contentType: "narrative", text: "Ek baar ki baat hai" },
      "bengali",
    );
    expect(messages[1].content).toBe("Write a bengali narrative.");
    // The narrative text is NOT in the user prompt — it's in the assistant response
    expect(messages[2].content).toBe("Ek baar ki baat hai");
  });

  it("should use write-style prompt for text type", () => {
    const messages = buildMessages(
      { contentType: "text", text: "Kerala is known for" },
      "malayalam",
    );
    expect(messages[1].content).toBe("Write text in malayalam.");
  });

  it("should use generic prompt for unknown contentType", () => {
    const messages = buildMessages(
      { contentType: "poem", text: "Some poem" },
      "telugu",
    );
    expect(messages[1].content).toBe("Generate telugu content.");
    expect(messages[2].content).toBe("Some poem");
  });
});

// ─── Assistant response ─────────────────────────────────────────────────────

describe("buildMessages — assistant response", () => {
  it("should include text alone when no culturalContext", () => {
    const messages = buildMessages(
      { contentType: "proverb", text: "Proverb text" },
      "hindi",
    );
    expect(messages[2].content).toBe("Proverb text");
  });

  it("should append cultural context when present", () => {
    const messages = buildMessages(
      { contentType: "proverb", text: "Proverb text", culturalContext: "Ancient wisdom" },
      "hindi",
    );
    expect(messages[2].content).toContain("Proverb text");
    expect(messages[2].content).toContain("Cultural context: Ancient wisdom");
  });

  it("should handle empty culturalContext string", () => {
    const messages = buildMessages(
      { contentType: "text", text: "Sample", culturalContext: "" },
      "tamil",
    );
    expect(messages[2].content).toBe("Sample");
  });
});

// ─── Training data shape ────────────────────────────────────────────────────

describe("training data shape", () => {
  it("should produce valid OpenAI messages format", () => {
    const items = [
      { contentType: "proverb", text: "Proverb 1", culturalContext: "Context 1" },
      { contentType: "text", text: "Text 1" },
    ];

    const trainingData = items.map((item) => ({
      messages: buildMessages(item, "hindi"),
    }));

    expect(trainingData).toHaveLength(2);

    for (const entry of trainingData) {
      expect(entry).toHaveProperty("messages");
      expect(entry.messages).toHaveLength(3);
      for (const msg of entry.messages) {
        expect(msg).toHaveProperty("role");
        expect(msg).toHaveProperty("content");
        expect(["system", "user", "assistant"]).toContain(msg.role);
      }
    }
  });

  it("should not include undefined fields in messages", () => {
    const entry = {
      messages: buildMessages({ contentType: "text", text: "Hello" }, "hindi"),
    };
    for (const msg of entry.messages) {
      const keys = Object.keys(msg);
      expect(keys).toEqual(["role", "content"]);
    }
  });
});
