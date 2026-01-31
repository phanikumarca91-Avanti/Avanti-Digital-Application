
import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { VEHICLE_DATA } from '../data/vehicleData';
import { salesDB } from '../lib/indexedDB';
import { syncManager } from '../lib/syncManager';

const SalesContext = createContext();

export const useSales = () => {
    const context = useContext(SalesContext);
    if (!context) {
        throw new Error('useSales must be used within a SalesProvider');
    }
    return context;
};

export const SalesProvider = ({ children }) => {
    // Orders State (Synced with Supabase 'sales_orders')
    const [orders, setOrders] = useState([]);
    const [error, setError] = useState(null);
    const [isLoading, setIsLoading] = useState(false);

    // Invoices State (Synced with Supabase 'sales_invoices')
    const [invoices, setInvoices] = useState([]);

    // Vehicles (Fleet) State - Kept local or could be moved to DB later
    // These are "Internal Fleet" available for dispatch
    const [vehicles, setVehicles] = useState(() => {
        try {
            const saved = localStorage.getItem('sales_vehicles_data');
            return saved ? JSON.parse(saved) : VEHICLE_DATA;
        } catch (e) {
            return VEHICLE_DATA;
        }
    });

    // Planned Vehicles State (Synced via 'sales_dispatch_assignments')
    const [dispatchAssignments, setDispatchAssignments] = useState([]);

    // --- Supabase Sync Logic ---

    // 1. Fetch & Subscribe to Sales Orders
    useEffect(() => {
        refreshOrders(false); // Initial Fetch (Silent)

        const subscription = supabase
            .channel('sales_orders_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_orders' }, (payload) => {
                handleOrderRealtimeUpdate(payload);
            })
            .subscribe((status) => {
                if (status === 'CHANNEL_ERROR') {
                    setError('Realtime Connection Error');
                }
            });

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const refreshOrders = async (manual = false) => {
        setIsLoading(true);
        setError(null);
        const { data, error: dbError } = await supabase
            .from('sales_orders')
            .select('*')
            .order('created_at', { ascending: false });

        if (dbError) {
            console.error("Error fetching sales orders:", dbError);
            setError(dbError.message);
            if (manual) alert(`Sync Error: ${dbError.message}`);
        } else {
            // Flatten JSONB data into the object for easier consumption
            const formatted = data.map(row => ({
                id: row.id,
                ...row.data, // Spread JSON content (customer, qty, etc)
                status: row.status // Ensure root status overrides JSON
            }));
            setOrders(formatted);
            if (manual) alert(`Sync Complete! Found ${formatted.length} orders from cloud.`);
        }
        setIsLoading(false);
    };

    const handleOrderRealtimeUpdate = (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        // Handle deletion safely
        if (eventType === 'DELETE' && oldRecord) {
            setOrders(prev => prev.filter(o => o.id !== oldRecord.id));
            return;
        }

        // Handle Insert/Update
        if (newRecord) {
            const formatted = { id: newRecord.id, ...newRecord.data, status: newRecord.status };
            if (eventType === 'INSERT') {
                setOrders(prev => [formatted, ...prev]);
            } else if (eventType === 'UPDATE') {
                setOrders(prev => prev.map(o => o.id === newRecord.id ? formatted : o));
            }
        }
    };

    // 2. Fetch & Subscribe to Dispatch Assignments
    useEffect(() => {
        fetchDispatchAssignments();

        const subscription = supabase
            .channel('sales_dispatch_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_dispatch_assignments' }, (payload) => {
                handleDispatchRealtimeUpdate(payload);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchDispatchAssignments = async () => {
        const { data, error } = await supabase.from('sales_dispatch_assignments').select('*');
        if (error) console.error("Error fetching dispatch plan:", error);
        else {
            const formatted = data.map(row => ({
                ...row.data, // Spread first to ensure DB columns (stage) take precedence
                id: row.id,
                vehicleNo: row.vehicle_no,
                stage: row.stage
            }));
            setDispatchAssignments(formatted);
        }
    };

    const handleDispatchRealtimeUpdate = (payload) => {
        const { eventType, new: newRecord, old: oldRecord } = payload;

        if (eventType === 'DELETE' && oldRecord) {
            setDispatchAssignments(prev => prev.filter(d => d.id !== oldRecord.id));
            return;
        }

        if (newRecord) {
            const formatted = { ...newRecord.data, id: newRecord.id, vehicleNo: newRecord.vehicle_no, stage: newRecord.stage };
            if (eventType === 'INSERT') {
                setDispatchAssignments(prev => [...prev, formatted]);
            } else if (eventType === 'UPDATE') {
                setDispatchAssignments(prev => prev.map(d => d.id === newRecord.id ? formatted : d));
            }
        }
    };

    // 3. Computed Planned Vehicles (Join Assignments + Orders)
    // This replaces the local 'plannedVehicles' state and ensures single source of truth for assignments
    const plannedVehicles = dispatchAssignments.map(vehicle => {
        // Find orders assigned to this vehicle
        // We rely on order.assignedVehicleId being set in the order data
        const assignedOrders = orders.filter(o => o.assignedVehicleId === vehicle.id);
        return {
            ...vehicle,
            assignedOrders: assignedOrders || []
        };
    });


    // 4. Fetch & Subscribe to Sales Invoices
    useEffect(() => {
        fetchInvoices();

        const subscription = supabase
            .channel('sales_invoices_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'sales_invoices' }, (payload) => {
                handleInvoiceRealtimeUpdate(payload);
            })
            .subscribe();

        return () => {
            supabase.removeChannel(subscription);
        };
    }, []);

    const fetchInvoices = async () => {
        const { data, error } = await supabase.from('sales_invoices').select('*');
        if (error) console.error("Error fetching invoices:", error);
        else {
            const formatted = data.map(row => ({
                id: row.id,
                ...row.data,
                invoiceNumber: row.invoice_number,
                status: row.status
            }));
            setInvoices(formatted);
        }
    };

    const handleInvoiceRealtimeUpdate = (payload) => {
        const { eventType, new: newRecord } = payload;
        if (eventType === 'INSERT' && newRecord) {
            const formatted = { id: newRecord.id, ...newRecord.data, invoiceNumber: newRecord.invoice_number, status: newRecord.status };
            setInvoices(prev => [...prev, formatted]);
        }
    };


    // --- Actions ---

    const addOrder = async (orderData) => {
        const dbRecord = {
            id: orderData.id,
            customer_name: orderData.customer,
            order_date: orderData.date,
            status: 'PENDING',
            data: orderData
        };

        if (navigator.onLine) {
            const { error } = await supabase.from('sales_orders').insert([dbRecord]);
            if (error) throw error;
        } else {
            console.log('📴 Offline - queueing sales order');
            await syncManager.queueOperation({ action: 'INSERT', table: 'sales_orders', data: dbRecord });
        }
    };

    const updateOrderStatus = async (id, status, extraData = {}) => {
        const currentOrder = orders.find(o => o.id === id);
        if (!currentOrder) return;

        const { error } = await supabase
            .from('sales_orders')
            .update({
                status: status,
                data: { ...currentOrder, ...extraData, status }
            })
            .eq('id', id);

        if (error) console.error("Error updating order:", error);
    };

    const addToDispatchPlan = async (vehicle) => {
        const dbRecord = {
            id: vehicle.id,
            vehicle_no: vehicle.vehicleNo,
            stage: 'DRAFT',
            data: vehicle
        };

        if (navigator.onLine) {
            const { error } = await supabase.from('sales_dispatch_assignments').upsert([dbRecord]);
            if (error) console.error("Error adding vehicle to plan:", error);
        } else {
            console.log('📴 Offline - queueing dispatch assignment');
            await syncManager.queueOperation({ action: 'UPSERT', table: 'sales_dispatch_assignments', data: dbRecord });
        }
    };

    const updateDispatchPlan = async (vehicleId, updates) => {
        const current = dispatchAssignments.find(d => d.id === vehicleId);
        if (!current) return;

        const newData = { ...current, ...updates };
        const { stage, vehicleNo, ...restData } = newData; // Exclude top-level cols from data blob if duplicative, but usually fine.

        const dbRecord = {
            stage: updates.stage !== undefined ? updates.stage : current.stage,
            data: newData
        };

        const { error } = await supabase
            .from('sales_dispatch_assignments')
            .update(dbRecord)
            .eq('id', vehicleId);

        if (error) console.error("Error updating dispatch plan:", error);
    };

    const removeFromDispatchPlan = async (vehicleId) => {
        // Also should unassign orders? 
        // DispatchPlanner usually handles unassigning orders separately or we should do it here.
        // Let's assume the UI unassigns orders first OR we unassign them here for safety.

        // Unassign orders first (SAFETY)
        const ordersToUnassign = orders.filter(o => o.assignedVehicleId === vehicleId);
        for (const order of ordersToUnassign) {
            await updateOrderStatus(order.id, 'PENDING', { assignedVehicleId: null });
        }

        const { error } = await supabase.from('sales_dispatch_assignments').delete().eq('id', vehicleId);
        if (error) console.error("Error removing vehicle from plan:", error);
    };

    const generateInvoice = async (invoiceData) => {
        const dbRecord = {
            id: `INV-${Date.now()}`,
            invoice_number: invoiceData.invoiceNo || `INV-${Date.now()}`,
            customer_name: invoiceData.customer,
            invoice_date: invoiceData.date,
            total_amount: invoiceData.totalAmount || 0,
            status: 'GENERATED',
            data: invoiceData
        };

        const { error } = await supabase.from('sales_invoices').insert([dbRecord]);
        if (error) throw error;
    };

    // Legacy Vehicle LocalStorage (Intra-Fleet)
    useEffect(() => {
        localStorage.setItem('sales_vehicles_data', JSON.stringify(vehicles));
    }, [vehicles]);


    const value = {
        orders,
        setOrders,
        addOrder,
        updateOrderStatus,
        refreshOrders,
        error,

        invoices,
        generateInvoice,

        vehicles,
        setVehicles,

        plannedVehicles,
        addToDispatchPlan,
        updateDispatchPlan,
        removeFromDispatchPlan
    };

    return (
        <SalesContext.Provider value={value}>
            {children}
        </SalesContext.Provider>
    );
};
