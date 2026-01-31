import React, { useState } from 'react';
import { CloudUpload, Check, AlertTriangle, Loader, Database } from 'lucide-react';
import { MASTER_DATA } from '../../data/masterData';
import { supabase } from '../../lib/supabase';
import { useOrganization } from '../../contexts/OrganizationContext';

const DataMigration = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [status, setStatus] = useState('IDLE'); // IDLE, MIGRATING, SUCCESS, ERROR
    const [logs, setLogs] = useState([]);
    const [progress, setProgress] = useState(0);

    const addLog = (msg) => setLogs(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);

    const handleMigrate = async () => {
        if (!window.confirm("Are you sure you want to upload all local data to the Cloud? This will overwrite any existing cloud data.")) return;

        setStatus('MIGRATING');
        setLogs([]);
        setProgress(0);
        addLog("Starting Migration...");

        try {
            // 1. MIGRATE VEHICLES
            addLog("Reading Vehicles from LocalStorage...");
            const vehiclesStr = localStorage.getItem('vehicles');
            if (vehiclesStr) {
                const vehicles = JSON.parse(vehiclesStr);
                addLog(`Found ${vehicles.length} vehicles.`);

                const vehicleRows = vehicles.map(v => {
                    // Helper to parsing timestamps safely
                    let createdAt = new Date().toISOString();

                    try {
                        // Try to construct valid date from date + time
                        const dateStr = v.date || v.formData?.date || new Date().toISOString().split('T')[0];
                        const timeStr = v.inTime || '00:00';

                        // If inTime is already full ISO, use it
                        if (timeStr.includes('T')) {
                            createdAt = timeStr;
                        } else {
                            // Combine Date and Time
                            createdAt = new Date(`${dateStr}T${timeStr}:00`).toISOString();
                        }
                    } catch (e) {
                        console.warn("Date parsing failed for vehicle", v.id, e);
                        createdAt = new Date().toISOString(); // Fallback
                    }

                    return {
                        id: v.id,
                        created_at: createdAt,
                        status: v.status,
                        vehicle_number: v.vehicleNumber || v.formData?.vehicleNumber || 'UNKNOWN',
                        type: v.type || 'MATERIAL',
                        data: v,
                        logs: v.logs || []
                    };
                });

                const { error } = await supabase.from('vehicles').upsert(vehicleRows);
                if (error) throw new Error(`Vehicle Migration Failed: ${error.message}`);
                addLog("✅ Vehicles migrated successfully.");
            } else {
                addLog("⚠️ No vehicles found in LocalStorage.");
            }
            setProgress(25);

            // 2. MIGRATE SUPPLIERS (If stored in LS, mostly they are in code files, but check LS)
            // Suppliers data is often in code, but if we have LS overrides
            addLog("Checking Supplier Data...");
            // Note: In this app, suppliers might be in 'master_data_changes_v1' or code. 
            // We will migrate what we find in specific keys if any.

            // 3. MIGRATE WAREHOUSE STOCK
            addLog("Migrating Warehouse Stock...");
            const bayData = localStorage.getItem('warehouse_bays_v5');
            if (bayData) {
                const { error } = await supabase.from('warehouse_stock').upsert({
                    id: 'warehouse_bays_v5',
                    data: JSON.parse(bayData)
                });
                if (error) throw error;
                addLog("✅ Warehouse Stock migrated.");
            }

            const binData = localStorage.getItem('production_bins_v2');
            if (binData) {
                await supabase.from('warehouse_stock').upsert({
                    id: 'production_bins_v2',
                    data: JSON.parse(binData)
                });
            }
            setProgress(50);

            // 4. MIGRATE MASTER DATA & SETTINGS
            addLog("Migrating Master Data & Settings...");

            // 4a. Base Master Data (Chunks)
            addLog("Uploading Base Master Data (in chunks)...");
            const categories = Object.keys(MASTER_DATA);
            for (const cat of categories) {
                const chunkKey = `master_data_base_v1_${cat}`;
                try {
                    const { error: chunkError } = await supabase.from('master_data').upsert({
                        key: chunkKey,
                        value: MASTER_DATA[cat]
                    });
                    if (chunkError) addLog(`❌ Failed to upload ${cat}: ${chunkError.message}`);
                    else addLog(`✅ Uploaded Base ${cat}`);
                } catch (e) {
                    addLog(`❌ Exception uploading ${cat}: ${e.message}`);
                }
            }

            const keysToMigrate = {
                'production_mrs': 'warehouse_stock', // MRs go to stock table or master data? Let's put in master_data for now or stock. Schema said master_data.
                'inward_vehicles_mock': 'master_data',
                'master_data_changes_v1': 'master_data',
                'production_lots': 'master_data',
                'lot_sequences': 'master_data',
                'sales_orders_data': 'master_data',
                'sales_vehicles_data': 'master_data',
                'sales_dispatch_plan': 'master_data',
                'org_location': 'settings',
                'org_unit': 'settings',
                'org_division': 'settings'
            };

            for (const [key, table] of Object.entries(keysToMigrate)) {
                const val = localStorage.getItem(key);
                if (val) {
                    let payload = {};
                    if (table === 'warehouse_stock') {
                        payload = { id: key, data: JSON.parse(val) };
                    } else {
                        // master_data and settings use 'key' and 'value'
                        payload = { key: key, value: JSON.parse(val) };
                    }

                    const { error } = await supabase.from(table).upsert(payload);

                    if (error) addLog(`❌ Failed to migrate ${key}: ${error.message}`);
                    else addLog(`✅ Migrated ${key}`);
                }
            }
            setProgress(100);
            setStatus('SUCCESS');
            addLog("🎉 MIGRATION COMPLETE!");

        } catch (err) {
            console.error(err);
            setStatus('ERROR');
            addLog(`🔥 CRITICAL ERROR: ${err.message}`);
        }
    };

    if (!isOpen) {
        return (
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 text-blue-600 hover:bg-blue-50 rounded-full transition-colors relative group"
                title="Migrate to Cloud"
            >
                <CloudUpload size={20} />
                <span className="absolute hidden group-hover:block w-32 bg-slate-800 text-white text-xs px-2 py-1 rounded -bottom-8 -left-10 z-50 text-center">
                    Upload to Cloud
                </span>
            </button>
        );
    }

    return (
        <div className="fixed inset-0 bg-black/50 z-[9999] flex items-center justify-center backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl p-6 w-[500px] max-w-full">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <Database className="text-blue-600" />
                        Database Migration
                    </h2>
                    <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">✕</button>
                </div>

                <div className="mb-6 space-y-4">
                    <div className={`p-4 rounded-lg border ${status === 'SUCCESS' ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                        <p className="text-sm text-slate-700">
                            This tool will read all data from your local browser storage and upload it to the Supabase Cloud Database.
                        </p>
                        {status === 'SUCCESS' && (
                            <p className="mt-2 font-bold text-green-700 flex items-center gap-2">
                                <Check size={16} /> Migration Successful!
                            </p>
                        )}
                    </div>

                    {/* Logs Area */}
                    <div className="bg-slate-900 text-green-400 font-mono text-xs p-4 rounded-lg h-64 overflow-y-auto">
                        {logs.length === 0 ? <span className="text-slate-500">// Ready to start...</span> : logs.map((l, i) => (
                            <div key={i} className="mb-1">{l}</div>
                        ))}
                    </div>

                    {/* Progress Bar */}
                    {status === 'MIGRATING' && (
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                            <div className="bg-blue-600 h-2.5 rounded-full transition-all duration-300" style={{ width: `${progress}%` }}></div>
                        </div>
                    )}
                </div>

                <div className="flex justify-end gap-3">
                    <button
                        onClick={() => setIsOpen(false)}
                        className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
                    >
                        Close
                    </button>
                    <button
                        onClick={handleMigrate}
                        disabled={status === 'MIGRATING'}
                        className={`px-6 py-2 rounded-lg font-medium flex items-center gap-2 ${status === 'MIGRATING'
                            ? 'bg-slate-100 text-slate-400 cursor-not-allowed'
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                            }`}
                    >
                        {status === 'MIGRATING' ? <Loader size={18} className="animate-spin" /> : <CloudUpload size={18} />}
                        {status === 'MIGRATING' ? 'Migrating...' : 'Start Migration'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default DataMigration;
