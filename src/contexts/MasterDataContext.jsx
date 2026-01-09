import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import { MASTER_DATA as INITIAL_DATA } from '../data/masterData';

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

    // 2. Persist User Changes only
    useEffect(() => {
        try {
            localStorage.setItem('master_data_changes_v1', JSON.stringify(userChanges));
        } catch (e) {
            console.error("Failed to save changes to localStorage (Quota Exceeded?)", e);
            // Optional: Show a toast here if we had a toast system hooked up
        }
    }, [userChanges]);

    // 3. Compute Final Master Data (Merge Static + Dynamic)
    const masterData = useMemo(() => {
        // Ensure new modules have empty arrays if not in static data
        const merged = {
            ...INITIAL_DATA,
            SUPPLIERS: INITIAL_DATA.SUPPLIERS || [],
            PURCHASE_ORDERS: INITIAL_DATA.PURCHASE_ORDERS || []
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
