import { calculateBags } from '../../utils/bagCalculator';
import React, { useState } from 'react';
import { Warehouse, Package, ShoppingCart, MapPin, Truck, CheckCircle, Box, Wrench, LayoutGrid, History, Camera, Download, Search, X } from 'lucide-react';
import WarehouseBayAssignment from '../production/WarehouseBayAssignment';
import FGPlacement from '../production/FGPlacement';
import WarehouseLayout from '../production/WarehouseLayout';
import SearchableSelect from '../shared/SearchableSelect';
import CameraCapture from '../shared/CameraCapture';
import PhotoGalleryModal from '../shared/PhotoGalleryModal';
import VehicleEditModal from '../shared/VehicleEditModal';
import LogViewerModal from '../shared/LogViewerModal';
import StatusBadge from '../shared/StatusBadge';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { useProduction } from '../../contexts/ProductionContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useVehicles } from '../../contexts/VehicleContext';
import UserManualModal from '../shared/UserManualModal';
import { HelpCircle } from 'lucide-react';

// StatusBadge Component
// StatusBadge Component imported from Shared

const WarehouseModule = ({ showAlert }) => {
    const { vehicles, updateVehicle } = useVehicles();
    const safeVehicles = vehicles || [];
    const { getOpenMRs, updateBinStock, seedBins, bays, getAllMRs, assignInwardBay } = useWarehouse();
    const { getLotsByStatus, updateLotStatus, updateLot, updateLotDetails, lots } = useProduction();
    const { currentUnit } = useOrganization();

    const [activeTab, setActiveTab] = useState('RAW_MATERIAL');
    const [subTab, setSubTab] = useState('PENDING');
    const [selectedBay, setSelectedBay] = useState(null);
    const [showBayDialog, setShowBayDialog] = useState(false);
    const [selectedVehicleForBay, setSelectedVehicleForBay] = useState(null);
    const [selectedLotForBay, setSelectedLotForBay] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Camera State
    const [showCamera, setShowCamera] = useState(false);
    const [currentCam, setCurrentCam] = useState(null); // { id, type: 'VEHICLE' | 'LOT' }
    const [viewPhotos, setViewPhotos] = useState(null);

    // Data Correction State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [pendingAction, setPendingAction] = useState(null); // { type: 'ASSIGN_UNIT', vehicleId, unit }
    const [showLogModal, setShowLogModal] = useState(false);
    const [selectedLogs, setSelectedLogs] = useState([]);

    // Filter FG Lots for History
    const fgHistory = lots.filter(l => l.assignedBay).sort((a, b) => new Date(b.bayAssignedAt || b.createdAt) - new Date(a.bayAssignedAt || a.createdAt));

    // Filter RM Bays from Context (Live Data) - FILTER BY UNIT
    // Normalize unit name matching (similar to WarehouseContext)
    const [searchTerm, setSearchTerm] = useState('');
    const [viewBayDetails, setViewBayDetails] = useState(null); // For BayDetailsModal

    // Filter vehicles for Unit Allocation (QC Approved but no Unit)
    const pendingAllocation = safeVehicles.filter(v => v.status === 'PENDING_UNIT_ALLOCATION');

    // Filter vehicles for Inward (Pending Bay Assignment) - MUST HAVE UNIT
    const pendingInwardVehicles = safeVehicles.filter(v =>
        (v.status === 'AT_WAREHOUSE' || v.status === 'QC_APPROVED' || v.status === 'PENDING_UNIT_ALLOCATION') && v.unit
    );

    // Filter Lots for FG Placement (Pending Bay Assignment)
    const pendingFGLots = getLotsByStatus('APPROVED');

    // Filter Vehicles for Sales Dispatch Loading Confirmation
    const pendingDispatchLoading = safeVehicles.filter(v => v.status === 'SALES_AT_LOADING');

    // Filter Raw Material History logic
    const historyVehicles = safeVehicles
        .filter(v => (v.type === 'MATERIAL' || !v.type) && v.assignedBay)
        .sort((a, b) => new Date(b.bayAssignedAt || b.entryTime) - new Date(a.bayAssignedAt || a.entryTime));

    // Filter MR History
    const mrHistory = getAllMRs().filter(mr => mr.status === 'CLOSED').sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));

    // Lorry Yard Visibility (Read Only)
    const lorryYardVehicles = safeVehicles.filter(v =>
        (v.registerId === 'lorry_yard' || v.origin === 'lorry_yard') &&
        !['AT_WAREHOUSE', 'BAY_ASSIGNED', 'QC_APPROVED', 'COMPLETED', 'AT_SECURITY_OUT', 'RETURN_COMPLETED', 'PENDING_UNIT_ALLOCATION', 'AT_SECURITY_GATE_ENTRY'].includes(v.status)
    );

    // Filter RM Bays from Context (Live Data) - FILTER BY UNIT
    // searchTerm and viewBayDetails are already defined above if Step 10598 worked.
    // But to be safe and clean, I will ensure they are defined ONCE.
    // Since I can't see the whole file, I will just output the logic functions and the bay lists, assuming state is up top.
    // WAIT, if I remove them here, and they AREN'T above, it breaks.
    // The lint says they ARE declared at line 82. So they exist above.

    const filterByUnit = (bay) => {
        if (!currentUnit) return true;
        if (currentUnit.id === 'all') return true;
        const bayUnit = (bay.unit || '').toLowerCase().replace('plant', 'unit');
        const selectedUnit = (currentUnit.name || '').toLowerCase().replace('plant', 'unit');
        return bayUnit.includes(selectedUnit) || selectedUnit.includes(bayUnit);
    };

    const filterBySearch = (bay) => {
        if (!searchTerm) return true;
        const term = searchTerm.toLowerCase();
        return bay.id.toLowerCase().includes(term) ||
            (bay.material || '').toLowerCase().includes(term);
    };

    const rmBays = bays.filter(b => b.id.startsWith('RM') && b.type === 'BAY' && filterByUnit(b) && filterBySearch(b));
    const fgBays = bays.filter(b => b.id.startsWith('FG') && b.type === 'BAY' && filterByUnit(b) && filterBySearch(b));


    // Helper to match legacy prop signature
    const updateStatus = (id, status, data, logAction) => {
        updateVehicle(id, { status, ...data }, logAction ? {
            stage: 'WAREHOUSE',
            action: logAction,
            timestamp: new Date().toISOString(),
            user: 'WAREHOUSE_MGR'
        } : null);
    };

    // Unit Allocation Handler
    const handleUnitAssign = (vehicleId, unit) => {
        if (!unit) {
            showAlert("Please select a valid unit.");
            return;
        }
        const vehicle = safeVehicles.find(v => v.id === vehicleId);
        setEditingVehicle(vehicle);
        setPendingAction({ type: 'ASSIGN_UNIT', vehicleId, unit });
        setShowEditModal(true);
    };

    const handleCameraTrigger = (e, id, type) => {
        if (e) e.stopPropagation();
        setCurrentCam({ id, type });
        setShowCamera(true);
    };

    const handlePhotoCapture = (imageData) => {
        if (!currentCam || isSubmitting) return; // Fix: Prevent double submission

        setIsSubmitting(true);
        const { id, type } = currentCam;

        if (type === 'VEHICLE') {
            const vehicle = safeVehicles.find(v => v.id === id);
            if (vehicle) {
                const currentAttachments = vehicle.attachments || [];
                updateVehicle(id, { attachments: [...currentAttachments, imageData] }, {
                    stage: 'WAREHOUSE',
                    action: 'Captured Photo',
                    timestamp: new Date().toISOString(),
                    user: 'WAREHOUSE_MGR'
                });
            }
        } else if (type === 'LOT') {
            const lot = lots.find(l => l.id === id);
            if (lot) {
                const currentAttachments = lot.attachments || [];
                updateLotStatus(id, lot.status, { attachments: [...currentAttachments, imageData] });
            }
        }
        showAlert("Photo captured!");
        setTimeout(() => setIsSubmitting(false), 1000);
    };

    const handleAssignBay = (vehicleId, bayId) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        updateStatus(vehicleId, 'BAY_ASSIGNED', {
            assignedBay: bayId,
            bayAssignedAt: new Date().toISOString()
        }, `Assigned to Bay ${bayId}`);

        if (assignInwardBay) {
            assignInwardBay(bayId, selectedVehicleForBay);
        }
        showAlert(`Assigned ${selectedVehicleForBay.vehicleNo} to Bay ${bayId}`);
        setSelectedVehicleForBay(null);
        setTimeout(() => setIsSubmitting(false), 1000);
    };

    const handleAssignFGBay = (lotId, bayId) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        // Update Warehouse Stock (Physical Move)
        if (selectedLotForBay) {
            updateBinStock(
                bayId,
                selectedLotForBay.producedQty || selectedLotForBay.qty || 0,
                selectedLotForBay.fgName || selectedLotForBay.productName,
                'ADD',
                selectedLotForBay.grade,
                selectedLotForBay.uom // Pass UOM for conversion
            );

            // Update Lot Status to STORED so it moves to History
            // Use updateLot to ensure assignedBay is saved at root level
            updateLot(lotId, {
                status: 'STORED',
                assignedBay: bayId,
                bayAssignedAt: new Date().toISOString()
            });
        }

        showAlert(`Lot ${selectedLotForBay?.lotNumber || lotId} assigned to Bay ${bayId}`);
        setSelectedLotForBay(null);
        setTimeout(() => setIsSubmitting(false), 1000);
    };

    const handleConfirmDispatch = (vehicleId) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        updateStatus(vehicleId, 'SALES_AT_WEIGHBRIDGE_2', {}, 'Dispatch Loading Confirmed');
        showAlert("Loading Confirmed. Vehicle sent to Weighbridge for Gross Weight.");
        setTimeout(() => setIsSubmitting(false), 1000);
    };

    const handleBayClick = (bay) => {
        if (!selectedVehicleForBay && !selectedLotForBay) return;
        if (bay.status === 'OCCUPIED') {
            showAlert("This bay is already occupied.");
            return;
        }
        setSelectedBay(bay);
        setShowBayDialog(true);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Warehouse Operations</h1>
                    <p className="text-slate-500">Manage Raw Materials, Finished Goods, and Stock</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setViewBayDetails({ mode: 'MANUAL' })} // Reuse logic or new state
                        className="p-2 text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Open User Manual"
                    >
                        <HelpCircle size={24} />
                    </button>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-1 flex flex-wrap gap-1">
                <button
                    onClick={() => { setActiveTab('RAW_MATERIAL'); setSubTab('PENDING'); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'RAW_MATERIAL' ? 'bg-brand-50 text-brand-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Package size={18} /> Raw Material
                </button>
                <button
                    onClick={() => { setActiveTab('FINISHED_GOODS'); setSubTab('PENDING'); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'FINISHED_GOODS' ? 'bg-brand-50 text-brand-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Box size={18} /> Finished Goods
                </button>
                <button
                    onClick={() => { setActiveTab('PRODUCTION_MR'); setSubTab('PENDING'); }}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'PRODUCTION_MR' ? 'bg-brand-50 text-brand-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <ShoppingCart size={18} /> Production MR
                </button>
                <button
                    onClick={() => setActiveTab('STORES')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'STORES' ? 'bg-brand-50 text-brand-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <Wrench size={18} /> Stores & Spares
                </button>
                <button
                    onClick={() => setActiveTab('BAY_STATUS')}
                    className={`px-4 py-2 rounded-lg text-sm font-bold flex items-center gap-2 transition-all ${activeTab === 'BAY_STATUS' ? 'bg-brand-50 text-brand-600 shadow-sm' : 'text-slate-500 hover:bg-slate-50'}`}
                >
                    <LayoutGrid size={18} /> Bay Status
                </button>
            </div>

            {/* Sub Tabs (History Toggle) */}
            {['RAW_MATERIAL', 'FINISHED_GOODS', 'PRODUCTION_MR'].includes(activeTab) && (
                <div className="flex justify-end">
                    <div className="bg-slate-100/50 p-1 rounded-lg flex gap-1">
                        <button
                            onClick={() => setSubTab('PENDING')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${subTab === 'PENDING' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            Active / Pending
                        </button>
                        <button
                            onClick={() => setSubTab('HISTORY')}
                            className={`px-3 py-1.5 rounded-md text-xs font-bold transition-all ${subTab === 'HISTORY' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                        >
                            History
                        </button>
                    </div>
                </div>
            )}

            {/* Content */}
            <div className="animate-fade-in">
                {activeTab === 'RAW_MATERIAL' && subTab === 'PENDING' && (
                    <div className="space-y-8">
                        {/* Lorry Yard Dashboard (Real-time Info) */}
                        {lorryYardVehicles.length > 0 && (
                            <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl shadow-lg p-6 text-white overflow-hidden relative">
                                <div className="absolute top-0 right-0 p-4 opacity-10">
                                    <Truck size={120} />
                                </div>
                                <div className="relative z-10">
                                    <h3 className="font-bold text-lg flex items-center gap-2 mb-4">
                                        <Truck size={20} className="text-brand-400" /> Expected Arrivals (Lorry Yard)
                                        <span className="bg-white/10 px-2 py-0.5 rounded text-xs ml-2">Read Only</span>
                                    </h3>
                                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                                        {lorryYardVehicles.map(v => (
                                            <div key={v.id} className="bg-white/10 backdrop-blur-sm p-3 rounded-lg border border-white/10">
                                                <div className="flex justify-between items-start mb-1">
                                                    <span className="font-bold text-lg">{v.vehicleNo}</span>
                                                    <span className="text-[10px] font-mono bg-black/20 px-1.5 py-0.5 rounded">{v.status.replace(/_/g, ' ')}</span>
                                                </div>
                                                <div className="text-sm text-slate-300 truncate">{v.supplierName}</div>
                                                <div className="text-xs text-brand-300 mt-1">{v.materialName}</div>
                                                <div className="text-[10px] text-slate-400 mt-2 flex items-center gap-1">
                                                    <History size={10} /> Entered: {new Date(v.entryTime).toLocaleTimeString()}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* NEW SECTION: Pending Unit Allocation */}
                        {pendingAllocation.length > 0 && (
                            <div className="bg-orange-50 rounded-2xl shadow-sm border border-orange-100 overflow-hidden">
                                <div className="bg-orange-100 px-6 py-4 border-b border-orange-200">
                                    <h3 className="font-bold text-orange-800 flex items-center gap-2">
                                        <MapPin size={20} /> Pre-Inward: Unit Allocation
                                    </h3>
                                </div>
                                <div className="p-4 grid gap-4">
                                    {pendingAllocation.map(v => (
                                        <div key={v.id} className="bg-white p-4 rounded-xl border border-orange-100 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
                                            <div>
                                                <h4 className="font-bold text-lg text-slate-800">{v.vehicleNo}</h4>
                                                <p className="text-sm text-slate-600">{v.material}</p>
                                                <p className="text-xs text-slate-400">Supplier: {v.supplierName}</p>
                                            </div>
                                            <div className="flex items-center gap-2 w-full md:w-auto">
                                                <select
                                                    className="p-2 border border-slate-300 rounded-lg text-sm bg-slate-50 min-w-[150px]"
                                                    onChange={(e) => {
                                                        if (e.target.value) handleUnitAssign(v.id, e.target.value);
                                                    }}
                                                    defaultValue=""
                                                >
                                                    <option value="" disabled>Select Unit...</option>
                                                    <option value="Unit-1">Unit-1</option>
                                                    <option value="Unit-2">Unit-2</option>
                                                    <option value="Unit-3">Unit-3</option>
                                                </select>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                            {/* Pending Vehicles List (Assigned Unit) */}
                            <div className="lg:col-span-1 space-y-6">
                                <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
                                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <Truck size={20} className="text-slate-400" /> Pending for Bay Assignment
                                        </h3>
                                    </div>
                                    <div className="p-4">
                                        {pendingInwardVehicles.length > 0 ? (
                                            <div className="space-y-4">
                                                {pendingInwardVehicles.map(v => (
                                                    <div
                                                        key={v.id}
                                                        onClick={() => setSelectedVehicleForBay(v)}
                                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedVehicleForBay?.id === v.id
                                                            ? 'bg-brand-50 border-brand-200 ring-2 ring-brand-500/20'
                                                            : 'bg-white border-slate-200 hover:border-brand-200 hover:shadow-md'
                                                            }`}
                                                    >
                                                        <div className="flex justify-between items-start mb-2">
                                                            <div className="flex items-center gap-2">
                                                                <h4 className="font-bold text-slate-800">{v.vehicleNo}</h4>
                                                                <StatusBadge status={v.status} />
                                                            </div>
                                                            <div className="flex items-center gap-1">
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setSelectedLogs(v.logs || []); setShowLogModal(true); }}
                                                                    className="p-1 hover:bg-blue-50 rounded-full text-slate-400 hover:text-blue-600 transition-colors"
                                                                    title="View Logs"
                                                                >
                                                                    <History size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => handleCameraTrigger(e, v.id, 'VEHICLE')}
                                                                    className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-brand-600 transition-colors"
                                                                    title="Add Photo"
                                                                >
                                                                    <Camera size={16} />
                                                                </button>
                                                                <button
                                                                    onClick={(e) => { e.stopPropagation(); setEditingVehicle(v); setShowEditModal(true); }}
                                                                    className="p-1 hover:bg-amber-100 rounded-full text-slate-400 hover:text-amber-600 transition-colors"
                                                                    title="Correct Data"
                                                                >
                                                                    <Wrench size={16} />
                                                                </button>
                                                                <span className="text-[10px] font-mono bg-slate-100 text-slate-500 px-2 py-1 rounded">{v.uniqueID}</span>
                                                            </div>
                                                        </div>
                                                        <p className="text-sm text-slate-600 mb-1">{v.materialName}</p>
                                                        <div className="flex justify-between items-center text-xs text-slate-500">
                                                            <span>{v.supplierName}</span>
                                                            <span className="font-mono font-bold bg-slate-100 px-2 py-1 rounded">{v.netWeight} kg</span>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        ) : (
                                            <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                                No vehicles pending bay assignment.
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Bay Map */}
                            <div className="lg:col-span-2">
                                <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6">
                                    <div className="flex justify-between items-center mb-6">
                                        <div className="flex items-center gap-4">
                                            <h3 className="font-bold text-slate-800">Warehouse Layout (RM)</h3>
                                            <div className="relative">
                                                <Search className="absolute left-2.5 top-1.5 text-slate-400" size={14} />
                                                <input
                                                    type="text"
                                                    placeholder="Search Bay or Material..."
                                                    value={searchTerm}
                                                    onChange={(e) => setSearchTerm(e.target.value)}
                                                    className="pl-8 pr-3 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 w-60"
                                                />
                                            </div>
                                        </div>
                                        <div className="flex gap-4 text-xs">
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200"></div>
                                                <span>Empty</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div>
                                                <span>Occupied</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <div className="w-3 h-3 rounded bg-brand-100 border border-brand-200"></div>
                                                <span>Selected</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                                        {rmBays.map(bay => (
                                            <button
                                                key={bay.id}
                                                onClick={() => handleBayClick(bay)}
                                                disabled={!selectedVehicleForBay && bay.status === 'EMPTY'}
                                                className={`
                                                aspect-square rounded-lg flex flex-col items-center justify-center p-2 text-xs font-bold transition-all
                                                ${bay.status === 'OCCUPIED'
                                                        ? 'bg-red-50 text-red-700 border-2 border-red-200 hover:bg-red-100'
                                                        : selectedVehicleForBay
                                                            ? 'bg-white text-slate-600 border-2 border-dashed border-slate-300 hover:border-brand-50 hover:bg-brand-50 hover:text-brand-600 cursor-pointer'
                                                            : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-default'
                                                    }
                                            `}
                                            >
                                                <span className="text-lg mb-1">{bay.id}</span>
                                                <span className="text-[10px] font-normal opacity-75">{bay.capacity}MT</span>
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'RAW_MATERIAL' && subTab === 'HISTORY' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2"><History size={18} /> Raw Material History</h3>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Vehicle No</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Material</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Assigned Bay</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Quantity</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {historyVehicles.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-slate-500">No raw material history found.</td>
                                        </tr>
                                    ) : (
                                        historyVehicles.map(v => (
                                            <tr key={v.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 text-slate-500">{new Date(v.entryTime).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 font-medium text-slate-900">{v.vehicleNo}</td>
                                                <td className="px-6 py-4 text-slate-500">{v.materialName}</td>
                                                <td className="px-6 py-4 font-mono font-bold text-brand-600">{v.assignedBay || '-'}</td>
                                                <td className="px-6 py-4 font-mono text-slate-600">{v.netWeight} kg</td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={v.status} />
                                                </td>
                                                <td className="px-6 py-4 flex gap-2">
                                                    <button
                                                        onClick={() => { setSelectedLogs(v.logs || []); setShowLogModal(true); }}
                                                        className="p-1 hover:bg-blue-50 rounded-full text-slate-400 hover:text-blue-600 transition-colors"
                                                        title="View Logs"
                                                    >
                                                        <History size={16} />
                                                    </button>
                                                    {v.attachments && v.attachments.length > 0 && (
                                                        <button
                                                            onClick={() => setViewPhotos(v.attachments)}
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold hover:bg-blue-200"
                                                        >
                                                            <Camera size={12} /> ({v.attachments.length})
                                                        </button>
                                                    )}
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'FINISHED_GOODS' && subTab === 'PENDING' && (
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Pending Lots List */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
                                <div className="bg-slate-50 px-6 py-4 border-b border-slate-100">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <Box size={20} className="text-slate-400" /> Pending for FG Bay Assignment
                                    </h3>
                                </div>
                                <div className="p-4">
                                    {pendingFGLots.length > 0 ? (
                                        <div className="space-y-4">
                                            {pendingFGLots.map(lot => (
                                                <div
                                                    key={lot.id}
                                                    onClick={() => setSelectedLotForBay(lot)}
                                                    className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedLotForBay?.id === lot.id
                                                        ? 'bg-brand-50 border-brand-200 ring-2 ring-brand-500/20'
                                                        : 'bg-white border-slate-200 hover:border-brand-200 hover:shadow-md'
                                                        }`}
                                                >
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-slate-800">{lot.lotNumber}</h4>
                                                        <div className="flex items-center gap-1">
                                                            <button
                                                                onClick={(e) => handleCameraTrigger(e, lot.id, 'LOT')}
                                                                className="p-1 hover:bg-slate-100 rounded-full text-slate-400 hover:text-purple-600 transition-colors"
                                                                title="Add Photo"
                                                            >
                                                                <Camera size={16} />
                                                            </button>
                                                            <span className="text-[10px] font-mono bg-green-100 text-green-700 px-2 py-1 rounded">APPROVED</span>
                                                        </div>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mb-1">{lot.productName}</p>
                                                    <div className="flex justify-between items-center text-xs text-slate-500">
                                                        <span>{lot.shift}</span>
                                                        <span className="font-mono font-bold bg-slate-100 px-2 py-1 rounded">{lot.producedQty} kg</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-slate-500 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                            No approved lots pending bay assignment.
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Dispatch Loading Confirmation */}
                            <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
                                <div className="bg-blue-50 px-6 py-4 border-b border-blue-100">
                                    <h3 className="font-bold text-blue-800 flex items-center gap-2">
                                        <Truck size={20} /> Pending Dispatch Loading
                                    </h3>
                                </div>
                                <div className="p-4">
                                    {pendingDispatchLoading.length > 0 ? (
                                        <div className="space-y-4">
                                            {pendingDispatchLoading.map(v => (
                                                <div key={v.id} className="p-4 rounded-xl border border-blue-100 bg-white shadow-sm">
                                                    <div className="flex justify-between items-start mb-2">
                                                        <h4 className="font-bold text-slate-800">{v.vehicleNo}</h4>
                                                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded font-bold">LOADING</span>
                                                    </div>
                                                    <p className="text-sm text-slate-600 mb-1">Items: {v.desc || 'Feed Bags'}</p>
                                                    <div className="flex justify-between items-center mt-3">
                                                        <span className="text-xs text-slate-500">{v.orders?.length || 0} Orders</span>
                                                        <button
                                                            onClick={() => handleConfirmDispatch(v.id)}
                                                            disabled={isSubmitting}
                                                            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-1"
                                                        >
                                                            <CheckCircle size={14} /> Confirm Loading
                                                        </button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="text-center py-6 text-slate-400">No vehicles currently loading.</div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* FG Bay Map */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6">
                                <div className="flex justify-between items-center mb-6">
                                    <div className="flex items-center gap-4">
                                        <h3 className="font-bold text-slate-800">Finished Goods Warehouse Layout</h3>
                                        <div className="relative">
                                            <Search className="absolute left-2.5 top-1.5 text-slate-400" size={14} />
                                            <input
                                                type="text"
                                                placeholder="Search Bay or Product..."
                                                value={searchTerm}
                                                onChange={(e) => setSearchTerm(e.target.value)}
                                                className="pl-8 pr-3 py-1 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 w-60"
                                            />
                                        </div>
                                    </div>
                                    <div className="flex gap-4 text-xs">
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded bg-slate-100 border border-slate-200"></div>
                                            <span>Empty</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded bg-red-100 border border-red-200"></div>
                                            <span>Occupied</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <div className="w-3 h-3 rounded bg-brand-100 border border-brand-200"></div>
                                            <span>Selected</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="grid grid-cols-4 sm:grid-cols-6 md:grid-cols-8 gap-3">
                                    {fgBays.map(bay => (
                                        <button
                                            key={bay.id}
                                            onClick={() => handleBayClick(bay)}
                                            disabled={!selectedLotForBay && bay.status === 'EMPTY'}
                                            className={`
                                                aspect-square rounded-lg flex flex-col items-center justify-center p-2 text-xs font-bold transition-all
                                                ${bay.status === 'OCCUPIED'
                                                    ? 'bg-red-50 text-red-700 border-2 border-red-200 hover:bg-red-100'
                                                    : selectedLotForBay
                                                        ? 'bg-white text-slate-600 border-2 border-dashed border-slate-300 hover:border-brand-50 hover:bg-brand-50 hover:text-brand-600 cursor-pointer'
                                                        : 'bg-slate-50 text-slate-400 border border-slate-200 cursor-default'
                                                }
                                            `}
                                        >
                                            <span className="text-lg mb-1">{bay.id}</span>
                                            <span className="text-[10px] font-normal opacity-75">{bay.capacity}MT</span>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>
                )
                }

                {
                    activeTab === 'FINISHED_GOODS' && subTab === 'HISTORY' && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><History size={18} /> Finished Goods Storage History</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Date Stored</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Lot No</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Product</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Storage Location</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Quantity</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Photos</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {fgHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-slate-500">No finished goods history found.</td>
                                            </tr>
                                        ) : (
                                            fgHistory.map(lot => (
                                                <tr key={lot.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 text-slate-500">{lot.bayAssignedAt ? new Date(lot.bayAssignedAt).toLocaleDateString() : '-'}</td>
                                                    <td className="px-6 py-4 font-medium text-slate-900">{lot.lotNumber}</td>
                                                    <td className="px-6 py-4 text-slate-500">{lot.fgName || lot.productName || '-'}</td>
                                                    <td className="px-6 py-4 font-mono font-bold text-brand-600">{lot.assignedBay}</td>
                                                    <td className="px-6 py-4 font-mono text-slate-600">{lot.producedQty || lot.qty || 0} kg</td>
                                                    <td className="px-6 py-4">
                                                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">
                                                            STORED
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4">
                                                        {lot.attachments && lot.attachments.length > 0 ? (
                                                            <button
                                                                onClick={() => setViewPhotos(lot.attachments)}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold hover:bg-blue-200"
                                                            >
                                                                <Camera size={12} /> ({lot.attachments.length})
                                                            </button>
                                                        ) : '-'}
                                                    </td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                }


                {
                    activeTab === 'STORES' && (
                        <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-200">
                            <Wrench size={48} className="mx-auto text-slate-300 mb-4" />
                            <h3 className="text-lg font-bold text-slate-700">Stores & Spares</h3>
                            <p className="text-slate-500">Module under development.</p>
                        </div>
                    )
                }

                {
                    activeTab === 'BAY_STATUS' && (
                        <WarehouseLayout />
                    )
                }

                {
                    activeTab === 'PRODUCTION_MR' && subTab === 'PENDING' && (
                        <WarehouseBayAssignment showAlert={showAlert} />
                    )
                }

                {
                    activeTab === 'PRODUCTION_MR' && subTab === 'HISTORY' && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2"><History size={18} /> Production MR History</h3>
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full text-left text-sm">
                                    <thead className="bg-slate-50 border-b border-slate-200">
                                        <tr>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">MR Number</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Requested By</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Department</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                            <th className="px-6 py-4 font-semibold text-slate-700">Completion Time</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {mrHistory.length === 0 ? (
                                            <tr>
                                                <td colSpan="6" className="px-6 py-8 text-center text-slate-500">No MR history found.</td>
                                            </tr>
                                        ) : (
                                            mrHistory.map(mr => (
                                                <tr key={mr.id} className="hover:bg-slate-50">
                                                    <td className="px-6 py-4 text-slate-500">{new Date(mr.createdAt).toLocaleDateString()}</td>
                                                    <td className="px-6 py-4 font-medium text-slate-900">{mr.mrNumber || mr.id}</td>
                                                    <td className="px-6 py-4 text-slate-500">{mr.requestedBy || '-'}</td>
                                                    <td className="px-6 py-4 text-slate-500">{mr.department || '-'}</td>
                                                    <td className="px-6 py-4">
                                                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${mr.status === 'CLOSED' ? 'bg-gray-100 text-gray-800' : 'bg-blue-100 text-blue-800'}`}>
                                                            {mr.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-6 py-4 text-slate-500">{mr.closedAt ? new Date(mr.closedAt).toLocaleString() : '-'}</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )
                }
            </div >

            {/* Bay Assignment Dialog */}
            {
                showBayDialog && selectedBay && (selectedVehicleForBay || selectedLotForBay) && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                        <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-scale-in">
                            <h3 className="text-xl font-bold text-slate-800 mb-4">Confirm Bay Assignment</h3>
                            <div className="space-y-4 mb-6">
                                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100">
                                    {selectedVehicleForBay ? (
                                        <>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-slate-500 text-sm">Vehicle No</span>
                                                <span className="font-bold text-slate-800">{selectedVehicleForBay.vehicleNo}</span>
                                            </div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-slate-500 text-sm">Material</span>
                                                <span className="font-bold text-slate-800">{selectedVehicleForBay.materialName}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 text-sm">Net Weight</span>
                                                <span className="font-bold text-slate-800">{selectedVehicleForBay.netWeight} kg</span>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-slate-500 text-sm">Lot Number</span>
                                                <span className="font-bold text-slate-800">{selectedLotForBay.lotNumber}</span>
                                            </div>
                                            <div className="flex justify-between mb-2">
                                                <span className="text-slate-500 text-sm">Product</span>
                                                <span className="font-bold text-slate-800">{selectedLotForBay.productName}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500 text-sm">Quantity</span>
                                                <span className="font-bold text-slate-800">{selectedLotForBay.producedQty} kg</span>
                                            </div>
                                        </>
                                    )}
                                </div>
                                <div className="flex items-center justify-center gap-4 py-4 bg-brand-50 rounded-xl border border-brand-100">
                                    <span className="text-brand-600 font-medium">Assigning to Bay</span>
                                    <span className="text-3xl font-bold text-brand-700">{selectedBay.id}</span>
                                </div>
                            </div>
                            <div className="flex gap-3">
                                <button
                                    onClick={() => setShowBayDialog(false)}
                                    className="flex-1 py-3 border border-slate-200 text-slate-600 font-bold rounded-xl hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={() => {
                                        if (selectedVehicleForBay) {
                                            handleAssignBay(selectedVehicleForBay.id, selectedBay.id);
                                        } else {
                                            handleAssignFGBay(selectedLotForBay.id, selectedBay.id);
                                        }
                                        setShowBayDialog(false);
                                    }}
                                    disabled={isSubmitting}
                                    className="flex-1 py-3 bg-brand-600 text-white font-bold rounded-xl shadow-lg shadow-brand-500/20 hover:bg-brand-700"
                                >
                                    Confirm Assignment
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {
                showCamera && (
                    <CameraCapture
                        onCapture={handlePhotoCapture}
                        onClose={() => setShowCamera(false)}
                    />
                )
            }
            {
                viewPhotos && (
                    <PhotoGalleryModal
                        photos={viewPhotos}
                        onClose={() => setViewPhotos(null)}
                    />
                )
            }
            {
                showEditModal && (
                    <VehicleEditModal
                        isOpen={showEditModal}
                        onClose={() => { setShowEditModal(false); setEditingVehicle(null); }}
                        vehicle={editingVehicle}
                        title={pendingAction?.type === "ASSIGN_UNIT" ? "Verify & Assign Unit" : "Correct Vehicle Data (Warehouse)"}
                        onSave={(id, updatedData, reason) => {
                            if (isSubmitting) return;
                            setIsSubmitting(true);
                            let statusToUpdate = editingVehicle.status;
                            let extraData = {};
                            let logMessage = `Data Correction (Warehouse): ${reason}`;

                            if (pendingAction && pendingAction.vehicleId === id && pendingAction.type === 'ASSIGN_UNIT') {
                                statusToUpdate = 'AT_SECURITY_GATE_ENTRY';
                                extraData = {
                                    unit: pendingAction.unit,
                                    registerId: 'rm_inward',
                                    unitAssignedAt: new Date().toISOString()
                                };
                                logMessage = `Unit ${pendingAction.unit} Assigned & Data Verified: ${reason}`;
                            }

                            updateStatus(id, statusToUpdate, { ...updatedData, ...extraData }, logMessage);

                            if (pendingAction?.type === 'ASSIGN_UNIT') {
                                showAlert(`Unit ${pendingAction.unit} assigned. Vehicle moved to Security Gate.`);
                            } else {
                                showAlert("Vehicle data corrected.");
                            }
                            setPendingAction(null);
                            setTimeout(() => setIsSubmitting(false), 1000);
                        }}
                    />
                )
            }

            {/* Log Viewer Modal */}
            <LogViewerModal
                isOpen={showLogModal}
                onClose={() => setShowLogModal(false)}
                logs={selectedLogs}
                title="Vehicle Audit Logs (Warehouse)"
            />
            {/* Bay Details Modal for Reporting */}
            {
                viewBayDetails && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm animate-fade-in">
                        <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                                <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                    <Box className="text-brand-600" size={20} />
                                    Bay Details: {viewBayDetails.id}
                                </h3>
                                <button
                                    onClick={() => setViewBayDetails(null)}
                                    className="p-1 hover:bg-slate-200 rounded-full text-slate-500 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <div className="p-6 space-y-4">
                                <div className="flex justify-between items-center p-3 bg-slate-50 rounded-lg border border-slate-100">
                                    <span className="text-sm text-slate-500">Status</span>
                                    <span className={`font-bold px-2 py-1 rounded text-xs ${viewBayDetails.status === 'OCCUPIED'
                                        ? 'bg-red-100 text-red-700'
                                        : 'bg-green-100 text-green-700'
                                        }`}>
                                        {viewBayDetails.status}
                                    </span>
                                </div>

                                {viewBayDetails.status === 'OCCUPIED' ? (
                                    <>
                                        <div className="space-y-1">
                                            <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Material / Product</label>
                                            <p className="font-medium text-slate-800 text-lg border-b border-slate-100 pb-2">
                                                {viewBayDetails.material || 'N/A'}
                                            </p>
                                        </div>

                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Quantity</label>
                                                <p className="font-semibold text-slate-700">
                                                    {parseFloat(viewBayDetails.qty).toFixed(3)} {viewBayDetails.uom || 'MT'}
                                                    <span className="text-sm text-slate-500 font-normal ml-2">
                                                        ({viewBayDetails.totalBags !== undefined ? viewBayDetails.totalBags.toLocaleString() : calculateBags(viewBayDetails.qty || 0, viewBayDetails.material, viewBayDetails.grade)} Bags)
                                                    </span>
                                                </p>
                                            </div>
                                            <div className="space-y-1">
                                                <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Batch / Lot No</label>
                                                <p className="font-mono text-slate-600 bg-slate-50 px-2 py-1 rounded inline-block text-sm">
                                                    {viewBayDetails.batchId || 'N/A'}
                                                </p>
                                            </div>

                                            {viewBayDetails.shift && (
                                                <div className="space-y-1">
                                                    <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">Shift</label>
                                                    <p className="font-semibold text-slate-700 text-sm">
                                                        {viewBayDetails.shift}
                                                    </p>
                                                </div>
                                            )}
                                        </div>

                                        <div className="pt-4 border-t border-slate-100">
                                            <div className="flex items-center gap-2 text-xs text-slate-400">
                                                <History size={12} />
                                                <span>Last Updated: {new Date(viewBayDetails.lastUpdated).toLocaleString()}</span>
                                            </div>
                                        </div>
                                    </>
                                ) : (
                                    <div className="text-center py-8 text-slate-400">
                                        <p>This bay is currently empty.</p>
                                        <p className="text-xs mt-1">Ready for assignment.</p>
                                    </div>
                                )}
                            </div>

                            <div className="p-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                                <button
                                    onClick={() => setViewBayDetails(null)}
                                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors"
                                >
                                    Close
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default WarehouseModule;
