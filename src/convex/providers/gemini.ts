"use node";

import { internalAction } from "../_generated/server";
import { v } from "convex/values";

// Analyze content quality using Gemini API
export const analyzeQuality = internalAction({
  args: {
    text: v.string(),
    language: v.string(),
    contentType: v.string(),
    culturalContext: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("GEMINI_API_KEY not configured, skipping quality analysis");
      return { qualityScore: 0.5, analysis: null };
    }

    try {
      const prompt = `Analyze the following ${args.language} ${args.contentType} for quality and cultural authenticity.

Text: "${args.text}"
${args.culturalContext ? `Cultural Context: ${args.culturalContext}` : ""}

Evaluate on these criteria:
1. Linguistic accuracy and grammar (0-1)
2. Cultural authenticity and appropriateness (0-1)
3. Richness of content and detail (0-1)
4. Preservation value for AI training (0-1)

Respond in JSON format:
{
  "linguisticAccuracy": <score>,
  "culturalAuthenticity": <score>,
  "contentRichness": <score>,
  "preservationValue": <score>,
  "overallScore": <average>,
  "reasoning": "<brief explanation>",
  "suggestions": "<improvement suggestions>"
}`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: {
              temperature: 0.2,
              maxOutputTokens: 500,
            },
          }),
        }
      );

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      const textContent = data.candidates?.[0]?.content?.parts?.[0]?.text;
      
      if (!textContent) {
        throw new Error("No response from Gemini API");
      }

      // Extract JSON from response (handle markdown code blocks)
      const jsonMatch = textContent.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Could not parse Gemini response");
      }

      const analysis = JSON.parse(jsonMatch[0]);
      
      return {
        qualityScore: Math.round(analysis.overallScore * 100) / 100,
        analysis: {
          linguisticAccuracy: analysis.linguisticAccuracy,
          culturalAuthenticity: analysis.culturalAuthenticity,
          contentRichness: analysis.contentRichness,
          preservationValue: analysis.preservationValue,
          reasoning: analysis.reasoning,
          suggestions: analysis.suggestions,
        },
      };
    } catch (error) {
      console.error("Gemini API error:", error);
      return { qualityScore: 0.5, analysis: null };
    }
  },
});
