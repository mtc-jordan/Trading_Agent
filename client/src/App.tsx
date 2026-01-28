import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BrokerProvider } from "./contexts/BrokerContext";
import { AssetClassProvider } from "./contexts/AssetClassContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Analysis from "./pages/Analysis";
import EnhancedAnalysis from "./pages/EnhancedAnalysis";
import Bots from "./pages/Bots";
import Backtest from "./pages/Backtest";
import Portfolio from "./pages/Portfolio";
import Marketplace from "./pages/Marketplace";
import Admin from "./pages/Admin";
import Pricing from "./pages/Pricing";
import Settings from "./pages/Settings";
import AnalysisHistory from "./pages/AnalysisHistory";
import AccuracyDashboard from "./pages/AccuracyDashboard";
import Notifications from "./pages/Notifications";
import Community from "./pages/Community";
import Profile from "./pages/Profile";
import BotSchedules from "./pages/BotSchedules";
import BotDetail from "./pages/BotDetail";
import AdminJobs from "./pages/AdminJobs";
import AdminEmailSettings from "./pages/AdminEmailSettings";
import VerifyEmail from "./pages/VerifyEmail";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminUsers from "./pages/admin/AdminUsers";
import AdminSubscriptions from "./pages/admin/AdminSubscriptions";
import AdminAnalytics from "./pages/admin/AdminAnalytics";
import CryptoTrading from "./pages/CryptoTrading";
import PaperTrading from "./pages/PaperTrading";
import Alerts from "./pages/Alerts";
import CopyTrading from "./pages/CopyTrading";
import TradingJournal from "./pages/TradingJournal";

import BrokerConnections from "./pages/BrokerConnections";
import OrderHistory from "./pages/OrderHistory";
import BrokerAnalytics from "./pages/BrokerAnalytics";
import PortfolioRebalancing from "./pages/PortfolioRebalancing";
import TradeSimulator from "./pages/TradeSimulator";
import ScenarioSharing from "./pages/ScenarioSharing";
import TemplatePerformance from "./pages/TemplatePerformance";
import AgentExplainability from "./pages/AgentExplainability";
import StrategyBacktester from "./pages/StrategyBacktester";
import AgentWeightVisualization from "./pages/AgentWeightVisualization";
import BacktestComparison from "./pages/BacktestComparison";
import WeightOptimizationWizard from "./pages/WeightOptimizationWizard";
import AgentCommunicationHub from "./pages/AgentCommunicationHub";
import MarketRegimeAdaptation from "./pages/MarketRegimeAdaptation";
import MultiAssetCorrelation from "./pages/MultiAssetCorrelation";
import SocialSentiment from "./pages/SocialSentiment";
import PortfolioStressTesting from "./pages/PortfolioStressTesting";
import AgentLeaderboard from "./pages/AgentLeaderboard";
import StrategyGenerator from "./pages/StrategyGenerator";
import StrategyBacktest from "./pages/StrategyBacktest";
import StrategyAlerts from "./pages/StrategyAlerts";
import BrokerConnect from "./pages/BrokerConnect";
import UnifiedTrading from "./pages/UnifiedTrading";
import WatchlistAlerts from "./pages/WatchlistAlerts";
import MultiAssetTrading from "./pages/MultiAssetTrading";
import BrokerComparison from "./pages/BrokerComparison";
import MultiAssetAnalysis from "./pages/MultiAssetAnalysis";
import MultiAgentDashboard from "./pages/MultiAgentDashboard";
import OptionsGreeksDashboard from "./pages/OptionsGreeksDashboard";
import LiveOptionsChain from "./pages/LiveOptionsChain";
import StockIntelligenceDashboard from "./pages/StockIntelligenceDashboard";
import SECFilingsDashboard from "./pages/SECFilingsDashboard";
import PerformanceTrackerDashboard from "./pages/PerformanceTrackerDashboard";
import EarningsCallDashboard from "./pages/EarningsCallDashboard";
import LiveEarningsCallDashboard from "./pages/LiveEarningsCallDashboard";
import EarningsBacktesterDashboard from "./pages/EarningsBacktesterDashboard";
import CryptoAIDashboard from "./pages/CryptoAIDashboard";
import LiveFundingDashboard from "./pages/LiveFundingDashboard";
import InstitutionalRiskDashboard from "./pages/InstitutionalRiskDashboard";
import BasisBacktestDashboard from "./pages/BasisBacktestDashboard";
import SwarmIntelligenceDashboard from "./pages/SwarmIntelligenceDashboard";
import RealTimeTradingDashboard from "./pages/RealTimeTradingDashboard";
import AICommandCenter from "./pages/AICommandCenter";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/analysis" component={Analysis} />
      <Route path="/enhanced-analysis" component={EnhancedAnalysis} />
      <Route path="/multi-asset-analysis" component={MultiAssetAnalysis} />
      <Route path="/bots" component={Bots} />
      <Route path="/backtest" component={Backtest} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/admin" component={Admin} />
      <Route path="/settings" component={Settings} />
      <Route path="/analysis-history" component={AnalysisHistory} />
      <Route path="/accuracy" component={AccuracyDashboard} />
      <Route path="/notifications" component={Notifications} />
      <Route path="/watchlist-alerts" component={WatchlistAlerts} />
      <Route path="/community" component={Community} />
      <Route path="/profile" component={Profile} />
      <Route path="/schedules" component={BotSchedules} />
      <Route path="/bots/:id" component={BotDetail} />
      <Route path="/admin/jobs" component={AdminJobs} />
      <Route path="/admin/email" component={AdminEmailSettings} />
      <Route path="/admin/dashboard" component={AdminDashboard} />
      <Route path="/admin/users" component={AdminUsers} />
      <Route path="/admin/subscriptions" component={AdminSubscriptions} />
      <Route path="/admin/analytics" component={AdminAnalytics} />
      <Route path="/verify-email" component={VerifyEmail} />
      <Route path="/crypto" component={CryptoTrading} />
      <Route path="/paper-trading" component={PaperTrading} />
      <Route path="/alerts" component={Alerts} />
      <Route path="/copy-trading" component={CopyTrading} />
      <Route path="/journal" component={TradingJournal} />
      <Route path="/brokers" component={BrokerConnect} />
      <Route path="/broker-comparison" component={BrokerComparison} />
      <Route path="/order-history" component={OrderHistory} />
      <Route path="/broker-analytics" component={BrokerAnalytics} />
      <Route path="/rebalancing" component={PortfolioRebalancing} />
  <Route path="/trade-simulator" component={TradeSimulator} />
      <Route path="/scenario-sharing" component={ScenarioSharing} />
      <Route path="/template-performance" component={TemplatePerformance} />
      <Route path="/agent-explainability" component={AgentExplainability} />
      <Route path="/strategy-backtester" component={StrategyBacktester} />
      <Route path="/agent-weights" component={AgentWeightVisualization} />
      <Route path="/backtest-comparison" component={BacktestComparison} />
      <Route path="/weight-optimization" component={WeightOptimizationWizard} />
      <Route path="/agent-hub" component={AgentCommunicationHub} />
      <Route path="/regime-adaptation" component={MarketRegimeAdaptation} />
      <Route path="/correlation-engine" component={MultiAssetCorrelation} />
      <Route path="/multi-agent" component={MultiAgentDashboard} />
      <Route path="/options-greeks" component={OptionsGreeksDashboard} />
      <Route path="/live-options" component={LiveOptionsChain} />
      <Route path="/stock-intelligence" component={StockIntelligenceDashboard} />
      <Route path="/sec-filings" component={SECFilingsDashboard} />
      <Route path="/performance-tracker" component={PerformanceTrackerDashboard} />
      <Route path="/earnings-calls" component={EarningsCallDashboard} />
      <Route path="/live-earnings" component={LiveEarningsCallDashboard} />
      <Route path="/earnings-backtester" component={EarningsBacktesterDashboard} />
      <Route path="/crypto-ai" component={CryptoAIDashboard} />
      <Route path="/live-funding" component={LiveFundingDashboard} />
      <Route path="/institutional-risk" component={InstitutionalRiskDashboard} />
      <Route path="/basis-backtest" component={BasisBacktestDashboard} />
      <Route path="/swarm-intelligence" component={SwarmIntelligenceDashboard} />
      <Route path="/realtime-trading" component={RealTimeTradingDashboard} />
      <Route path="/command-center" component={AICommandCenter} />
      <Route path="/social-sentiment" component={SocialSentiment} />
      <Route path="/stress-testing" component={PortfolioStressTesting} />
      <Route path="/agent-leaderboard" component={AgentLeaderboard} />
      <Route path="/strategy-generator" component={StrategyGenerator} />
      <Route path="/strategy-backtest" component={StrategyBacktest} />
      <Route path="/strategy-alerts" component={StrategyAlerts} />
      <Route path="/broker-connect" component={BrokerConnect} />
      <Route path="/unified-trading" component={UnifiedTrading} />
      <Route path="/multi-asset-trading" component={MultiAssetTrading} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <BrokerProvider>
          <AssetClassProvider>
            <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
            </AssetClassProvider>
        </BrokerProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
