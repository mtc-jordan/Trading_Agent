import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { BrokerProvider } from "./contexts/BrokerContext";
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
import ExchangeConnections from "./pages/ExchangeConnections";
import BrokerConnections from "./pages/BrokerConnections";
import OrderHistory from "./pages/OrderHistory";
import BrokerAnalytics from "./pages/BrokerAnalytics";
import PortfolioRebalancing from "./pages/PortfolioRebalancing";
import TradeSimulator from "./pages/TradeSimulator";
import ScenarioSharing from "./pages/ScenarioSharing";
import TemplatePerformance from "./pages/TemplatePerformance";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/analysis" component={Analysis} />
      <Route path="/enhanced-analysis" component={EnhancedAnalysis} />
      <Route path="/bots" component={Bots} />
      <Route path="/backtest" component={Backtest} />
      <Route path="/portfolio" component={Portfolio} />
      <Route path="/marketplace" component={Marketplace} />
      <Route path="/admin" component={Admin} />
      <Route path="/settings" component={Settings} />
      <Route path="/analysis-history" component={AnalysisHistory} />
      <Route path="/accuracy" component={AccuracyDashboard} />
      <Route path="/notifications" component={Notifications} />
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
      <Route path="/exchanges" component={ExchangeConnections} />
      <Route path="/brokers" component={BrokerConnections} />
      <Route path="/order-history" component={OrderHistory} />
      <Route path="/broker-analytics" component={BrokerAnalytics} />
      <Route path="/rebalancing" component={PortfolioRebalancing} />
  <Route path="/trade-simulator" component={TradeSimulator} />
      <Route path="/scenario-sharing" component={ScenarioSharing} />
      <Route path="/template-performance" component={TemplatePerformance} />     <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <BrokerProvider>
          <TooltipProvider>
            <Toaster />
            <Router />
          </TooltipProvider>
        </BrokerProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
