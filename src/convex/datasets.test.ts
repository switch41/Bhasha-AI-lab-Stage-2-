import { describe, it, expect } from "vitest";

function analyzeTokenDistribution(content: { text: string }[]) {
  const tokenCounts = content.map(c => Math.ceil(c.text.length / 3));
  const sorted = [...tokenCounts].sort((a, b) => a - b);
  const sum = tokenCounts.reduce((a, b) => a + b, 0);
  const avg = sum / tokenCounts.length;
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];
  const min = Math.min(...tokenCounts);
  const max = Math.max(...tokenCounts);
  const variance = tokenCounts.reduce((acc, val) => acc + Math.pow(val - avg, 2), 0) / tokenCounts.length;
  const stdDev = Math.sqrt(variance);
  return {
    avg: Math.round(avg),
    median: Math.round(median),
    min, max,
    stdDev: Math.round(stdDev),
    p25: sorted[Math.floor(sorted.length * 0.25)],
    p75: sorted[Math.floor(sorted.length * 0.75)],
    p95: sorted[Math.floor(sorted.length * 0.95)],
    distribution: {
      short: tokenCounts.filter(t => t < 50).length,
      medium: tokenCounts.filter(t => t >= 50 && t < 200).length,
      long: tokenCounts.filter(t => t >= 200).length,
    },
  };
}

describe("analyzeTokenDistribution", () => {
  const makeContent = (text: string) => ({ text });

  it("should compute avg, median, min, max from single entry", () => {
    const result = analyzeTokenDistribution([makeContent("hello world")]);
    expect(result.avg).toBe(4);
    expect(result.median).toBe(4);
    expect(result.min).toBe(4);
    expect(result.max).toBe(4);
  });

  it("should sort and compute percentiles correctly", () => {
    const texts = Array.from({ length: 100 }, (_, i) => "x".repeat((i + 1) * 3));
    const result = analyzeTokenDistribution(texts.map(t => makeContent(t)));
    expect(result.avg).toBeGreaterThan(0);
    expect(result.p25).toBeLessThanOrEqual(result.median);
    expect(result.p75).toBeGreaterThanOrEqual(result.median);
    expect(result.p95).toBeGreaterThan(result.p75);
  });

  it("should classify short, medium, long distributions", () => {
    const content = [
      makeContent("a".repeat(30)),
      makeContent("a".repeat(300)),
      makeContent("a".repeat(900)),
    ];
    const result = analyzeTokenDistribution(content);
    expect(result.distribution.short).toBe(1);
    expect(result.distribution.medium).toBe(1);
    expect(result.distribution.long).toBe(1);
  });

  it("should return zero stdDev for identical texts", () => {
    const content = [makeContent("hello"), makeContent("hello")];
    const result = analyzeTokenDistribution(content);
    expect(result.stdDev).toBe(0);
  });

  it("should handle empty array without throwing", () => {
    expect(() => analyzeTokenDistribution([])).not.toThrow();
  });
});
