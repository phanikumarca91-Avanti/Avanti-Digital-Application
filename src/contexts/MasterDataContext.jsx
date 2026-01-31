import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { MASTER_DATA as INITIAL_DATA } from '../data/masterData';
import { supabase } from '../lib/supabase';

const MasterDataContext = createContext();

export const useMasterData = () => {
    const context = useContext(MasterDataContext);
    if (!context) {
        throw new Error('useMasterData must be used within a MasterDataProvider');
    }
    return context;
};

export const MasterDataProvider = ({ children }) => {
    // 1. Load User Changes from LocalStorage (Small data)
    const [userChanges, setUserChanges] = useState(() => {
        try {
            const saved = localStorage.getItem('master_data_changes_v1');
            return saved ? JSON.parse(saved) : { added: {}, updated: {}, deleted: {} };
        } catch (e) {
            console.error("Failed to load master data changes", e);
            return { added: {}, updated: {}, deleted: {} };
        }
    });

    // 1b. Load from Cloud on Mount (Sync)
    const [cloudBaseData, setCloudBaseData] = useState(null);

    useEffect(() => {
        const syncFromCloud = async () => {
            // Fetch Changes
            const changesPromise = supabase.from('master_data').select('value').eq('key', 'master_data_changes_v1').single();

            // Fetch Base Data (All Chunks)
            // We fetch all keys starting with master_data_base_v1_
            const basePromise = supabase.from('master_data').select('key, value').like('key', 'master_data_base_v1_%');

            const [changesResult, baseResult] = await Promise.all([changesPromise, basePromise]);

            if (changesResult.data && !changesResult.error && changesResult.data.value) {
                setUserChanges(changesResult.data.value);
                localStorage.setItem('master_data_changes_v1', JSON.stringify(changesResult.data.value));
            }

            if (baseResult.data && !baseResult.error && baseResult.data.length > 0) {
                console.log("Using Cloud Base Master Data (Chunks)");
                const reconstructedBase = {};
                baseResult.data.forEach(row => {
                    // key is "master_data_base_v1_SUPPLIERS" -> category is "SUPPLIERS"
                    const category = row.key.replace('master_data_base_v1_', '');
                    reconstructedBase[category] = row.value;
                });
                setCloudBaseData(reconstructedBase);
            }
        };
        syncFromCloud();
    }, []);

    // 2. Persist User Changes to Local & Cloud
    useEffect(() => {
        try {
            const json = JSON.stringify(userChanges);
            localStorage.setItem('master_data_changes_v1', json);

            // Debounce or just fire-and-forget to Cloud
            supabase.from('master_data').upsert({
                key: 'master_data_changes_v1',
                value: userChanges
            }).then(({ error }) => {
                if (error) console.error("Cloud Sync Failed", error);
            });

        } catch (e) {
            console.error("Failed to save changes to localStorage (Quota Exceeded?)", e);
        }
    }, [userChanges]);

    // 3. Compute Final Master Data (Merge Static + Dynamic)
    const masterData = useMemo(() => {
        const base = cloudBaseData || INITIAL_DATA;
        // Ensure new modules have empty arrays if not in static data
        const merged = {
            ...base,
            SUPPLIERS: base.SUPPLIERS || [],
            PURCHASE_ORDERS: base.PURCHASE_ORDERS || []
        };

        // Process each category
        Object.keys(merged).forEach(category => {
            let items = [...(merged[category] || [])];

            // A. Apply Deletions
            const deletedIds = userChanges.deleted[category] || [];
            if (deletedIds.length > 0) {
                items = items.filter(item => !deletedIds.includes(item.id));
            }

            // B. Apply Updates
            const updatedItems = userChanges.updated[category] || {};
            if (Object.keys(updatedItems).length > 0) {
                items = items.map(item => updatedItems[item.id] ? { ...item, ...updatedItems[item.id] } : item);
            }

            // C. Apply Additions
            const addedItems = userChanges.added[category] || [];
            if (addedItems.length > 0) {
                items = [...items, ...addedItems];
            }

            merged[category] = items;
        });

        return merged;
    }, [userChanges]);

    // CRUD Operations

    const addMaterial = (category, material) => {
        const newMaterial = { ...material, id: Date.now().toString() };
        setUserChanges(prev => ({
            ...prev,
            added: {
                ...prev.added,
                [category]: [...(prev.added[category] || []), newMaterial]
            }
        }));
    };

    const updateMaterial = (category, id, updatedMaterial) => {
        // Check if it's a newly added item
        const isNewItem = (userChanges.added[category] || []).some(item => item.id === id);

        if (isNewItem) {
            // If it's new, just update it in the 'added' list
            setUserChanges(prev => ({
                ...prev,
                added: {
                    ...prev.added,
                    [category]: prev.added[category].map(item => item.id === id ? { ...item, ...updatedMaterial } : item)
                }
            }));
        } else {
            // If it's an existing static item, track it in 'updated'
            setUserChanges(prev => ({
                ...prev,
                updated: {
                    ...prev.updated,
                    [category]: {
                        ...(prev.updated[category] || {}),
                        [id]: updatedMaterial
                    }
                }
            }));
        }
    };

    const deleteMaterial = (category, id) => {
        // Check if it's a newly added item
        const isNewItem = (userChanges.added[category] || []).some(item => item.id === id);

        if (isNewItem) {
            // Remove from 'added' list
            setUserChanges(prev => ({
                ...prev,
                added: {
                    ...prev.added,
                    [category]: prev.added[category].filter(item => item.id !== id)
                }
            }));
        } else {
            // Add to 'deleted' list
            setUserChanges(prev => ({
                ...prev,
                deleted: {
                    ...prev.deleted,
                    [category]: [...(prev.deleted[category] || []), id]
                }
            }));
        }
    };

    const getMaterialsByCategory = (category) => {
        return masterData[category] || [];
    };

    // Aliases for better semantics
    const addMasterItem = addMaterial;
    const updateMasterItem = updateMaterial;
    const deleteMasterItem = deleteMaterial;

    const value = {
        masterData,
        addMaterial,
        updateMaterial,
        deleteMaterial,
        getMaterialsByCategory,
        addMasterItem,
        updateMasterItem,
        deleteMasterItem
    };

    return (
        <MasterDataContext.Provider value={value}>
            {children}
        </MasterDataContext.Provider>
    );
};
