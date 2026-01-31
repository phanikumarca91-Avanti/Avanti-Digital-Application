import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { vehiclesDB } from '../lib/indexedDB';
import { syncManager } from '../lib/syncManager';

const VehicleContext = createContext();

export const useVehicles = () => {
    const context = useContext(VehicleContext);
    if (!context) {
        throw new Error('useVehicles must be used within a VehicleProvider');
    }
    return context;
};

export const VehicleProvider = ({ children }) => {
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isOnline, setIsOnline] = useState(navigator.onLine);

    // Fetch Active Vehicles (Not Completed) + Recently Completed
    const fetchVehicles = useCallback(async () => {
        setLoading(true);
        try {
            // Try to load from cloud first
            if (navigator.onLine) {
                const { data, error } = await supabase
                    .from('vehicles')
                    .select('*')
                    .order('created_at', { ascending: false });

                if (!error && data) {
                    const mergedVehicles = data.map(v => ({
                        ...v.data,
                        id: v.id,
                        status: v.status,
                        key: v.id
                    }));

                    setVehicles(mergedVehicles);

                    // Cache in IndexedDB for offline access
                    for (const vehicle of mergedVehicles) {
                        await vehiclesDB.put({ ...vehicle, synced: true });
                    }

                    setError(null);
                    return;
                }
            }

            // Fallback to IndexedDB if offline or Supabase failed
            console.log('📴 Loading vehicles from IndexedDB (offline)...');
            const cachedVehicles = await vehiclesDB.getAll();
            setVehicles(cachedVehicles.filter(v => !v.synced || v.synced === true)); // Get all

        } catch (err) {
            console.error("Error fetching vehicles:", err);
            setError(err.message);

            // Try IndexedDB as last resort
            try {
                const cachedVehicles = await vehiclesDB.getAll();
                setVehicles(cachedVehicles);
                setError('Offline mode - showing cached data');
            } catch (dbErr) {
                console.error("IndexedDB error:", dbErr);
            }
        } finally {
            setLoading(false);
        }
    }, []);

    // Real-time Subscription
    useEffect(() => {
        fetchVehicles();

        const channel = supabase
            .channel('vehicle_updates')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'vehicles' }, (payload) => {
                const { eventType, new: newRecord, old: oldRecord } = payload;

                if (eventType === 'INSERT' && newRecord) {
                    // Merge DB columns back to flat structure
                    const vehicle = { ...newRecord.data, id: newRecord.id, status: newRecord.status, key: newRecord.id };
                    setVehicles(prev => {
                        // FIX: Normalize ID type (String vs Number) to prevent duplicates
                        if (prev.some(v => String(v.id) === String(vehicle.id))) return prev;
                        return [vehicle, ...prev];
                    });
                } else if (eventType === 'UPDATE' && newRecord) {
                    const vehicle = { ...newRecord.data, id: newRecord.id, status: newRecord.status, key: newRecord.id };
                    setVehicles(prev => prev.map(v => String(v.id) === String(newRecord.id) ? vehicle : v));
                } else if (eventType === 'DELETE' && oldRecord) {
                    setVehicles(prev => prev.filter(v => String(v.id) !== String(oldRecord.id)));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [fetchVehicles]);

    const addVehicle = async (vehicleData) => {
        try {
            // Optimistic Update
            setVehicles(prev => [vehicleData, ...prev]);

            // Get current user's location for RLS
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            const locationId = currentUser?.assignedLocationId || 'LOC001';

            const dbRecord = {
                id: vehicleData.id,
                status: vehicleData.status,
                vehicle_number: vehicleData.vehicleNo || vehicleData.vehicleNumber || 'UNKNOWN',
                type: vehicleData.type || 'MATERIAL',
                location_id: locationId,
                data: vehicleData,
                logs: vehicleData.logs || []
            };

            if (navigator.onLine) {
                // Online: Save to Supabase directly
                const { error } = await supabase.from('vehicles').insert(dbRecord);
                if (error) throw error;

                // Cache in IndexedDB
                await vehiclesDB.put({ ...vehicleData, synced: true });
            } else {
                // Offline: Save to IndexedDB and queue for sync
                console.log('📴 Offline - queueing vehicle insert');
                await vehiclesDB.put({ ...vehicleData, synced: false });
                await syncManager.queueOperation({
                    action: 'INSERT',
                    table: 'vehicles',
                    data: dbRecord
                });
            }
        } catch (err) {
            console.error("Failed to add vehicle", err);
            alert("Failed to save vehicle: " + err.message);
            fetchVehicles();
        }
    };

    const updateVehicle = async (id, updates, logEntry = null) => {
        try {
            const currentVehicle = vehicles.find(v => v.id === id);
            if (!currentVehicle) return;

            const updatedVehicle = { ...currentVehicle, ...updates };
            if (logEntry) {
                updatedVehicle.logs = [...(updatedVehicle.logs || []), logEntry];
            }

            // Optimistic Update
            setVehicles(prev => prev.map(v => v.id === id ? updatedVehicle : v));

            const payload = {
                status: updatedVehicle.status,
                vehicle_number: updatedVehicle.vehicleNo || updatedVehicle.vehicleNumber || 'UNKNOWN',
                data: updatedVehicle,
                updated_at: new Date().toISOString()
            };

            if (logEntry) {
                payload.logs = updatedVehicle.logs;
            }

            if (navigator.onLine) {
                // Online: Update Supabase
                const { error } = await supabase.from('vehicles').update(payload).eq('id', id);
                if (error) throw error;

                // Update IndexedDB
                await vehiclesDB.put({ ...updatedVehicle, synced: true });
            } else {
                // Offline: Update IndexedDB and queue
                console.log('📴 Offline - queueing vehicle update');
                await vehiclesDB.put({ ...updatedVehicle, synced: false });
                await syncManager.queueOperation({
                    action: 'UPDATE',
                    table: 'vehicles',
                    data: { ...payload, id }
                });
            }

        } catch (err) {
            console.error("Failed to update vehicle", err);
            alert("Failed to update vehicle: " + err.message);
            fetchVehicles();
        }
    };

    const getVehicleById = (id) => vehicles.find(v => v.id === id);

    // Temporary: Delete Vehicle (for cleanup)
    const deleteVehicle = async (id) => {
        if (!window.confirm("Delete this vehicle permanently?")) return;
        setVehicles(prev => prev.filter(v => v.id !== id));
        await supabase.from('vehicles').delete().eq('id', id);
    };

    const value = {
        vehicles,
        loading,
        error,
        addVehicle,
        updateVehicle,
        getVehicleById,
        deleteVehicle,
        refreshVehicles: fetchVehicles
    };

    return (
        <VehicleContext.Provider value={value}>
            {children}
        </VehicleContext.Provider>
    );
};
