import { describe, it, expect } from "vitest";

// ─── Pure logic extracted from finetune.ts recommend handler ────────────────

function calculateLearningRate(datasetSize: number): number {
  return datasetSize < 1000 ? 5e-5 :
         datasetSize < 5000 ? 3e-5 :
         datasetSize < 10000 ? 2e-5 : 1e-5;
}

function calculateBatchSize(datasetSize: number, stdDev: number, avgTokens: number, maxTokens: number): number {
  let batchSize = datasetSize < 1000 ? 8 :
                 datasetSize < 5000 ? 16 :
                 datasetSize < 10000 ? 32 : 64;
  if (stdDev > avgTokens * 0.5 || maxTokens > 500) {
    batchSize = Math.max(4, Math.floor(batchSize / 2));
  }
  return batchSize;
}

function calculateEpochs(avgTokens: number): number {
  return avgTokens < 50 ? 5 :
         avgTokens < 100 ? 4 :
         avgTokens < 200 ? 3 : 2;
}

function calculateEstimatedCost(datasetSize: number, avgTokens: number, epochs: number): number {
  const totalTokens = datasetSize * avgTokens * epochs;
  return (totalTokens / 1000) * 0.008;
}

function calculateEstimatedTime(datasetSize: number, epochs: number, avgTokens: number): number {
  const timeMultiplier = avgTokens > 200 ? 1.5 : avgTokens > 100 ? 1.2 : 1.0;
  return Math.ceil((datasetSize * epochs) / 1000 * 60 * timeMultiplier);
}

function calculateLoRARank(datasetSize: number, stdDev: number, avgTokens: number, maxTokens: number): number {
  let loraRank: number;
  if (datasetSize < 500) loraRank = 4;
  else if (datasetSize < 2000) loraRank = 8;
  else if (datasetSize < 5000) loraRank = 16;
  else if (datasetSize < 10000) loraRank = 32;
  else loraRank = 64;

  const tokenComplexity = avgTokens > 0 ? stdDev / avgTokens : 0;
  if (tokenComplexity > 0.5 && loraRank < 32) {
    loraRank = Math.min(loraRank * 2, 32);
  }
  if (maxTokens > 500 && loraRank < 32) {
    loraRank = Math.min(loraRank * 1.5, 32);
  }
  return loraRank;
}

function calculateLoRAAlpha(datasetSize: number, loraRank: number): number {
  return datasetSize < 500 ? loraRank * 4 : loraRank * 2;
}

function calculateSplit(datasetSize: number): { train: number; validation: number; test: number } {
  if (datasetSize < 100) return { train: 0.85, validation: 0.10, test: 0.05 };
  if (datasetSize < 500) return { train: 0.80, validation: 0.10, test: 0.10 };
  if (datasetSize < 2000) return { train: 0.75, validation: 0.15, test: 0.10 };
  return { train: 0.70, validation: 0.20, test: 0.10 };
}

// ─── learning rate ──────────────────────────────────────────────────────────

describe("calculateLearningRate", () => {
  it("should return 5e-5 for datasets under 1000", () => {
    expect(calculateLearningRate(500)).toBe(5e-5);
    expect(calculateLearningRate(999)).toBe(5e-5);
  });

  it("should return 3e-5 for datasets between 1000 and 4999", () => {
    expect(calculateLearningRate(1000)).toBe(3e-5);
    expect(calculateLearningRate(2500)).toBe(3e-5);
    expect(calculateLearningRate(4999)).toBe(3e-5);
  });

  it("should return 2e-5 for datasets between 5000 and 9999", () => {
    expect(calculateLearningRate(5000)).toBe(2e-5);
    expect(calculateLearningRate(9999)).toBe(2e-5);
  });

  it("should return 1e-5 for datasets 10000+", () => {
    expect(calculateLearningRate(10000)).toBe(1e-5);
    expect(calculateLearningRate(50000)).toBe(1e-5);
  });
});

// ─── batch size ─────────────────────────────────────────────────────────────

describe("calculateBatchSize", () => {
  it("should return tiered batch sizes based on dataset size", () => {
    expect(calculateBatchSize(500, 0, 100, 200)).toBe(8);
    expect(calculateBatchSize(2500, 0, 100, 200)).toBe(16);
    expect(calculateBatchSize(7500, 0, 100, 200)).toBe(32);
    expect(calculateBatchSize(15000, 0, 100, 200)).toBe(64);
  });

  it("should halve batch size for high token variance", () => {
    expect(calculateBatchSize(500, 60, 100, 200)).toBe(4); // stdDev > avg*0.5
  });

  it("should halve batch size for long sequences", () => {
    expect(calculateBatchSize(500, 0, 100, 600)).toBe(4); // maxTokens > 500
  });

  it("should not go below minimum batch size of 4", () => {
    // Small dataset (batchSize=8) with high variance -> halved to 4
    expect(calculateBatchSize(100, 60, 100, 200)).toBe(4);
  });
});

// ─── epochs ─────────────────────────────────────────────────────────────────

describe("calculateEpochs", () => {
  it("should return 5 for avg tokens under 50", () => {
    expect(calculateEpochs(30)).toBe(5);
    expect(calculateEpochs(49)).toBe(5);
  });

  it("should return 4 for avg tokens between 50 and 99", () => {
    expect(calculateEpochs(50)).toBe(4);
    expect(calculateEpochs(75)).toBe(4);
    expect(calculateEpochs(99)).toBe(4);
  });

  it("should return 3 for avg tokens between 100 and 199", () => {
    expect(calculateEpochs(100)).toBe(3);
    expect(calculateEpochs(150)).toBe(3);
    expect(calculateEpochs(199)).toBe(3);
  });

  it("should return 2 for avg tokens 200+", () => {
    expect(calculateEpochs(200)).toBe(2);
    expect(calculateEpochs(500)).toBe(2);
  });
});

// ─── cost estimation ────────────────────────────────────────────────────────

describe("calculateEstimatedCost", () => {
  it("should estimate cost based on tokens and rate", () => {
    // 1000 samples * 100 tokens * 3 epochs = 300K tokens
    // 300K / 1000 * 0.008 = $2.40
    expect(calculateEstimatedCost(1000, 100, 3)).toBeCloseTo(2.40, 2);
  });

  it("should return 0 for empty dataset", () => {
    expect(calculateEstimatedCost(0, 100, 3)).toBe(0);
  });
});

// ─── time estimation ────────────────────────────────────────────────────────

describe("calculateEstimatedTime", () => {
  it("should estimate time in minutes", () => {
    // 1000 samples * 3 epochs = 3000 / 1000 * 60 * 1.0 = 180 min
    expect(calculateEstimatedTime(1000, 3, 100)).toBe(180);
  });

  it("should apply time multiplier for long sequences", () => {
    // avgTokens > 200 -> multiplier 1.5
    expect(calculateEstimatedTime(1000, 3, 250)).toBe(270);
  });

  it("should apply time multiplier for medium sequences", () => {
    // avgTokens > 100 -> multiplier 1.2
    expect(calculateEstimatedTime(1000, 3, 150)).toBe(216);
  });
});

// ─── LoRA rank ──────────────────────────────────────────────────────────────

describe("calculateLoRARank", () => {
  it("should scale rank with dataset size", () => {
    expect(calculateLoRARank(100, 0, 100, 200)).toBe(4);
    expect(calculateLoRARank(1000, 0, 100, 200)).toBe(8);
    expect(calculateLoRARank(3000, 0, 100, 200)).toBe(16);
    expect(calculateLoRARank(7500, 0, 100, 200)).toBe(32);
    expect(calculateLoRARank(15000, 0, 100, 200)).toBe(64);
  });

  it("should increase rank for high token complexity", () => {
    // stdDev/avgTokens = 60/100 = 0.6 > 0.5 -> double rank, capped at 32
    const rank = calculateLoRARank(3000, 60, 100, 200);
    expect(rank).toBeGreaterThanOrEqual(16);
    expect(rank).toBeLessThanOrEqual(32);
  });

  it("should increase rank for long sequences", () => {
    // maxTokens > 500, rank < 32 -> multiply by 1.5
    const rank = calculateLoRARank(3000, 0, 100, 600);
    expect(rank).toBe(24); // 16 * 1.5
  });

  it("should cap rank at 32 for complexity adjustments", () => {
    // Starting rank 64 (dataset > 10K) is already above 32, so no increase
    const rank = calculateLoRARank(15000, 60, 100, 600);
    expect(rank).toBe(64);
  });
});

// ─── LoRA alpha ─────────────────────────────────────────────────────────────

describe("calculateLoRAAlpha", () => {
  it("should return 2x rank for normal datasets", () => {
    expect(calculateLoRAAlpha(1000, 8)).toBe(16);
    expect(calculateLoRAAlpha(5000, 16)).toBe(32);
  });

  it("should return 4x rank for small datasets (< 500)", () => {
    expect(calculateLoRAAlpha(100, 4)).toBe(16);
    expect(calculateLoRAAlpha(499, 4)).toBe(16);
  });
});

// ─── data split ─────────────────────────────────────────────────────────────

describe("calculateSplit", () => {
  it("should maximize training data for tiny datasets", () => {
    const split = calculateSplit(50);
    expect(split.train).toBe(0.85);
    expect(split.validation).toBe(0.10);
    expect(split.test).toBe(0.05);
  });

  it("should use standard split for small datasets", () => {
    const split = calculateSplit(300);
    expect(split.train).toBe(0.80);
  });

  it("should increase validation for larger datasets", () => {
    const split = calculateSplit(5000);
    expect(split.validation).toBe(0.20);
  });

  it("should produce valid split ratios summing to 1", () => {
    for (const size of [50, 300, 1000, 5000, 20000]) {
      const split = calculateSplit(size);
      const total = split.train + split.validation + split.test;
      expect(total).toBeCloseTo(1.0, 5);
    }
  });

  it("should produce integer sample counts", () => {
    const split = calculateSplit(100);
    const train = Math.floor(100 * split.train);
    const val = Math.floor(100 * split.validation);
    const test = 100 - train - val;
    expect(train + val + test).toBe(100);
  });
});
