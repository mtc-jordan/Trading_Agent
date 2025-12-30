import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Target, TrendingUp, Award, Shield, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";

interface AccuracyBadgeProps {
  accuracyScore: number | null | undefined;
  totalPredictions?: number;
  correctPredictions?: number;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  className?: string;
}

export function AccuracyBadge({
  accuracyScore,
  totalPredictions = 0,
  correctPredictions = 0,
  size = "md",
  showLabel = true,
  className,
}: AccuracyBadgeProps) {
  // Calculate accuracy percentage
  const accuracy = accuracyScore !== null && accuracyScore !== undefined
    ? Number(accuracyScore) * 100
    : totalPredictions > 0
    ? (correctPredictions / totalPredictions) * 100
    : null;

  // Determine badge tier based on accuracy
  const getBadgeTier = () => {
    if (accuracy === null || totalPredictions < 10) {
      return {
        tier: "unverified",
        label: "Unverified",
        icon: AlertTriangle,
        color: "bg-gray-500/20 text-gray-400 border-gray-500/30",
        description: "Not enough predictions to verify accuracy",
      };
    }
    if (accuracy >= 85) {
      return {
        tier: "elite",
        label: "Elite",
        icon: Award,
        color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30",
        description: "Top-tier accuracy (85%+)",
      };
    }
    if (accuracy >= 75) {
      return {
        tier: "verified",
        label: "Verified",
        icon: Shield,
        color: "bg-green-500/20 text-green-400 border-green-500/30",
        description: "High accuracy (75-84%)",
      };
    }
    if (accuracy >= 60) {
      return {
        tier: "standard",
        label: "Standard",
        icon: Target,
        color: "bg-blue-500/20 text-blue-400 border-blue-500/30",
        description: "Good accuracy (60-74%)",
      };
    }
    return {
      tier: "basic",
      label: "Basic",
      icon: TrendingUp,
      color: "bg-orange-500/20 text-orange-400 border-orange-500/30",
      description: "Developing accuracy (<60%)",
    };
  };

  const tier = getBadgeTier();
  const Icon = tier.icon;

  const sizeClasses = {
    sm: "text-xs px-1.5 py-0.5",
    md: "text-sm px-2 py-1",
    lg: "text-base px-3 py-1.5",
  };

  const iconSizes = {
    sm: "h-3 w-3",
    md: "h-4 w-4",
    lg: "h-5 w-5",
  };

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Badge
          variant="outline"
          className={cn(
            "flex items-center gap-1 cursor-default",
            tier.color,
            sizeClasses[size],
            className
          )}
        >
          <Icon className={iconSizes[size]} />
          {showLabel && <span>{tier.label}</span>}
          {accuracy !== null && (
            <span className="font-mono">{accuracy.toFixed(0)}%</span>
          )}
        </Badge>
      </TooltipTrigger>
      <TooltipContent className="max-w-xs">
        <div className="space-y-1">
          <p className="font-medium">{tier.description}</p>
          {totalPredictions > 0 && (
            <p className="text-sm text-muted-foreground">
              {correctPredictions} correct out of {totalPredictions} predictions
            </p>
          )}
          {totalPredictions < 10 && (
            <p className="text-xs text-muted-foreground">
              Minimum 10 predictions required for verification
            </p>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  );
}

// Compact accuracy indicator for lists
interface AccuracyIndicatorProps {
  accuracyScore: number | null | undefined;
  className?: string;
}

export function AccuracyIndicator({ accuracyScore, className }: AccuracyIndicatorProps) {
  const accuracy = accuracyScore !== null && accuracyScore !== undefined
    ? Number(accuracyScore) * 100
    : null;

  if (accuracy === null) {
    return (
      <span className={cn("text-muted-foreground text-sm", className)}>--</span>
    );
  }

  const getColor = () => {
    if (accuracy >= 85) return "text-yellow-400";
    if (accuracy >= 75) return "text-green-400";
    if (accuracy >= 60) return "text-blue-400";
    return "text-orange-400";
  };

  return (
    <span className={cn("font-mono font-medium", getColor(), className)}>
      {accuracy.toFixed(0)}%
    </span>
  );
}

// Accuracy progress bar
interface AccuracyProgressProps {
  accuracyScore: number | null | undefined;
  totalPredictions?: number;
  className?: string;
}

export function AccuracyProgress({
  accuracyScore,
  totalPredictions = 0,
  className,
}: AccuracyProgressProps) {
  const accuracy = accuracyScore !== null && accuracyScore !== undefined
    ? Number(accuracyScore) * 100
    : null;

  const getColor = () => {
    if (accuracy === null) return "bg-gray-500";
    if (accuracy >= 85) return "bg-yellow-500";
    if (accuracy >= 75) return "bg-green-500";
    if (accuracy >= 60) return "bg-blue-500";
    return "bg-orange-500";
  };

  return (
    <div className={cn("space-y-1", className)}>
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">AI Accuracy</span>
        <span className={cn("font-mono", accuracy !== null ? getColor().replace("bg-", "text-") : "text-muted-foreground")}>
          {accuracy !== null ? `${accuracy.toFixed(0)}%` : "N/A"}
        </span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <div
          className={cn("h-full transition-all duration-500", getColor())}
          style={{ width: `${accuracy ?? 0}%` }}
        />
      </div>
      {totalPredictions > 0 && (
        <p className="text-xs text-muted-foreground">
          Based on {totalPredictions} predictions
        </p>
      )}
    </div>
  );
}
