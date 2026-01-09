import React from 'react';
import { Trash2 } from 'lucide-react';

const ClearDataButton = () => {
    const handleClearData = () => {
        if (window.confirm("WARNING: This will delete all TEST DATA (Sales Orders, Vehicles, Production Plans, etc.).\n\nReal FG Stock Data and Master Data will be PRESERVED.\n\nAre you sure you want to proceed?")) {
            // Keys to clear
            const keysToRemove = [
                'production_lots',
                'lot_sequences',
                'sales_orders_data',
                'sales_vehicles_data',
                'sales_dispatch_plan',
                'vehicles', // Main vehicle registry
                'warehouse_bays_v2', // Will re-init from MOCK_BAYS (Structure) but empty status
                'production_bins_v2',
                'production_mrs',
                'inward_vehicles_mock'
            ];

            keysToRemove.forEach(key => localStorage.removeItem(key));

            alert("Test data cleared successfully! The application will now reload.");
            window.location.reload();
        }
    };

    return (
        <button
            onClick={handleClearData}
            className="w-full mt-2 flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-red-500 hover:text-red-100 hover:bg-red-900/30 rounded-lg transition-colors border border-red-900/20"
        >
            <Trash2 size={14} /> Clear Test Data
        </button>
    );
};

export default ClearDataButton;
