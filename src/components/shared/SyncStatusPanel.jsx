import React, { useState, useEffect } from 'react';
import { RefreshCw, AlertCircle, CheckCircle, X } from 'lucide-react';
import { syncManager } from '../../lib/syncManager';

/**
 * Sync Status Panel - Shows pending operations and allows manual sync
 */
export const SyncStatusPanel = ({ isOpen, onClose }) => {
    const [pendingCount, setPendingCount] = useState(0);
    const [failedItems, setFailedItems] = useState([]);
    const [syncing, setSyncing] = useState(false);

    const loadStatus = async () => {
        const pending = await syncManager.getPendingCount();
        const failed = await syncManager.getFailedItems();
        setPendingCount(pending);
        setFailedItems(failed);
    };

    useEffect(() => {
        if (isOpen) {
            loadStatus();
        }

        const handleUpdate = () => loadStatus();
        window.addEventListener('sync-queue-updated', handleUpdate);
        window.addEventListener('sync-completed', () => {
            setSyncing(false);
            loadStatus();
        });

        return () => {
            window.removeEventListener('sync-queue-updated', handleUpdate);
        };
    }, [isOpen]);

    const handleManualSync = async () => {
        setSyncing(true);
        await syncManager.processQueue();
    };

    const handleRetryFailed = async () => {
        setSyncing(true);
        await syncManager.retryFailed();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed right-4 top-24 w-96 bg-white rounded-lg shadow-2xl border border-slate-200 z-50">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-200">
                <h3 className="font-semibold text-slate-800">Sync Status</h3>
                <button onClick={onClose} className="p-1 hover:bg-slate-100 rounded">
                    <X size={18} />
                </button>
            </div>

            {/* Body */}
            <div className="p-4 space-y-4 max-h-96 overflow-y-auto">
                {/* Pending Operations */}
                <div>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-sm font-medium text-slate-700">
                            Pending Operations
                        </span>
                        <span className="text-sm font-bold text-brand-600">
                            {pendingCount}
                        </span>
                    </div>
                    {pendingCount > 0 && (
                        <button
                            onClick={handleManualSync}
                            disabled={syncing}
                            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 disabled:opacity-50"
                        >
                            <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
                            {syncing ? 'Syncing...' : 'Sync Now'}
                        </button>
                    )}
                    {pendingCount === 0 && (
                        <div className="flex items-center gap-2 text-green-600 text-sm">
                            <CheckCircle size={16} />
                            <span>All data synced</span>
                        </div>
                    )}
                </div>

                {/* Failed Items */}
                {failedItems.length > 0 && (
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-red-600">
                            <AlertCircle size={16} />
                            <span className="text-sm font-medium">
                                {failedItems.length} Failed Operations
                            </span>
                        </div>
                        <button
                            onClick={handleRetryFailed}
                            disabled={syncing}
                            className="w-full px-4 py-2 bg-red-50 text-red-700 rounded-lg hover:bg-red-100 text-sm disabled:opacity-50"
                        >
                            Retry Failed
                        </button>
                        <div className="mt-2 space-y-1 text-xs">
                            {failedItems.slice(0, 5).map((item, i) => (
                                <div key={i} className="p-2 bg-red-50 rounded text-red-700">
                                    {item.action} {item.table} - {item.error || 'Unknown error'}
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};
