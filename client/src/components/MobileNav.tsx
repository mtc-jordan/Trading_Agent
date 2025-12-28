import { useLocation } from "wouter";
import { 
  LayoutDashboard, 
  Brain, 
  Bot, 
  Briefcase, 
  Menu,
  Bell,
  User
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState } from "react";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";

const mainNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Brain, label: "Analysis", path: "/analysis" },
  { icon: Bot, label: "Bots", path: "/bots" },
  { icon: Briefcase, label: "Portfolio", path: "/portfolio" },
];

const moreNavItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
  { icon: Brain, label: "AI Analysis", path: "/analysis" },
  { icon: Bot, label: "Trading Bots", path: "/bots" },
  { icon: Briefcase, label: "Portfolio", path: "/portfolio" },
  { label: "Marketplace", path: "/marketplace" },
  { label: "Backtest", path: "/backtest" },
  { label: "Schedules", path: "/schedules" },
  { label: "Community", path: "/community" },
  { label: "Accuracy", path: "/accuracy" },
  { label: "Analysis History", path: "/analysis-history" },
  { label: "Settings", path: "/settings" },
];

export function MobileBottomNav() {
  const [location, setLocation] = useLocation();
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur border-t border-border pb-safe sm:hidden">
      <div className="flex items-center justify-around h-16">
        {mainNavItems.map((item) => {
          const isActive = location === item.path;
          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] touch-target",
                "transition-colors",
                isActive ? "text-primary" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("w-5 h-5", isActive && "text-primary")} />
              <span className="text-xs font-medium">{item.label}</span>
            </button>
          );
        })}
        
        {/* Notifications */}
        <button
          onClick={() => setLocation("/notifications")}
          className={cn(
            "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] touch-target",
            "transition-colors",
            location === "/notifications" ? "text-primary" : "text-muted-foreground"
          )}
        >
          <Bell className={cn("w-5 h-5", location === "/notifications" && "text-primary")} />
          <span className="text-xs font-medium">Alerts</span>
        </button>

        {/* More menu */}
        <Sheet open={moreOpen} onOpenChange={setMoreOpen}>
          <SheetTrigger asChild>
            <button
              className={cn(
                "flex flex-col items-center justify-center gap-1 px-3 py-2 min-w-[64px] touch-target",
                "transition-colors text-muted-foreground"
              )}
            >
              <Menu className="w-5 h-5" />
              <span className="text-xs font-medium">More</span>
            </button>
          </SheetTrigger>
          <SheetContent side="bottom" className="h-[70vh] rounded-t-2xl">
            <div className="pt-4 pb-safe">
              <div className="w-12 h-1 bg-muted rounded-full mx-auto mb-6" />
              <h3 className="text-lg font-semibold mb-4 px-4">Navigation</h3>
              <div className="grid grid-cols-3 gap-2 px-4">
                {moreNavItems.map((item) => {
                  const isActive = location === item.path;
                  return (
                    <button
                      key={item.path}
                      onClick={() => {
                        setLocation(item.path);
                        setMoreOpen(false);
                      }}
                      className={cn(
                        "flex flex-col items-center justify-center gap-2 p-4 rounded-xl",
                        "transition-colors touch-target",
                        isActive 
                          ? "bg-primary/20 text-primary" 
                          : "bg-muted/50 text-foreground hover:bg-muted"
                      )}
                    >
                      <span className="text-sm font-medium text-center">{item.label}</span>
                    </button>
                  );
                })}
              </div>
              
              {/* Profile section */}
              <div className="mt-6 px-4 pt-4 border-t">
                <Button
                  variant="outline"
                  className="w-full justify-start gap-3"
                  onClick={() => {
                    setLocation("/profile");
                    setMoreOpen(false);
                  }}
                >
                  <User className="w-5 h-5" />
                  <span>Profile & Settings</span>
                </Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}

export function MobileHeader({ title }: { title?: string }) {
  const [location] = useLocation();
  
  // Determine title from current route if not provided
  const pageTitle = title || (() => {
    const routes: Record<string, string> = {
      "/dashboard": "Dashboard",
      "/analysis": "AI Analysis",
      "/bots": "Trading Bots",
      "/portfolio": "Portfolio",
      "/marketplace": "Marketplace",
      "/backtest": "Backtest",
      "/schedules": "Schedules",
      "/community": "Community",
      "/accuracy": "Accuracy",
      "/notifications": "Notifications",
      "/profile": "Profile",
      "/settings": "Settings",
    };
    return routes[location] || "TradoVerse";
  })();

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur border-b border-border sm:hidden">
      <div className="flex items-center justify-between h-14 px-4">
        <h1 className="text-lg font-semibold truncate">{pageTitle}</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="touch-target"
            onClick={() => window.location.href = "/notifications"}
          >
            <Bell className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </header>
  );
}
