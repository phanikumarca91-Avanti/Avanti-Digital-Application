import React, { useState } from 'react';
import { Database, Download, Upload, AlertTriangle, CheckCircle, X } from 'lucide-react';

const BackupRestoreControl = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [restoreStatus, setRestoreStatus] = useState(null); // 'success', 'error', null

    const getAllData = () => {
        const data = {};
        // List all known keys used in the app
        const keys = [
            'vehicles',
            'warehouse_bays_v5',
            'production_bins_v2',
            'production_mrs',
            'inward_vehicles_mock',
            'master_data_changes_v1',
            'production_lots',
            'lot_sequences',
            'sales_orders_data',
            'sales_vehicles_data',
            'sales_dispatch_plan',
            'org_location',
            'org_unit',
            'org_division'
        ];

        keys.forEach(key => {
            const val = localStorage.getItem(key);
            if (val) {
                try {
                    data[key] = JSON.parse(val);
                } catch (e) {
                    console.error(`Failed to parse key ${key}`, e);
                    data[key] = val;
                }
            }
        });

        // Add metadata
        data._meta = {
            version: '1.0',
            exportedAt: new Date().toISOString(),
            app: 'Avanti Material Inward'
        };

        return data;
    };

    const handleBackup = () => {
        const data = getAllData();
        const jsonString = JSON.stringify(data, null, 2);
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `avanti_backup_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleRestore = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = JSON.parse(event.target.result);

                if (!data._meta || data._meta.app !== 'Avanti Material Inward') {
                    throw new Error("Invalid backup file format");
                }

                if (!confirm("WARNING: This will OVERWRITE all current data. This action cannot be undone. Are you sure?")) {
                    return;
                }

                // Restore keys
                Object.keys(data).forEach(key => {
                    if (key !== '_meta') {
                        localStorage.setItem(key, JSON.stringify(data[key]));
                    }
                });

                setRestoreStatus('success');
                setTimeout(() => window.location.reload(), 2000); // Reload to reflect changes
            } catch (error) {
                console.error("Restore failed:", error);
                setRestoreStatus('error');
            }
        };
        reader.readAsText(file);
        e.target.value = null; // Reset input
    };

    return (
        <>
            <button
                onClick={() => setIsOpen(true)}
                className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors title='Backup & Restore'"
            >
                <Database size={20} />
            </button>

            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden border border-slate-100">
                        <div className="bg-slate-50 p-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <Database size={18} className="text-brand-600" />
                                System Backup & Restore
                            </h3>
                            <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                <h4 className="font-bold text-blue-800 text-sm mb-1 flex items-center gap-2">
                                    <Download size={16} /> Export Data
                                </h4>
                                <p className="text-xs text-blue-600 mb-3">
                                    Download a full backup of Vehicles, Master Data, Stock, and Logs to your computer.
                                </p>
                                <button
                                    onClick={handleBackup}
                                    className="w-full py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold text-sm shadow-sm transition-colors"
                                >
                                    Download Backup (.json)
                                </button>
                            </div>

                            <div className="bg-red-50 border border-red-100 rounded-xl p-4">
                                <h4 className="font-bold text-red-800 text-sm mb-1 flex items-center gap-2">
                                    <Upload size={16} /> Restore Data
                                </h4>
                                <p className="text-xs text-red-600 mb-3">
                                    Upload a backup file to restore the system.
                                    <span className="font-bold"> WARNING: This overwrites current data!</span>
                                </p>
                                <label className="w-full py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-bold text-sm shadow-sm transition-colors flex items-center justify-center gap-2 cursor-pointer">
                                    Select Backup File
                                    <input
                                        type="file"
                                        accept=".json"
                                        className="hidden"
                                        onChange={handleRestore}
                                    />
                                </label>
                            </div>

                            {restoreStatus === 'success' && (
                                <div className="p-3 bg-green-100 text-green-700 rounded-lg text-sm font-bold flex items-center gap-2">
                                    <CheckCircle size={16} /> Restore Successful! Reloading...
                                </div>
                            )}

                            {restoreStatus === 'error' && (
                                <div className="p-3 bg-red-100 text-red-700 rounded-lg text-sm font-bold flex items-center gap-2">
                                    <AlertTriangle size={16} /> Restore Failed. Invalid file.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
};

export default BackupRestoreControl;
