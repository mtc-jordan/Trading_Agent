/**
 * Position Sync Status Component
 * Displays sync status and controls for broker positions
 */

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Loader2,
  Play,
  Pause,
  Settings
} from 'lucide-react';
import { trpc } from '@/lib/trpc';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

interface SyncStatus {
  connectionId: string;
  lastSyncAt: Date | null;
  nextSyncAt: Date | null;
  status: 'idle' | 'syncing' | 'error';
  error?: string;
  positionsCount: number;
}

interface PositionSyncStatusProps {
  connectionId?: string;
  showControls?: boolean;
  compact?: boolean;
  className?: string;
}

export function PositionSyncStatus({
  connectionId,
  showControls = true,
  compact = false,
  className = '',
}: PositionSyncStatusProps) {
  const [isSyncing, setIsSyncing] = useState(false);
  
  // Get sync status
  const { data: syncStatus, refetch: refetchStatus } = trpc.broker.getSyncStatus.useQuery(
    undefined,
    { refetchInterval: 30000 } // Refresh every 30 seconds
  );
  
  // Sync mutations
  const syncPositionsMutation = trpc.broker.syncPositions.useMutation({
    onSuccess: () => {
      toast.success('Positions synced successfully');
      refetchStatus();
    },
    onError: (error) => {
      toast.error('Failed to sync positions', { description: error.message });
    },
  });
  
  const syncAllMutation = trpc.broker.syncAllPositions.useMutation({
    onSuccess: (result) => {
      toast.success(`Synced ${result.synced} connections`, {
        description: result.failed > 0 ? `${result.failed} failed` : undefined,
      });
      refetchStatus();
    },
    onError: (error) => {
      toast.error('Failed to sync positions', { description: error.message });
    },
  });
  
  const startAutoSyncMutation = trpc.broker.startAutoSync.useMutation({
    onSuccess: () => {
      toast.success('Auto-sync started');
      refetchStatus();
    },
  });
  
  const stopAutoSyncMutation = trpc.broker.stopAutoSync.useMutation({
    onSuccess: () => {
      toast.success('Auto-sync stopped');
      refetchStatus();
    },
  });
  
  // Handle manual sync
  const handleSync = async () => {
    setIsSyncing(true);
    try {
      if (connectionId) {
        await syncPositionsMutation.mutateAsync({ connectionId });
      } else {
        await syncAllMutation.mutateAsync();
      }
    } finally {
      setIsSyncing(false);
    }
  };
  
  // Handle auto-sync toggle
  const handleToggleAutoSync = async (connId: string, isActive: boolean) => {
    if (isActive) {
      await stopAutoSyncMutation.mutateAsync({ connectionId: connId });
    } else {
      await startAutoSyncMutation.mutateAsync({ connectionId: connId, intervalMinutes: 5 });
    }
  };
  
  // Get status for specific connection or aggregate
  const getConnectionStatus = (connId: string): SyncStatus | undefined => {
    return syncStatus?.find(s => s.connectionId === connId);
  };
  
  // Render status badge
  const renderStatusBadge = (status: SyncStatus['status']) => {
    switch (status) {
      case 'syncing':
        return (
          <Badge variant="secondary" className="bg-blue-500/10 text-blue-500">
            <Loader2 className="h-3 w-3 mr-1 animate-spin" />
            Syncing
          </Badge>
        );
      case 'error':
        return (
          <Badge variant="destructive">
            <AlertCircle className="h-3 w-3 mr-1" />
            Error
          </Badge>
        );
      default:
        return (
          <Badge variant="secondary" className="bg-green-500/10 text-green-500">
            <CheckCircle2 className="h-3 w-3 mr-1" />
            Synced
          </Badge>
        );
    }
  };
  
  // Compact view
  if (compact) {
    const status = connectionId ? getConnectionStatus(connectionId) : syncStatus?.[0];
    
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {status && renderStatusBadge(status.status)}
        {status?.lastSyncAt && (
          <span className="text-xs text-muted-foreground">
            {formatDistanceToNow(new Date(status.lastSyncAt), { addSuffix: true })}
          </span>
        )}
        {showControls && (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  <RefreshCw className={`h-3 w-3 ${isSyncing ? 'animate-spin' : ''}`} />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Sync now</TooltipContent>
            </Tooltip>
          </TooltipProvider>
        )}
      </div>
    );
  }
  
  // Full view
  return (
    <Card className={className}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-primary" />
              Position Sync
            </CardTitle>
            <CardDescription>
              Real-time position synchronization
            </CardDescription>
          </div>
          {showControls && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={isSyncing}
            >
              {isSyncing ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Syncing...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Sync All
                </>
              )}
            </Button>
          )}
        </div>
      </CardHeader>
      
      <CardContent>
        {!syncStatus || syncStatus.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            <Clock className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p>No sync status available</p>
            <p className="text-xs">Connect a broker to start syncing</p>
          </div>
        ) : (
          <div className="space-y-3">
            {syncStatus.map((status) => (
              <div
                key={status.connectionId}
                className="flex items-center justify-between p-3 bg-muted/50 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  {renderStatusBadge(status.status)}
                  <div>
                    <p className="text-sm font-medium">
                      {status.positionsCount} positions
                    </p>
                    {status.lastSyncAt && (
                      <p className="text-xs text-muted-foreground">
                        Last sync: {formatDistanceToNow(new Date(status.lastSyncAt), { addSuffix: true })}
                      </p>
                    )}
                    {status.nextSyncAt && (
                      <p className="text-xs text-muted-foreground">
                        Next sync: {formatDistanceToNow(new Date(status.nextSyncAt), { addSuffix: true })}
                      </p>
                    )}
                    {status.error && (
                      <p className="text-xs text-red-500">{status.error}</p>
                    )}
                  </div>
                </div>
                
                {showControls && (
                  <div className="flex items-center gap-2">
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => syncPositionsMutation.mutate({ connectionId: status.connectionId })}
                            disabled={status.status === 'syncing'}
                          >
                            <RefreshCw className={`h-4 w-4 ${status.status === 'syncing' ? 'animate-spin' : ''}`} />
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>Sync now</TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                    
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8"
                            onClick={() => handleToggleAutoSync(status.connectionId, !!status.nextSyncAt)}
                          >
                            {status.nextSyncAt ? (
                              <Pause className="h-4 w-4" />
                            ) : (
                              <Play className="h-4 w-4" />
                            )}
                          </Button>
                        </TooltipTrigger>
                        <TooltipContent>
                          {status.nextSyncAt ? 'Stop auto-sync' : 'Start auto-sync'}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default PositionSyncStatus;
