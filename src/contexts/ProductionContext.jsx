import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { INITIAL_STOCK_DATA } from '../data/initialStockData';
import { productionDB } from '../lib/indexedDB';
import { syncManager } from '../lib/syncManager';

const ProductionContext = createContext();

export const useProduction = () => {
    const context = useContext(ProductionContext);
    if (!context) {
        throw new Error('useProduction must be used within a ProductionProvider');
    }
    return context;
};

// Unit Code Mapping
export const UNIT_CODES = {
    'Unit-1': 'K1',
    'Unit-2': 'K2',
    'Unit-3': 'K3',
    'FDB Plant-1': 'B4',
    'FDB Plant-2': 'B5',
    'FDB Plant-3': 'B6'
};

export const ORG_STRUCTURE = {
    AP_DIVISION: {
        id: 'AP',
        label: 'AP Division',
        regions: {
            KVR: {
                id: 'KVR',
                label: 'Kovvur Region',
                units: ['Unit-1', 'Unit-2', 'Unit-3']
            },
            BDP: {
                id: 'BDP',
                label: 'Bandapuram Region',
                units: ['FDB Plant-1', 'FDB Plant-2', 'FDB Plant-3']
            }
        }
    }
};

export const ProductionProvider = ({ children }) => {
    const [lots, setLots] = useState([]);
    const [sequences, setSequences] = useState({});
    const [loading, setLoading] = useState(true);

    // Initial Load & Subscription
    useEffect(() => {
        const fetchLots = async () => {
            try {
                // 1. Fetch Lots
                const { data, error } = await supabase
                    .from('production_lots')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (error) throw error;

                // Merge with initial stock data (if not present) for dev/demo purposes
                // Only if DB is empty, or just append initial data that doesn't conflict?
                // Better approach: If local development, maybe we seed?
                // For now, let's trust Supabase + merge Initial if they don't exist in DB?
                // Simplest: Just use DB data. If empty, user can add. 
                // BUT current app relies on INITIAL_STOCK_DATA. 
                // Let's merge them in memory for view, but filtered by ID.

                const dbLots = data.map(row => ({
                    ...row.data,
                    id: row.id, // Ensure ID matches
                    status: row.status,
                    // Ensure lot_number matches id for legacy reasons if needed, but DB uses id column
                }));

                setLots(dbLots);

                // 2. Fetch Sequences from master_data
                const { data: seqData, error: seqError } = await supabase
                    .from('master_data')
                    .select('value')
                    .eq('key', 'lot_sequences')
                    .single();

                const loadedSequences = seqData?.value || {};
                const healingSequences = { ...loadedSequences };
                let healed = false;

                // Self-Heal: Scan existing lots to find max sequence for each prefix
                // Prevents Duplicate Key errors if local sequence is stale
                dbLots.forEach(lot => {
                    const id = lot.id;
                    // Expected format: 4 digit FY (2526) + 2 digit Unit (K1) + Seq
                    if (id && id.length > 6) {
                        const fyPrefix = id.slice(0, 4);
                        const unitCode = id.slice(4, 6);
                        const seqStr = id.slice(6);
                        const seq = parseInt(seqStr);

                        if (!isNaN(seq)) {
                            const key = `${fyPrefix}-${unitCode}`;
                            if (!healingSequences[key] || seq >= healingSequences[key]) {
                                healingSequences[key] = seq; // Use the Max found as current (next will be +1)
                                healed = true;
                            }
                        }
                    }
                });

                if (healed) {
                    console.log("🩹 Self-healed Lot Sequences from DB:", healingSequences);
                    setSequences(healingSequences);
                    // Async update cloud to save the fix
                    supabase.from('master_data').upsert({ key: 'lot_sequences', value: healingSequences }).then();
                } else {
                    setSequences(loadedSequences);
                }

                if (!seqData && !seqError && !healed) {
                    // Initialize if completely missing
                    await supabase.from('master_data').insert({
                        key: 'lot_sequences',
                        value: {}
                    });
                }

            } catch (err) {
                console.error('Error fetching production data:', err);
            } finally {
                setLoading(false);
            }
        };

        fetchLots();

        // Real-time Subscription
        const channel = supabase
            .channel('production_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'production_lots' }, (payload) => {
                if (payload.event === 'INSERT') {
                    const newLot = { ...payload.new.data, id: payload.new.id, status: payload.new.status };
                    setLots(prev => {
                        if (prev.some(l => l.id === newLot.id)) return prev;
                        return [newLot, ...prev];
                    });
                } else if (payload.event === 'UPDATE') {
                    setLots(prev => prev.map(lot =>
                        lot.id === payload.new.id ? { ...payload.new.data, id: payload.new.id, status: payload.new.status } : lot
                    ));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Helper to get FY Prefix and Unit Code
    const getLotPrefixDetails = (unitName, dateObj) => {
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth();
        let fyPrefix = "";

        if (month >= 3) { // April onwards
            const y1 = year.toString().slice(2);
            const y2 = (year + 1).toString().slice(2);
            fyPrefix = `${y1}${y2}`;
        } else {
            const y1 = (year - 1).toString().slice(2);
            const y2 = year.toString().slice(2);
            fyPrefix = `${y1}${y2}`;
        }

        let unitCode = "XX";
        const cleanUnitName = unitName.replace('Kovvur ', '').replace('Bandapuram ', '');
        if (UNIT_CODES[cleanUnitName]) {
            unitCode = UNIT_CODES[cleanUnitName];
        } else {
            const key = Object.keys(UNIT_CODES).find(k => unitName.includes(k));
            if (key) unitCode = UNIT_CODES[key];
        }

        return { fyPrefix, unitCode };
    };

    // Generate a single lot number
    const generateLotNumber = (unitName, dateObj = new Date()) => {
        // NOTE: Ideally this should be server-side or atomic transaction.
        // For this app scope, we will optimistically increment locally and push to master_data immediately.
        const { fyPrefix, unitCode } = getLotPrefixDetails(unitName, dateObj);
        const seqKey = `${fyPrefix}-${unitCode}`;
        const currentSeq = sequences[seqKey] || 1000;
        const nextSeq = currentSeq + 1;
        const lotNumber = `${fyPrefix}${unitCode}${currentSeq}`;

        // Update Local
        const newSequences = { ...sequences, [seqKey]: nextSeq };
        setSequences(newSequences);

        // Sync to Cloud (Fire & Forget for speed, or await if critical)
        supabase
            .from('master_data')
            .upsert({ key: 'lot_sequences', value: newSequences }, { onConflict: 'key' })
            .then(({ error }) => {
                if (error) console.error("Sequence Sync Error:", error);
            });

        return lotNumber;
    };

    // Generate Batch Lot Numbers
    const generateBatchLotNumbers = (unitName, dateObj = new Date(), count = 1) => {
        const { fyPrefix, unitCode } = getLotPrefixDetails(unitName, dateObj);
        const seqKey = `${fyPrefix}-${unitCode}`;
        let currentSeq = sequences[seqKey] || 1000;

        const newLotNumbers = [];
        for (let i = 0; i < count; i++) {
            newLotNumbers.push(`${fyPrefix}${unitCode}${currentSeq}`);
            currentSeq++;
        }

        // Update Local
        const newSequences = { ...sequences, [seqKey]: currentSeq };
        setSequences(newSequences);

        // Sync to Cloud
        supabase
            .from('master_data')
            .upsert({ key: 'lot_sequences', value: newSequences }, { onConflict: 'key' })
            .then(({ error }) => {
                if (error) console.error("Sequence Sync Error:", error);
            });

        return newLotNumbers;
    };

    const addLot = async (lotData) => {
        const newLot = {
            ...lotData,
            id: lotData.lotNumber,
            status: lotData.status || 'UNASSIGNED',
            createdAt: new Date().toISOString(),
            qcData: null
        };

        setLots(prev => {
            if (prev.some(l => l.id === newLot.id)) return prev;
            return [newLot, ...prev];
        });

        if (navigator.onLine) {
            const { error } = await supabase.from('production_lots').insert({
                id: newLot.id,
                lot_number: newLot.id,
                status: newLot.status,
                data: newLot
            });
            if (error) console.error('Add Lot Error:', error);
            else await productionDB.put({ ...newLot, synced: true });
        } else {
            console.log('📴 Offline - queueing lot creation');
            await productionDB.put({ ...newLot, synced: false });
            await syncManager.queueOperation({
                action: 'INSERT',
                table: 'production_lots',
                data: { id: newLot.id, lot_number: newLot.id, status: newLot.status, data: newLot }
            });
        }
    };

    // Batch add lots
    const addLots = async (lotsData) => {
        const newLots = lotsData.map(data => ({
            ...data,
            id: data.lotNumber,
            status: data.status || 'UNASSIGNED',
            createdAt: new Date().toISOString(),
            qcData: null
        }));

        // Optimistic Deduplication
        setLots(prev => {
            const uniqueNewLots = newLots.filter(n => !prev.some(p => p.id === n.id));
            return [...uniqueNewLots, ...prev];
        });

        // Cloud Insert
        const dbRows = newLots.map(l => ({
            id: l.id,
            lot_number: l.id,
            status: l.status,
            data: l
        }));

        const { error } = await supabase.from('production_lots').insert(dbRows);

        if (error) {
            console.error('Batch Add Error:', error);
            alert(`Failed to save Lots to cloud! Error: ${error.message || 'Unknown Error'}`);
            // Optional: Rollback state here if needed, but for now just letting user know
        }
    };

    const updateLotDetails = async (lotId, details) => {
        // Find existing to merge
        const existing = lots.find(l => l.id === lotId);
        if (!existing) return;

        const updated = {
            ...existing,
            ...details,
            status: 'PENDING_QA',
            updatedAt: new Date().toISOString()
        };

        // Optimistic
        setLots(prev => prev.map(lot => lot.id === lotId ? updated : lot));

        // Cloud Update
        const { error } = await supabase
            .from('production_lots')
            .update({
                status: 'PENDING_QA',
                data: updated,
                updated_at: new Date().toISOString()
            })
            .eq('id', lotId);

        if (error) console.error('Update Lot Error:', error);
    };

    const updateLot = async (lotId, updates) => {
        const existing = lots.find(l => l.id === lotId);
        if (!existing) return;

        const updated = {
            ...existing,
            ...updates,
            updatedAt: new Date().toISOString()
        };

        // Optimistic
        setLots(prev => prev.map(lot => lot.id === lotId ? updated : lot));

        // Cloud Update
        const payload = {
            data: updated,
            updated_at: new Date().toISOString()
        };
        // If status is updated, sync it to top level column too
        if (updates.status) {
            payload.status = updates.status;
        }

        if (navigator.onLine) {
            const { error } = await supabase.from('production_lots').update(payload).eq('id', lotId);
            if (error) console.error('Update Lot Generic Error:', error);
        } else {
            console.log('📴 Offline - queueing generic lot update');
            await syncManager.queueOperation({
                action: 'UPDATE',
                table: 'production_lots',
                data: { id: lotId, ...payload }
            });
        }
    };

    const updateLotStatus = async (lotId, status, qcData = null) => {
        const existing = lots.find(l => l.id === lotId);
        if (!existing) return;

        const updated = {
            ...existing,
            status,
            qcData: qcData || existing.qcData,
            updatedAt: new Date().toISOString()
        };

        setLots(prev => prev.map(lot => lot.id === lotId ? updated : lot));

        if (navigator.onLine) {
            const { error } = await supabase.from('production_lots').update({
                status, data: updated, updated_at: new Date().toISOString()
            }).eq('id', lotId);
            if (error) console.error('Update Status Error:', error);
        } else {
            console.log('📴 Offline - queueing lot status update');
            await syncManager.queueOperation({
                action: 'UPDATE',
                table: 'production_lots',
                data: { id: lotId, status, data: updated, updated_at: new Date().toISOString() }
            });
        }
    };

    const updateLotDocument = async (lotId, docType, fileData) => {
        const existing = lots.find(l => l.id === lotId);
        if (!existing) return;

        const logs = [...(existing.logs || []), {
            time: new Date().toLocaleString(),
            action: `Uploaded document: ${fileData.name} (${docType})`,
            stage: 'QC'
        }];

        const updated = {
            ...existing,
            documents: {
                ...existing.documents,
                [docType]: fileData
            },
            logs: logs
        };

        // Optimistic
        setLots(prev => prev.map(lot => lot.id === lotId ? updated : lot));

        // Cloud Update
        const { error } = await supabase
            .from('production_lots')
            .update({
                data: updated,
                updated_at: new Date().toISOString()
            })
            .eq('id', lotId);

        if (error) console.error('Doc Upload Error:', error);
    };

    const getLotsByStatus = (status) => {
        return lots.filter(lot => lot.status === status);
    };

    const value = {
        lots,
        addLot,
        addLots,
        updateLot, // Generic update
        updateLotDetails, // For Pre-QA edits (forces PENDING_QA)
        updateLotStatus, // For QC (updates qcData)
        updateLotDocument,
        getLotsByStatus,
        generateLotNumber,
        generateBatchLotNumbers,
        ORG_STRUCTURE
    };

    return (
        <ProductionContext.Provider value={value}>
            {children}
        </ProductionContext.Provider>
    );
};
