import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import Dashboard from "./pages/Dashboard";
import Analysis from "./pages/Analysis";
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

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route path="/pricing" component={Pricing} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/analysis" component={Analysis} />
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
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="dark">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
