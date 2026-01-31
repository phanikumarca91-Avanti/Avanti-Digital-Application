import { syncQueueDB } from './indexedDB';
import { supabase } from './supabase';

/**
 * Sync Manager - Handles offline operations queue and syncing
 */
class SyncManager {
    constructor() {
        this.isSyncing = false;
        this.maxRetries = 3;
        this.batchSize = 10; // Process 10 items at a time
    }

    /**
     * Add operation to sync queue
     */
    async queueOperation(operation) {
        const queueItem = {
            action: operation.action, // 'INSERT', 'UPDATE', 'DELETE'
            table: operation.table, // 'vehicles', 'warehouse_stock', etc.
            data: operation.data,
            timestamp: new Date().toISOString(),
            retries: 0,
            error: null
        };

        await syncQueueDB.put(queueItem);
        console.log('📥 Queued operation:', queueItem);

        // Emit event for UI updates
        window.dispatchEvent(new CustomEvent('sync-queue-updated'));
    }

    /**
     * Process sync queue
     */
    async processQueue() {
        if (this.isSyncing) {
            console.log('⏳ Sync already in progress...');
            return;
        }

        if (!navigator.onLine) {
            console.log('📴 Offline - skipping sync');
            return;
        }

        this.isSyncing = true;
        console.log('🔄 Starting sync...');

        try {
            const queue = await syncQueueDB.getAll();
            const pendingItems = queue.sort((a, b) =>
                new Date(a.timestamp) - new Date(b.timestamp)
            );

            console.log(`📊 ${pendingItems.length} items in queue`);

            // Process in batches
            for (let i = 0; i < pendingItems.length; i += this.batchSize) {
                const batch = pendingItems.slice(i, i + this.batchSize);
                await this.processBatch(batch);
            }

            console.log('✅ Sync complete');
            window.dispatchEvent(new CustomEvent('sync-completed'));
        } catch (error) {
            console.error('❌ Sync failed:', error);
            window.dispatchEvent(new CustomEvent('sync-failed', { detail: error }));
        } finally {
            this.isSyncing = false;
        }
    }

    /**
     * Process a batch of queue items
     */
    async processBatch(items) {
        for (const item of items) {
            try {
                await this.syncItem(item);
                await syncQueueDB.delete(item.id);
                console.log('✓ Synced:', item.action, item.table, item.data.id);
            } catch (error) {
                console.error('✗ Failed to sync:', item.id, error);

                // Increment retry count
                item.retries = (item.retries || 0) + 1;
                item.error = error.message;

                if (item.retries >= this.maxRetries) {
                    console.error(`❌ Max retries reached for item ${item.id}`);
                    // Keep in queue but flag as failed
                    item.failed = true;
                }

                await syncQueueDB.put(item);
            }
        }
    }

    /**
     * Sync individual item to Supabase
     */
    async syncItem(item) {
        const { action, table, data } = item;

        switch (action) {
            case 'INSERT':
                const { error: insertError } = await supabase
                    .from(table)
                    .insert(data);
                if (insertError) throw insertError;
                break;

            case 'UPDATE':
                const { error: updateError } = await supabase
                    .from(table)
                    .update(data)
                    .eq('id', data.id);
                if (updateError) throw updateError;
                break;

            case 'DELETE':
                const { error: deleteError } = await supabase
                    .from(table)
                    .delete()
                    .eq('id', data.id);
                if (deleteError) throw deleteError;
                break;

            case 'UPSERT':
                const { error: upsertError } = await supabase
                    .from(table)
                    .upsert(data);
                if (upsertError) throw upsertError;
                break;

            default:
                throw new Error(`Unknown action: ${action}`);
        }
    }

    /**
     * Get pending sync count
     */
    async getPendingCount() {
        const queue = await syncQueueDB.getAll();
        return queue.filter(item => !item.failed).length;
    }

    /**
     * Get failed items
     */
    async getFailedItems() {
        const queue = await syncQueueDB.getAll();
        return queue.filter(item => item.failed);
    }

    /**
     * Clear sync queue (use with caution)
     */
    async clearQueue() {
        await syncQueueDB.clear();
        console.log('🗑️ Sync queue cleared');
        window.dispatchEvent(new CustomEvent('sync-queue-updated'));
    }

    /**
     * Retry failed items
     */
    async retryFailed() {
        const failed = await this.getFailedItems();
        for (const item of failed) {
            item.failed = false;
            item.retries = 0;
            item.error = null;
            await syncQueueDB.put(item);
        }

        window.dispatchEvent(new CustomEvent('sync-queue-updated'));
        await this.processQueue();
    }
}

// Export singleton instance
export const syncManager = new SyncManager();

// Auto-sync on reconnection
if (typeof window !== 'undefined') {
    window.addEventListener('connection-restored', () => {
        console.log('🔄 Triggering auto-sync...');
        setTimeout(() => syncManager.processQueue(), 1000); // Delay to ensure connection is stable
    });
}
