/**
 * IndexedDB Wrapper for Offline Storage
 * Provides Promise-based API for local data persistence
 */

const DB_NAME = 'avanti_offline_db';
const DB_VERSION = 1;

// Object store names
export const STORES = {
    VEHICLES: 'vehicles',
    WAREHOUSE_STOCK: 'warehouse_stock',
    PRODUCTION_LOTS: 'production_lots',
    SALES_ORDERS: 'sales_orders',
    SYNC_QUEUE: 'sync_queue',
    MASTER_DATA: 'master_data'
};

/**
 * Initialize IndexedDB with object stores
 */
export const initDB = () => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => resolve(request.result);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            // Vehicles store
            if (!db.objectStoreNames.contains(STORES.VEHICLES)) {
                const vehicleStore = db.createObjectStore(STORES.VEHICLES, { keyPath: 'id' });
                vehicleStore.createIndex('synced', 'synced', { unique: false });
                vehicleStore.createIndex('timestamp', 'timestamp', { unique: false });
            }

            // Warehouse stock store
            if (!db.objectStoreNames.contains(STORES.WAREHOUSE_STOCK)) {
                const stockStore = db.createObjectStore(STORES.WAREHOUSE_STOCK, { keyPath: 'id' });
                stockStore.createIndex('synced', 'synced', { unique: false });
                stockStore.createIndex('timestamp', 'timestamp', { unique: false });
            }

            // Production lots store
            if (!db.objectStoreNames.contains(STORES.PRODUCTION_LOTS)) {
                const lotStore = db.createObjectStore(STORES.PRODUCTION_LOTS, { keyPath: 'id' });
                lotStore.createIndex('synced', 'synced', { unique: false });
                lotStore.createIndex('timestamp', 'timestamp', { unique: false });
            }

            // Sales orders store
            if (!db.objectStoreNames.contains(STORES.SALES_ORDERS)) {
                const salesStore = db.createObjectStore(STORES.SALES_ORDERS, { keyPath: 'id' });
                salesStore.createIndex('synced', 'synced', { unique: false });
                salesStore.createIndex('timestamp', 'timestamp', { unique: false });
            }

            // Sync queue store
            if (!db.objectStoreNames.contains(STORES.SYNC_QUEUE)) {
                const queueStore = db.createObjectStore(STORES.SYNC_QUEUE, { keyPath: 'id', autoIncrement: true });
                queueStore.createIndex('timestamp', 'timestamp', { unique: false });
                queueStore.createIndex('retries', 'retries', { unique: false });
            }

            // Master data store (for reference data)
            if (!db.objectStoreNames.contains(STORES.MASTER_DATA)) {
                const masterStore = db.createObjectStore(STORES.MASTER_DATA, { keyPath: 'id' });
                masterStore.createIndex('type', 'type', { unique: false });
                masterStore.createIndex('lastSync', 'lastSync', { unique: false });
            }
        };
    });
};

/**
 * Generic CRUD operations
 */
class IndexedDBHelper {
    constructor(storeName) {
        this.storeName = storeName;
    }

    async getDB() {
        return await initDB();
    }

    // Add/Update record
    async put(data) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.put({
                ...data,
                timestamp: data.timestamp || new Date().toISOString(),
                synced: data.synced !== undefined ? data.synced : false
            });

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Get single record by ID
    async get(id) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.get(id);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    // Get all records
    async getAll() {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const request = store.getAll();

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // Get records by index
    async getByIndex(indexName, value) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readonly');
            const store = tx.objectStore(this.storeName);
            const index = store.index(indexName);
            const request = index.getAll(value);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    // Delete record
    async delete(id) {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.delete(id);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Clear all records in store
    async clear() {
        const db = await this.getDB();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(this.storeName, 'readwrite');
            const store = tx.objectStore(this.storeName);
            const request = store.clear();

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Get unsynced records
    async getUnsynced() {
        return await this.getByIndex('synced', false);
    }

    // Mark record as synced
    async markSynced(id) {
        const record = await this.get(id);
        if (record) {
            record.synced = true;
            await this.put(record);
        }
    }
}

// Export helpers for each store
export const vehiclesDB = new IndexedDBHelper(STORES.VEHICLES);
export const warehouseDB = new IndexedDBHelper(STORES.WAREHOUSE_STOCK);
export const productionDB = new IndexedDBHelper(STORES.PRODUCTION_LOTS);
export const salesDB = new IndexedDBHelper(STORES.SALES_ORDERS);
export const syncQueueDB = new IndexedDBHelper(STORES.SYNC_QUEUE);
export const masterDataDB = new IndexedDBHelper(STORES.MASTER_DATA);
