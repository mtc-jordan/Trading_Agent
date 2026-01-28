/**
 * Tests for Phase 28 Features:
 * - Background price tracking job
 * - Watchlist alerts API
 * - WebSocket reconnection
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import * as fs from "fs";
import * as path from "path";

describe("Phase 28: Background Price Tracking", () => {
  it("should have price tracking service file", () => {
    const filePath = path.join(__dirname, "services/priceTrackingService.ts");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("should export required functions from price tracking service", async () => {
    const service = await import("./services/priceTrackingService");
    
    expect(service.fetchStockPrice).toBeDefined();
    expect(service.fetchMultipleStockPrices).toBeDefined();
    expect(service.createPriceTrackingForNewAnalyses).toBeDefined();
    expect(service.updatePriceTrackingRecords).toBeDefined();
    expect(service.calculatePredictionAccuracy).toBeDefined();
    expect(service.runPriceTrackingJob).toBeDefined();
    expect(service.getAccuracyStats).toBeDefined();
  });

  it("should have job scheduler with price_tracking processor", async () => {
    const { jobProcessors } = await import("./services/jobScheduler");
    
    expect(jobProcessors).toBeDefined();
    expect(jobProcessors.price_tracking).toBeDefined();
    expect(typeof jobProcessors.price_tracking).toBe("function");
  });

  it("should have job scheduler with accuracy_calculation processor", async () => {
    const { jobProcessors } = await import("./services/jobScheduler");
    
    expect(jobProcessors.accuracy_calculation).toBeDefined();
    expect(typeof jobProcessors.accuracy_calculation).toBe("function");
  });
});

describe("Phase 28: Watchlist Alerts", () => {
  it("should have watchlist alerts page component", () => {
    const filePath = path.join(__dirname, "../client/src/pages/WatchlistAlerts.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("should have watchlist alerts database functions", async () => {
    const db = await import("./db");
    
    expect(db.getUserWatchlistAlerts).toBeDefined();
    expect(db.createWatchlistAlert).toBeDefined();
    expect(db.updateWatchlistAlert).toBeDefined();
    expect(db.deleteWatchlistAlert).toBeDefined();
    expect(db.getUserAlertHistory).toBeDefined();
  });

  it("should have watchlist alerts route in App.tsx", () => {
    const appPath = path.join(__dirname, "../client/src/App.tsx");
    const content = fs.readFileSync(appPath, "utf-8");
    
    expect(content).toContain("WatchlistAlerts");
    expect(content).toContain("/watchlist-alerts");
  });

  it("should have watchlist alerts in navigation", () => {
    const layoutPath = path.join(__dirname, "../client/src/components/DashboardLayout.tsx");
    const content = fs.readFileSync(layoutPath, "utf-8");
    
    expect(content).toContain("watchlist-alerts");
    expect(content).toContain("Watchlist Alerts");
  });
});

describe("Phase 28: WebSocket Reconnection", () => {
  it("should have useSocketReconnect hook", () => {
    const filePath = path.join(__dirname, "../client/src/hooks/useSocketReconnect.ts");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("should have ConnectionStatusEnhanced component", () => {
    const filePath = path.join(__dirname, "../client/src/components/ConnectionStatusEnhanced.tsx");
    expect(fs.existsSync(filePath)).toBe(true);
  });

  it("should export useSocketReconnect hook with correct interface", () => {
    const filePath = path.join(__dirname, "../client/src/hooks/useSocketReconnect.ts");
    const content = fs.readFileSync(filePath, "utf-8");
    
    // Check for key exports and features
    expect(content).toContain("export function useSocketReconnect");
    expect(content).toContain("exponential");
    expect(content).toContain("manualReconnect");
    expect(content).toContain("reconnectStatus");
  });

  it("should have reconnection banner component", () => {
    const filePath = path.join(__dirname, "../client/src/components/ConnectionStatusEnhanced.tsx");
    const content = fs.readFileSync(filePath, "utf-8");
    
    expect(content).toContain("ReconnectionBanner");
    expect(content).toContain("ConnectionStatusEnhanced");
  });
});
