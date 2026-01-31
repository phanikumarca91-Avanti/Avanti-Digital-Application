import React from 'react';
import { WifiOff, Wifi, CloudOff, RefreshCw } from 'lucide-react';
import { useOffline } from '../../hooks/useOffline';
import { syncManager } from '../../lib/syncManager';

/**
 * Offline Indicator Component
 * Shows connection status and pending sync count
 */
export const OfflineIndicator = () => {
    const { isOnline, wasOffline } = useOffline();
    const [pendingCount, setPendingCount] = React.useState(0);
    const [syncing, setSyncing] = React.useState(false);

    // Update pending count
    const updatePendingCount = async () => {
        const count = await syncManager.getPendingCount();
        setPendingCount(count);
    };

    React.useEffect(() => {
        updatePendingCount();

        const handleQueueUpdate = () => updatePendingCount();
        const handleSyncStart = () => setSyncing(true);
        const handleSyncEnd = () => {
            setSyncing(false);
            updatePendingCount();
        };

        window.addEventListener('sync-queue-updated', handleQueueUpdate);
        window.addEventListener('connection-restored', handleSyncStart);
        window.addEventListener('sync-completed', handleSyncEnd);
        window.addEventListener('sync-failed', handleSyncEnd);

        return () => {
            window.removeEventListener('sync-queue-updated', handleQueueUpdate);
            window.removeEventListener('connection-restored', handleSyncStart);
            window.removeEventListener('sync-completed', handleSyncEnd);
            window.removeEventListener('sync-failed', handleSyncEnd);
        };
    }, []);

    if (isOnline && pendingCount === 0 && !syncing) {
        // Online, all synced - show minimal indicator
        return (
            <div className="flex items-center gap-2 text-green-600" title="Online - All data synced">
                <Wifi size={18} />
            </div>
        );
    }

    if (!isOnline) {
        // Offline - show prominent warning
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg text-red-700">
                <WifiOff size={18} />
                <span className="text-sm font-medium">Offline Mode</span>
                {pendingCount > 0 && (
                    <span className="px-2 py-0.5 bg-red-100 rounded-full text-xs font-semibold">
                        {pendingCount} pending
                    </span>
                )}
            </div>
        );
    }

    if (syncing) {
        // Syncing in progress
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-blue-50 border border-blue-200 rounded-lg text-blue-700">
                <RefreshCw size={18} className="animate-spin" />
                <span className="text-sm font-medium">Syncing...</span>
                {pendingCount > 0 && (
                    <span className="text-xs">({pendingCount} left)</span>
                )}
            </div>
        );
    }

    if (pendingCount > 0) {
        // Online but has pending items
        return (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-yellow-50 border border-yellow-200 rounded-lg text-yellow-700">
                <CloudOff size={18} />
                <span className="text-sm font-medium">Syncing</span>
                <span className="px-2 py-0.5 bg-yellow-100 rounded-full text-xs font-semibold">
                    {pendingCount}
                </span>
            </div>
        );
    }

    return null;
};
