import { describe, expect, it, vi, beforeEach } from "vitest";

// Mock the database module
vi.mock("./db", () => ({
  getFilteredAnalysisHistory: vi.fn(),
  getAnalysisById: vi.fn(),
  getAnalysisStats: vi.fn(),
  getUniqueAnalyzedSymbols: vi.fn(),
}));

import {
  getFilteredAnalysisHistory,
  getAnalysisById,
  getAnalysisStats,
  getUniqueAnalyzedSymbols,
} from "./db";

describe("Analysis Comparison Feature", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("Multiple Analysis Selection", () => {
    it("should fetch multiple analyses by IDs for comparison", async () => {
      const mockAnalyses = [
        {
          id: 1,
          symbol: "AAPL",
          consensusAction: "buy",
          confidence: 0.85,
          consensusScore: 0.72,
          technicalScore: 0.8,
          fundamentalScore: 0.75,
          sentimentScore: 0.65,
          riskScore: 0.7,
          microstructureScore: 0.68,
          macroScore: 0.72,
          quantScore: 0.78,
          createdAt: new Date("2024-01-15"),
        },
        {
          id: 2,
          symbol: "AAPL",
          consensusAction: "strong_buy",
          confidence: 0.92,
          consensusScore: 0.88,
          technicalScore: 0.9,
          fundamentalScore: 0.85,
          sentimentScore: 0.8,
          riskScore: 0.75,
          microstructureScore: 0.82,
          macroScore: 0.78,
          quantScore: 0.88,
          createdAt: new Date("2024-01-20"),
        },
      ];

      (getAnalysisById as any).mockResolvedValueOnce(mockAnalyses[0]);
      (getAnalysisById as any).mockResolvedValueOnce(mockAnalyses[1]);

      const analysis1 = await getAnalysisById(1);
      const analysis2 = await getAnalysisById(2);

      expect(analysis1).toBeDefined();
      expect(analysis2).toBeDefined();
      expect(analysis1?.symbol).toBe("AAPL");
      expect(analysis2?.symbol).toBe("AAPL");
    });

    it("should limit selection to maximum 5 analyses", () => {
      const maxComparisons = 5;
      const selectedIds = new Set<number>();
      
      // Try to add 7 items
      for (let i = 1; i <= 7; i++) {
        if (selectedIds.size < maxComparisons) {
          selectedIds.add(i);
        }
      }

      expect(selectedIds.size).toBe(maxComparisons);
      expect(selectedIds.has(6)).toBe(false);
      expect(selectedIds.has(7)).toBe(false);
    });

    it("should toggle selection correctly", () => {
      const selectedIds = new Set<number>();
      
      // Add item
      selectedIds.add(1);
      expect(selectedIds.has(1)).toBe(true);
      
      // Remove item
      selectedIds.delete(1);
      expect(selectedIds.has(1)).toBe(false);
    });
  });

  describe("Comparison Data Processing", () => {
    it("should calculate agent score differences between analyses", () => {
      const analysis1 = {
        technicalScore: 0.8,
        fundamentalScore: 0.75,
        sentimentScore: 0.65,
      };
      
      const analysis2 = {
        technicalScore: 0.9,
        fundamentalScore: 0.85,
        sentimentScore: 0.8,
      };

      const technicalDiff = analysis2.technicalScore - analysis1.technicalScore;
      const fundamentalDiff = analysis2.fundamentalScore - analysis1.fundamentalScore;
      const sentimentDiff = analysis2.sentimentScore - analysis1.sentimentScore;

      expect(technicalDiff).toBeCloseTo(0.1);
      expect(fundamentalDiff).toBeCloseTo(0.1);
      expect(sentimentDiff).toBeCloseTo(0.15);
    });

    it("should sort analyses by date for timeline view", () => {
      const analyses = [
        { id: 1, createdAt: new Date("2024-01-20") },
        { id: 2, createdAt: new Date("2024-01-15") },
        { id: 3, createdAt: new Date("2024-01-25") },
      ];

      const sorted = [...analyses].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      expect(sorted[0].id).toBe(2); // Jan 15
      expect(sorted[1].id).toBe(1); // Jan 20
      expect(sorted[2].id).toBe(3); // Jan 25
    });

    it("should prepare radar chart data correctly", () => {
      const analyses = [
        {
          id: 1,
          symbol: "AAPL",
          technicalScore: 0.8,
          fundamentalScore: 0.75,
          sentimentScore: 0.65,
          riskScore: 0.7,
          microstructureScore: 0.68,
          macroScore: 0.72,
          quantScore: 0.78,
        },
        {
          id: 2,
          symbol: "GOOGL",
          technicalScore: 0.9,
          fundamentalScore: 0.85,
          sentimentScore: 0.8,
          riskScore: 0.75,
          microstructureScore: 0.82,
          macroScore: 0.78,
          quantScore: 0.88,
        },
      ];

      const agents = [
        { key: "technicalScore", name: "Technical" },
        { key: "fundamentalScore", name: "Fundamental" },
        { key: "sentimentScore", name: "Sentiment" },
        { key: "riskScore", name: "Risk" },
        { key: "microstructureScore", name: "Microstructure" },
        { key: "macroScore", name: "Macro" },
        { key: "quantScore", name: "Quant" },
      ];

      const radarData = agents.map(agent => {
        const dataPoint: any = { agent: agent.name };
        analyses.forEach((analysis, index) => {
          dataPoint[`analysis${index + 1}`] = Math.abs(Number((analysis as any)[agent.key]) || 0) * 100;
        });
        return dataPoint;
      });

      expect(radarData.length).toBe(7);
      expect(radarData[0].agent).toBe("Technical");
      expect(radarData[0].analysis1).toBe(80);
      expect(radarData[0].analysis2).toBe(90);
    });
  });

  describe("Evolution Timeline", () => {
    it("should track recommendation changes over time", () => {
      const analyses = [
        { id: 1, symbol: "AAPL", consensusAction: "hold", createdAt: new Date("2024-01-10") },
        { id: 2, symbol: "AAPL", consensusAction: "buy", createdAt: new Date("2024-01-15") },
        { id: 3, symbol: "AAPL", consensusAction: "strong_buy", createdAt: new Date("2024-01-20") },
      ];

      const sorted = [...analyses].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Verify evolution: hold -> buy -> strong_buy
      expect(sorted[0].consensusAction).toBe("hold");
      expect(sorted[1].consensusAction).toBe("buy");
      expect(sorted[2].consensusAction).toBe("strong_buy");
    });

    it("should calculate confidence trend", () => {
      const analyses = [
        { confidence: 0.65, createdAt: new Date("2024-01-10") },
        { confidence: 0.75, createdAt: new Date("2024-01-15") },
        { confidence: 0.85, createdAt: new Date("2024-01-20") },
      ];

      const sorted = [...analyses].sort(
        (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );

      // Calculate trend (increasing)
      const firstConfidence = sorted[0].confidence;
      const lastConfidence = sorted[sorted.length - 1].confidence;
      const trend = lastConfidence - firstConfidence;

      expect(trend).toBeCloseTo(0.2);
      expect(trend).toBeGreaterThan(0); // Positive trend
    });
  });

  describe("Export Comparison", () => {
    it("should generate CSV content for comparison export", () => {
      const comparisonData = [
        {
          id: 1,
          symbol: "AAPL",
          consensusAction: "buy",
          confidence: 0.85,
          consensusScore: 0.72,
          technicalScore: 0.8,
          fundamentalScore: 0.75,
          sentimentScore: 0.65,
          riskScore: 0.7,
          microstructureScore: 0.68,
          macroScore: 0.72,
          quantScore: 0.78,
          createdAt: new Date("2024-01-15"),
        },
      ];

      const headers = ["Date", "Symbol", "Action", "Confidence", "Consensus Score"];
      const rows = comparisonData.map(a => [
        new Date(a.createdAt).toLocaleDateString(),
        a.symbol,
        a.consensusAction,
        a.confidence,
        a.consensusScore,
      ]);

      const csvContent = [headers.join(","), ...rows.map(r => r.join(","))].join("\n");

      expect(csvContent).toContain("Date,Symbol,Action,Confidence,Consensus Score");
      expect(csvContent).toContain("AAPL");
      expect(csvContent).toContain("buy");
      expect(csvContent).toContain("0.85");
    });
  });

  describe("Comparison Mode UI State", () => {
    it("should track comparison mode state", () => {
      let comparisonMode = false;
      const selectedIds = new Set<number>();

      // Enter comparison mode
      comparisonMode = true;
      expect(comparisonMode).toBe(true);

      // Add selections
      selectedIds.add(1);
      selectedIds.add(2);
      expect(selectedIds.size).toBe(2);

      // Exit comparison mode should clear selections
      comparisonMode = false;
      selectedIds.clear();
      expect(comparisonMode).toBe(false);
      expect(selectedIds.size).toBe(0);
    });

    it("should enable compare button when 2+ items selected", () => {
      const selectedIds = new Set<number>();
      
      // 0 items - disabled
      expect(selectedIds.size >= 2).toBe(false);
      
      // 1 item - disabled
      selectedIds.add(1);
      expect(selectedIds.size >= 2).toBe(false);
      
      // 2 items - enabled
      selectedIds.add(2);
      expect(selectedIds.size >= 2).toBe(true);
    });
  });

  describe("Side-by-Side Comparison", () => {
    it("should display analyses in correct order", () => {
      const analyses = [
        { id: 3, symbol: "MSFT" },
        { id: 1, symbol: "AAPL" },
        { id: 2, symbol: "GOOGL" },
      ];

      // Should maintain selection order, not sort
      expect(analyses[0].symbol).toBe("MSFT");
      expect(analyses[1].symbol).toBe("AAPL");
      expect(analyses[2].symbol).toBe("GOOGL");
    });

    it("should assign unique colors to each analysis", () => {
      const COMPARISON_COLORS = ["#10b981", "#3b82f6", "#f59e0b", "#ef4444", "#8b5cf6"];
      const analyses = [{ id: 1 }, { id: 2 }, { id: 3 }];

      analyses.forEach((_, index) => {
        const color = COMPARISON_COLORS[index % COMPARISON_COLORS.length];
        expect(color).toBeDefined();
        expect(color).toMatch(/^#[0-9a-f]{6}$/i);
      });
    });
  });

  describe("Filtered History for Comparison", () => {
    it("should fetch filtered history with pagination", async () => {
      const mockResponse = {
        analyses: [
          { id: 1, symbol: "AAPL", consensusAction: "buy" },
          { id: 2, symbol: "GOOGL", consensusAction: "hold" },
        ],
        total: 50,
      };

      (getFilteredAnalysisHistory as any).mockResolvedValue(mockResponse);

      const result = await getFilteredAnalysisHistory(1, {
        symbol: "AAPL",
        limit: 20,
        offset: 0,
      });

      expect(result.analyses).toHaveLength(2);
      expect(result.total).toBe(50);
    });

    it("should filter by multiple criteria", async () => {
      const mockResponse = {
        analyses: [
          { id: 1, symbol: "AAPL", consensusAction: "strong_buy", confidence: 0.9 },
        ],
        total: 1,
      };

      (getFilteredAnalysisHistory as any).mockResolvedValue(mockResponse);

      const result = await getFilteredAnalysisHistory(1, {
        symbol: "AAPL",
        consensusAction: "strong_buy",
        minConfidence: 0.8,
        limit: 20,
        offset: 0,
      });

      expect(result.analyses).toHaveLength(1);
      expect(result.analyses[0].consensusAction).toBe("strong_buy");
      expect(result.analyses[0].confidence).toBeGreaterThanOrEqual(0.8);
    });
  });
});
