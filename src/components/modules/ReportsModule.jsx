import React, { useState } from 'react';
import { FileText, Download, Filter, Search, ClipboardList, Package, Truck, ChevronDown, ChevronRight, Edit2, AlertCircle } from 'lucide-react';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { useProduction } from '../../contexts/ProductionContext';
import { useVehicles } from '../../contexts/VehicleContext';
import TraceabilityReport from '../reports/TraceabilityReport';
import { calculateBags } from '../../utils/bagCalculator';

const StockAdjustmentModal = ({ isOpen, onClose, bay, onConfirm }) => {
    const [actualQty, setActualQty] = useState(bay ? bay.qty : '');
    const [reason, setReason] = useState('');

    if (!isOpen || !bay) return null;

    const currentBags = bay.qty ? calculateBags(bay.qty, bay.material, bay.grade) : 0;
    const newBags = actualQty ? calculateBags(actualQty, bay.material, bay.grade) : 0;
    const diff = parseFloat(actualQty || 0) - parseFloat(bay.qty || 0);

    const handleSubmit = () => {
        onConfirm(bay.id, actualQty, reason);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Edit2 className="text-brand-600" size={18} />
                        Adjust Stock: {bay.id}
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <ChevronDown size={20} className="rotate-180" />
                    </button>
                </div>
                <div className="p-6 space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                        <div className="p-3 bg-slate-50 rounded border">
                            <label className="block text-xs text-slate-500 font-bold uppercase">System Qty</label>
                            <div className="font-mono font-bold text-slate-700">{bay.qty} MT</div>
                            <div className="text-xs text-slate-400">{currentBags} Bags</div>
                        </div>
                        <div className="p-3 bg-blue-50 rounded border border-blue-100">
                            <label className="block text-xs text-blue-500 font-bold uppercase">Variance</label>
                            <div className={`font-mono font-bold ${diff !== 0 ? 'text-blue-700' : 'text-slate-400'}`}>
                                {diff > 0 ? '+' : ''}{diff.toFixed(3)} MT
                            </div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Actual Quantity (MT)</label>
                        <input
                            type="number"
                            step="0.001"
                            value={actualQty}
                            onChange={(e) => setActualQty(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 font-mono font-bold text-lg"
                        />
                        <p className="text-xs text-right text-slate-500 mt-1">
                            Calculated: {newBags} Bags (based on product)
                        </p>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Reason for Adjustment</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 text-sm"
                            placeholder="e.g. Physical stock take discrepancy"
                            rows="2"
                        />
                    </div>
                </div>
                <div className="p-4 bg-slate-50 border-t flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg">Cancel</button>
                    <button
                        onClick={handleSubmit}
                        className="px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700 font-medium"
                    >
                        Confirm Adjustment
                    </button>
                </div>
            </div>
        </div>
    );
};

const ReportsModule = () => {
    const [activeTab, setActiveTab] = useState('MR_LOGS');
    const [expandedRow, setExpandedRow] = useState(null);
    const { getAllMRs, bays, updateBinStock } = useWarehouse();
    const { lots } = useProduction();
    const { vehicles } = useVehicles();
    const [searchTerm, setSearchTerm] = useState('');
    const [stockFilterType, setStockFilterType] = useState('ALL'); // ALL, RM, FG
    const [stockFilterStatus, setStockFilterStatus] = useState('ALL'); // ALL, OCCUPIED, EMPTY
    const [adjustmentBay, setAdjustmentBay] = useState(null);

    const handleStockAdjustment = (bayId, newQty, reason) => {
        // Find the bay to get material info if needed, though we mostly need ID and Qty
        const bay = bays.find(b => b.id === bayId);
        if (bay) {
            updateBinStock(bayId, newQty, bay.material || 'Manual Adjustment', 'SET');
            console.log(`Adjusted stock for ${bayId}: ${newQty} MT. Reason: ${reason}`);
        }
    };

    // Fetch Data
    const mrLogs = getAllMRs ? getAllMRs() : [];
    const lotLogs = lots || [];
    const inwardLogs = vehicles || [];
    const stockLogs = bays || [];

    // Filter Logic
    const filteredMRs = mrLogs.filter(mr =>
        String(mr.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(mr.status || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredLots = lotLogs.filter(lot =>
        String(lot.lotNumber || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(lot.fgName || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    const filteredInward = inwardLogs.filter(v =>
        String(v.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(v.vehicleNo || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        String(v.supplier || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    // Flatten Stock Logs: Split bays with multiple lots into separate rows
    const allStockRows = stockLogs.flatMap(bay => {
        if (bay.status === 'OCCUPIED' && bay.lots && bay.lots.length > 0) {
            return bay.lots.map((lot, index) => ({
                uniqueKey: `${bay.id}-${lot.lotNumber}-${index}`,
                id: bay.id,
                unit: bay.unit,
                material: lot.productName, // Use specific product name
                grade: lot.grade,         // Use specific grade
                displayMaterial: lot.grade || lot.productName, // Display string
                batchId: lot.lotNumber,
                qty: lot.qty,
                // Recalculate bags for specific lot using its Qty and Grade
                bags: calculateBags(lot.qty, lot.productName, lot.grade),
                shift: lot.shift,
                status: bay.status,
                originalBay: bay,
                isSplit: true
            }));
        }
        // Default Logic for Single/Empty Bays
        return [{
            uniqueKey: bay.id,
            id: bay.id,
            unit: bay.unit,
            material: bay.material,
            displayMaterial: bay.material, // Already joined in Context
            batchId: bay.batchId,
            qty: bay.qty,
            bags: bay.totalBags !== undefined ? bay.totalBags : (bay.qty ? calculateBags(bay.qty, bay.material, bay.grade) : 0),
            shift: bay.shift,
            status: bay.status,
            originalBay: bay,
            isSplit: false
        }];
    });

    const filteredStock = allStockRows
        .filter(row => {
            // Search Text
            const matchesSearch = String(row.id).toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(row.displayMaterial || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                String(row.batchId || '').toLowerCase().includes(searchTerm.toLowerCase());

            // Type Filter
            const matchesType = stockFilterType === 'ALL' ||
                (stockFilterType === 'RM' && row.id.startsWith('RM')) ||
                (stockFilterType === 'FG' && row.id.startsWith('FG'));

            // Status Filter
            const matchesStatus = stockFilterStatus === 'ALL' || row.status === stockFilterStatus;

            return matchesSearch && matchesType && matchesStatus;
        })
        .sort((a, b) => {
            // Sort Occupied first
            if (a.status === 'OCCUPIED' && b.status !== 'OCCUPIED') return -1;
            if (a.status !== 'OCCUPIED' && b.status === 'OCCUPIED') return 1;
            // Then by ID
            return a.id.localeCompare(b.id);
        });

    const handleExport = () => {
        let dataToExport = [];
        let headers = [];
        let filename = `report_${activeTab.toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;

        if (activeTab === 'WAREHOUSE_STOCK') {
            headers = ['Bay ID', 'Unit', 'Product/Material', 'Lot/Batch No', 'Qty (MT)', 'Bags', 'Shift', 'Status', 'Last Updated'];
            dataToExport = filteredStock.map(bay => [
                bay.id,
                bay.unit || '-',
                bay.material || '-',
                // Deduplicate lot numbers in export
                bay.batchId ? [...new Set(bay.batchId.split(', '))].join(', ') : '-',
                bay.qty ? parseFloat(bay.qty).toFixed(3) : 0,
                // Use pre-calculated totalBags if available (handles mixed lots), otherwise fallback to recalculation
                bay.totalBags !== undefined ? bay.totalBags : (bay.qty ? calculateBags(bay.qty, bay.material, bay.grade) : 0),
                bay.shift || '-',
                bay.status,
                bay.lastUpdated ? new Date(bay.lastUpdated).toLocaleString() : '-'
            ]);
        } else if (activeTab === 'MR_LOGS') {
            headers = ['MR ID', 'Date', 'Unit', 'Items Count', 'Status'];
            dataToExport = filteredMRs.map(mr => [
                mr.id,
                new Date(mr.createdAt).toLocaleDateString(),
                mr.unit,
                mr.receivedItems ? (Array.isArray(mr.receivedItems) ? mr.receivedItems.length : (mr.receivedItems.lots ? mr.receivedItems.lots.length : 0)) : 0,
                mr.status
            ]);
        } else if (activeTab === 'FG_LOGS') {
            headers = ['Lot Number', 'Date', 'Unit', 'FG Name', 'Status'];
            dataToExport = filteredLots.map(lot => [
                lot.lotNumber,
                new Date(lot.createdAt).toLocaleDateString(),
                lot.unit,
                lot.fgName,
                lot.status
            ]);
        } else if (activeTab === 'INWARD_LOGS') {
            headers = ['Unique ID', 'Date', 'Vehicle No', 'Supplier', 'Material', 'Status'];
            dataToExport = filteredInward.map(v => [
                v.uniqueID || v.id,
                v.entryTime ? new Date(v.entryTime).toLocaleDateString() : (v.date || '-'),
                v.vehicleNo,
                v.supplier || '-',
                v.material || '-',
                v.status
            ]);
        } else {
            alert('Export not supported for this tab yet.');
            return;
        }

        const csvContent = [
            headers.join(','),
            ...dataToExport.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))
        ].join('\n');

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        if (link.download !== undefined) {
            const url = URL.createObjectURL(blob);
            link.setAttribute('href', url);
            link.setAttribute('download', filename);
            link.style.visibility = 'hidden';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Reports & Audit Logs</h1>
                    <p className="text-slate-500">View System Logs and Transaction History</p>
                </div>
                <div className="flex gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Search logs..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="pl-10 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                        />
                    </div>
                    <button className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50">
                        <Filter size={18} /> Filter
                    </button>
                    <button
                        onClick={handleExport}
                        className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg hover:bg-brand-700"
                    >
                        <Download size={18} /> Export CSV
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 font-bold overflow-x-auto">
                <button
                    onClick={() => setActiveTab('MR_LOGS')}
                    className={`px-4 py-3 text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'MR_LOGS' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <ClipboardList size={18} /> MR Logs
                </button>
                <button
                    onClick={() => setActiveTab('FG_LOGS')}
                    className={`px-4 py-3 text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'FG_LOGS' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Package size={18} /> FG Lot Logs
                </button>
                <button
                    onClick={() => setActiveTab('WAREHOUSE_STOCK')}
                    className={`px-4 py-3 text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'WAREHOUSE_STOCK' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Package size={18} /> Warehouse Stock
                </button>
                <button
                    onClick={() => setActiveTab('INWARD_LOGS')}
                    className={`px-4 py-3 text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'INWARD_LOGS' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Truck size={18} /> Inward Logs
                </button>
                <button
                    onClick={() => setActiveTab('TRACEABILITY')}
                    className={`px-4 py-3 text-sm flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'TRACEABILITY' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Search size={18} /> Traceability
                </button>
            </div>

            {/* Extra Filters for Stock Tab */}
            {activeTab === 'WAREHOUSE_STOCK' && (
                <div className="flex gap-4 p-4 bg-slate-50 rounded-lg border border-slate-200 items-center">
                    <span className="text-sm font-bold text-slate-600">Filters:</span>
                    <select
                        value={stockFilterType}
                        onChange={(e) => setStockFilterType(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded text-sm focus:ring-2 focus:ring-brand-500"
                    >
                        <option value="ALL">All Types</option>
                        <option value="RM">Raw Material (RM)</option>
                        <option value="FG">Finished Goods (FG)</option>
                    </select>
                    <select
                        value={stockFilterStatus}
                        onChange={(e) => setStockFilterStatus(e.target.value)}
                        className="px-3 py-1.5 bg-white border border-slate-300 rounded text-sm focus:ring-2 focus:ring-brand-500"
                    >
                        <option value="ALL">All Status</option>
                        <option value="OCCUPIED">Occupied Only</option>
                        <option value="EMPTY">Empty Only</option>
                    </select>
                </div>
            )}

            {/* Content */}
            {activeTab === 'TRACEABILITY' ? (
                <TraceabilityReport vehicles={vehicles} />
            ) : (
                <>
                    {/* Totals Summary for Warehouse Stock */}
                    {activeTab === 'WAREHOUSE_STOCK' && filteredStock.length > 0 && (
                        <div className="bg-gradient-to-r from-brand-50 to-blue-50 rounded-xl shadow-sm border border-brand-200 p-5 mb-4">
                            <div className="flex items-center justify-between mb-3">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Package size={20} className="text-brand-600" />
                                    Summary Totals {stockFilterStatus !== 'ALL' && `(${stockFilterStatus})`}
                                </h3>
                                <span className="text-xs text-slate-500">{filteredStock.length} Bays</span>
                            </div>
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div className="bg-white/80 rounded-lg p-3 border border-slate-200">
                                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Total Quantity</div>
                                    <div className="text-2xl font-bold text-brand-700">
                                        {filteredStock.reduce((sum, bay) => sum + parseFloat(bay.qty || 0), 0).toFixed(3)}
                                        <span className="text-sm text-slate-500 ml-1">MT</span>
                                    </div>
                                </div>
                                <div className="bg-white/80 rounded-lg p-3 border border-slate-200">
                                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Total Bags</div>
                                    <div className="text-2xl font-bold text-blue-700">
                                        {filteredStock.reduce((sum, bay) => sum + (bay.totalBags !== undefined ? bay.totalBags : (bay.qty ? calculateBags(bay.qty, bay.material, bay.grade) : 0)), 0).toLocaleString()}
                                    </div>
                                </div>
                                <div className="bg-white/80 rounded-lg p-3 border border-slate-200">
                                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Occupied Bays</div>
                                    <div className="text-2xl font-bold text-red-600">
                                        {filteredStock.filter(b => b.status === 'OCCUPIED').length}
                                    </div>
                                </div>
                                <div className="bg-white/80 rounded-lg p-3 border border-slate-200">
                                    <div className="text-xs font-bold text-slate-500 uppercase mb-1">Empty Bays</div>
                                    <div className="text-2xl font-bold text-green-600">
                                        {filteredStock.filter(b => b.status === 'EMPTY').length}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}

                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        {activeTab === 'MR_LOGS' && (
                                            <>
                                                <th className="px-6 py-4 font-semibold text-slate-700">MR ID</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Unit</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Items</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Linked Lots</th>
                                            </>
                                        )}
                                        {activeTab === 'FG_LOGS' && (
                                            <>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Lot Number</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Unit</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">FG Name</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Shift</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                            </>
                                        )}
                                        {activeTab === 'WAREHOUSE_STOCK' && (
                                            <>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Bay ID</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Unit</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Product / Material</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Lot / Batch No</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Qty (MT)</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700 text-right">Bags</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Shift</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Action</th>
                                            </>
                                        )}
                                        {activeTab === 'INWARD_LOGS' && (
                                            <>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Unique ID</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Vehicle No</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Supplier</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Material</th>
                                                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                            </>
                                        )}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {activeTab === 'MR_LOGS' && (
                                        filteredMRs.length > 0 ? (
                                            filteredMRs.map((mr) => (
                                                <tr key={mr.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 font-medium text-slate-900">{mr.id}</td>
                                                    <td className="px-6 py-4 text-slate-500">{new Date(mr.createdAt).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 text-slate-500">{mr.unit}</td>
                                                    <td className="px-6 py-4 text-slate-500">
                                                        {mr.items.length} Items ({mr.items.map(i => i.fgName).join(', ').substring(0, 20)}...)
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${mr.status === 'CLOSED' ? 'bg-green-100 text-green-700' :
                                                            mr.status === 'PENDING_BAY_ASSIGNMENT' ? 'bg-yellow-100 text-yellow-700' :
                                                                'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {mr.status.replace(/_/g, ' ')}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500 font-mono text-xs">
                                                        {mr.receivedItems
                                                            ? (Array.isArray(mr.receivedItems)
                                                                ? mr.receivedItems.map(i => i.lotNumber || i).join(', ')
                                                                : (mr.receivedItems.lots ? mr.receivedItems.lots.join(', ') : '-'))
                                                            : '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-slate-500">No MR logs found.</td>
                                            </tr>
                                        )
                                    )}

                                    {activeTab === 'FG_LOGS' && (
                                        filteredLots.length > 0 ? (
                                            filteredLots.map((lot) => (
                                                <tr key={lot.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 font-medium text-purple-600 font-mono">{lot.lotNumber}</td>
                                                    <td className="px-6 py-4 text-slate-500">{new Date(lot.createdAt).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 text-slate-500">{lot.unit}</td>
                                                    <td className="px-6 py-4 text-slate-500">{lot.fgName || '-'}</td>
                                                    <td className="px-6 py-4 text-slate-500">{lot.shift || '-'}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${lot.status === 'APPROVED' ? 'bg-green-100 text-green-700' :
                                                            lot.status === 'PENDING_QA' ? 'bg-yellow-100 text-yellow-700' :
                                                                lot.status === 'UNASSIGNED' ? 'bg-slate-100 text-slate-700' :
                                                                    'bg-blue-100 text-blue-700'
                                                            }`}>
                                                            {lot.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-slate-500">No Lot logs found.</td>
                                            </tr>
                                        )
                                    )}

                                    {activeTab === 'WAREHOUSE_STOCK' && (
                                        filteredStock.length > 0 ? (
                                            filteredStock.map((row) => (
                                                <tr key={row.uniqueKey} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 font-bold text-slate-800">{row.id}</td>
                                                    <td className="px-6 py-4 text-slate-500 text-xs">{row.unit}</td>
                                                    <td className="px-6 py-4 text-slate-700 font-medium">{row.displayMaterial || '-'}</td>
                                                    <td className="px-6 py-4 text-slate-500 font-mono text-sm">
                                                        {row.batchId || '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono font-bold text-brand-700">
                                                        {row.qty ? `${parseFloat(row.qty).toFixed(3)} MT` : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-right font-mono text-sm text-slate-600">
                                                        {row.bags !== undefined ? row.bags.toLocaleString() : '-'}
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-600 text-sm">
                                                        {row.shift || '-'}
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.status === 'OCCUPIED' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'
                                                            }`}>
                                                            {row.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        <button
                                                            onClick={() => setAdjustmentBay(row.originalBay)}
                                                            className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors"
                                                            title="Adjust Stock"
                                                        >
                                                            <Edit2 size={16} />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="7" className="px-6 py-8 text-center text-slate-500">No Stock found matching filters.</td>
                                            </tr>
                                        )
                                    )}

                                    {activeTab === 'INWARD_LOGS' && (
                                        filteredInward.length > 0 ? (
                                            filteredInward.map((v) => (
                                                <React.Fragment key={v.id}>
                                                    <tr
                                                        className="hover:bg-slate-50 cursor-pointer transition-colors"
                                                        onClick={() => setExpandedRow(expandedRow === v.id ? null : v.id)}
                                                    >
                                                        <td className="px-6 py-4 font-medium text-blue-600 font-mono flex items-center gap-2">
                                                            {expandedRow === v.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                                                            {v.uniqueID || v.id}
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500">
                                                            {v.entryTime ? new Date(v.entryTime).toLocaleDateString() : (v.date || '-')}
                                                        </td>
                                                        <td className="px-6 py-4 text-slate-500">{v.vehicleNo}</td>
                                                        <td className="px-6 py-4 text-slate-500">{v.supplier || v.supplierName || '-'}</td>
                                                        <td className="px-6 py-4 text-slate-500">{v.material || v.materialName || '-'}</td>
                                                        <td className="px-6 py-4">
                                                            <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                                                {v.status.replace(/_/g, ' ')}
                                                            </span>
                                                        </td>
                                                    </tr>
                                                    {expandedRow === v.id && (
                                                        <tr className="bg-slate-50/50">
                                                            <td colSpan="6" className="px-6 py-4">
                                                                <div className="pl-6 border-l-2 border-slate-200 space-y-3">
                                                                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Activity Log</h4>
                                                                    {v.logs && v.logs.length > 0 ? (
                                                                        <div className="space-y-2">
                                                                            {v.logs.map((log, idx) => (
                                                                                <div key={idx} className="flex items-start gap-3 text-sm">
                                                                                    <div className="min-w-[140px] text-slate-400 font-mono text-xs mt-0.5">
                                                                                        {log.time || log.timestamp}
                                                                                    </div>
                                                                                    <div>
                                                                                        <span className="font-medium text-slate-700">{log.action}</span>
                                                                                        {log.stage && (
                                                                                            <span className="ml-2 text-xs bg-slate-200 text-slate-600 px-1.5 py-0.5 rounded">
                                                                                                {log.stage}
                                                                                            </span>
                                                                                        )}
                                                                                    </div>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    ) : (
                                                                        <p className="text-sm text-slate-400 italic">No activity logs recorded.</p>
                                                                    )}
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    )}
                                                </React.Fragment>
                                            ))
                                        ) : (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-slate-500">No Inward logs found.</td>
                                            </tr>
                                        )
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </>
            )}

            <StockAdjustmentModal
                isOpen={!!adjustmentBay}
                onClose={() => setAdjustmentBay(null)}
                bay={adjustmentBay}
                onConfirm={handleStockAdjustment}
            />
        </div>
    );
};

export default ReportsModule;
