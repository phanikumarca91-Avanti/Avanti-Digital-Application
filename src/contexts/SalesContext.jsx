import React, { createContext, useContext, useState, useEffect } from 'react';
import { SALES_ORDERS } from '../data/salesData';
import { VEHICLE_DATA } from '../data/vehicleData';

const SalesContext = createContext();

export const useSales = () => {
    const context = useContext(SalesContext);
    if (!context) {
        throw new Error('useSales must be used within a SalesProvider');
    }
    return context;
};

export const SalesProvider = ({ children }) => {
    // Orders State
    const [orders, setOrders] = useState(() => {
        try {
            const saved = localStorage.getItem('sales_orders_data');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to load orders", e);
            return [];
        }
    });

    // Vehicles State
    const [vehicles, setVehicles] = useState(() => {
        try {
            const saved = localStorage.getItem('sales_vehicles_data');
            return saved ? JSON.parse(saved) : VEHICLE_DATA;
        } catch (e) {
            console.error("Failed to load vehicles", e);
            return VEHICLE_DATA;
        }
    });

    // Planned Vehicles (Dispatch Plan) State
    const [plannedVehicles, setPlannedVehicles] = useState(() => {
        try {
            const saved = localStorage.getItem('sales_dispatch_plan');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to load dispatch plan", e);
            return [];
        }
    });

    // Persistence Effects
    useEffect(() => {
        localStorage.setItem('sales_orders_data', JSON.stringify(orders));
    }, [orders]);

    useEffect(() => {
        localStorage.setItem('sales_vehicles_data', JSON.stringify(vehicles));
    }, [vehicles]);

    useEffect(() => {
        localStorage.setItem('sales_dispatch_plan', JSON.stringify(plannedVehicles));
    }, [plannedVehicles]);

    const value = {
        orders,
        setOrders,
        vehicles,
        setVehicles,
        plannedVehicles,
        setPlannedVehicles
    };

    return (
        <SalesContext.Provider value={value}>
            {children}
        </SalesContext.Provider>
    );
};
