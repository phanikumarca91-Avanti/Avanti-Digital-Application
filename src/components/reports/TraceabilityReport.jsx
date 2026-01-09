import React, { useState } from 'react';
import { Search, FileText, ArrowRight, Truck, Database, User, Calendar, Factory } from 'lucide-react';
import SearchableSelect from '../shared/SearchableSelect';
import { useProduction } from '../../contexts/ProductionContext';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { useSales } from '../../contexts/SalesContext'; // Import Sales Context

import MaterialRequisitionForm from '../forms/MaterialRequisitionForm';
import ProductionEntryForm from '../forms/ProductionEntryForm';
import { X } from 'lucide-react';

const Modal = ({ isOpen, onClose, title, children }) => {
    if (!isOpen) return null;
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="sticky top-0 z-10 flex items-center justify-between p-4 border-b border-slate-100 bg-white/80 backdrop-blur-md">
                    <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                    <button onClick={onClose} className="p-2 rounded-full hover:bg-slate-100 transition-colors">
                        <X size={20} className="text-slate-500" />
                    </button>
                </div>
                <div className="p-6">
                    {children}
                </div>
            </div>
        </div>
    );
};

const TraceabilityReport = ({ vehicles }) => {
    const { lots } = useProduction();
    const { getAllMRs, bays, getAllVehicles } = useWarehouse();
    const { plannedVehicles } = useSales();

    const [selectedLotId, setSelectedLotId] = useState('');
    const [traceData, setTraceData] = useState(null);

    // Modal State
    const [modalConfig, setModalConfig] = useState({ isOpen: false, type: null, data: null });

    const openModal = (type, data) => {
        setModalConfig({ isOpen: true, type, data });
    };

    const closeModal = () => {
        setModalConfig({ ...modalConfig, isOpen: false });
    };

    // Use passed vehicles prop if available and not empty, otherwise fallback to context
    const sourceVehicles = (vehicles && vehicles.length > 0) ? vehicles : getAllVehicles();

    const handleSearch = () => {
        if (!selectedLotId) return;

        const lot = lots.find(l => l.id === selectedLotId);
        if (!lot) return;

        const mr = getAllMRs().find(m => m.id === lot.mrId);

        // Trace back to Raw Materials
        const rawMaterials = mr ? mr.items.map(item => {
            const bay = bays.find(b => b.name === item.sourceBay);
            const bayId = item.sourceBay ? item.sourceBay.split(' - ')[0].trim() : '';
            const vehicle = sourceVehicles.find(v => v.assignedBay === bayId);

            return {
                material: item.name,
                qty: item.qty,
                sourceBay: item.sourceBay,
                bayStatus: bay ? bay.status : 'Unknown',
                vehicle: vehicle
            };
        }) : [];

        // Trace forward to Sales Invoices
        const salesInvoices = plannedVehicles
            .filter(v => v.stage === 'INVOICED') // Only look at finalized invoices
            .flatMap(v => {
                // Check if any invoice generated for this vehicle contains the selected lot
                return (v.generatedInvoices || [])
                    .filter(inv => inv.items.some(item =>
                        item.lots && item.lots.some(l => l.lotNumber === selectedLotId)
                    ))
                    .map(inv => {
                        // Find specific lot details in this invoice
                        const specificItem = inv.items.find(item => item.lots && item.lots.some(l => l.lotNumber === selectedLotId));
                        const specificLot = specificItem ? specificItem.lots.find(l => l.lotNumber === selectedLotId) : null;

                        return {
                            invoiceNo: inv.id,
                            date: inv.date,
                            customer: inv.customer,
                            vehicleNo: inv.vehicleNo,
                            dispatchedQty: specificLot ? specificLot.qty : 0, // In KG
                            bags: specificLot ? specificLot.bags : 0,
                            destination: 'ANDHRA PRADESH' // Placeholder or from customer data
                        };
                    });
            });

        setTraceData({
            lot,
            mr,
            rawMaterials,
            salesInvoices
        });
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Search className="text-brand-600" /> Traceability Report (Audit Log)
                </h2>

                <div className="flex gap-4 items-end mb-8">
                    <div className="flex-1 max-w-md">
                        <SearchableSelect
                            label="Select Finished Good Lot Number"
                            placeholder="Search Lot ID..."
                            options={lots.map(l => ({ name: l.lotNumber, id: l.lotNumber }))}
                            value={selectedLotId}
                            onChange={(e) => setSelectedLotId(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={handleSearch}
                        className="bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition-colors h-[42px]"
                    >
                        Trace
                    </button>
                </div>

                {traceData && (
                    <div className="space-y-8 animate-fade-in">
                        {/* 1. FG Lot Details */}
                        <div className="relative pl-8 border-l-2 border-brand-200">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-brand-500 ring-4 ring-white"></div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <FileText size={20} /> Finished Good Lot
                            </h3>
                            <div className="bg-brand-50 rounded-xl p-4 border border-brand-100 grid grid-cols-2 md:grid-cols-4 gap-4">
                                <div>
                                    <div className="text-xs text-brand-600 font-bold uppercase tracking-wider">Lot Number</div>
                                    <button
                                        onClick={() => openModal('LOT', traceData.lot)}
                                        className="font-mono font-bold text-lg text-brand-700 hover:underline text-left"
                                    >
                                        {traceData.lot.lotNumber}
                                    </button>
                                </div>
                                <div>
                                    <div className="text-xs text-brand-600 font-bold uppercase tracking-wider">Product</div>
                                    <div className="font-medium">{traceData.lot.fgName || 'N/A'}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-brand-600 font-bold uppercase tracking-wider">Date</div>
                                    <div className="font-medium">{traceData.lot.lotDate}</div>
                                </div>
                                <div>
                                    <div className="text-xs text-brand-600 font-bold uppercase tracking-wider">Status</div>
                                    <div className="font-medium">{traceData.lot.status}</div>
                                </div>
                            </div>
                        </div>

                        {/* 2. Production / MR Details */}
                        <div className="relative pl-8 border-l-2 border-blue-200">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-white"></div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Factory size={20} /> Production Source (MR)
                            </h3>
                            {traceData.mr ? (
                                <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                                        <div>
                                            <div className="text-xs text-blue-600 font-bold uppercase tracking-wider">MR ID</div>
                                            <button
                                                onClick={() => openModal('MR', traceData.mr)}
                                                className="font-mono font-bold text-blue-700 hover:underline text-left"
                                            >
                                                {traceData.mr.id}
                                            </button>
                                        </div>
                                        <div>
                                            <div className="text-xs text-blue-600 font-bold uppercase tracking-wider">Shift</div>
                                            <div className="font-medium">Shift {traceData.mr.shift}</div>
                                        </div>
                                        <div>
                                            <div className="text-xs text-blue-600 font-bold uppercase tracking-wider">Created At</div>
                                            <div className="font-medium">{new Date(traceData.mr.createdAt).toLocaleDateString()}</div>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="text-slate-400 italic">No linked Material Requisition found.</div>
                            )}
                        </div>

                        {/* 3. Raw Material Sources */}
                        <div className="relative pl-8 border-l-2 border-emerald-200">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-white"></div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Database size={20} /> Raw Material Sources
                            </h3>

                            <div className="grid gap-4">
                                {traceData.rawMaterials.map((rm, idx) => (
                                    <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                                        <div className="bg-slate-50 px-4 py-2 border-b border-slate-200 flex justify-between items-center">
                                            <span className="font-bold text-slate-700">{rm.material}</span>
                                            <span className="text-sm text-slate-500">{rm.qty} KGS</span>
                                        </div>
                                        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
                                            <div className="flex items-start gap-3">
                                                <Database className="text-emerald-600 mt-1" size={18} />
                                                <div>
                                                    <div className="text-xs font-bold text-slate-500 uppercase">Source Bay</div>
                                                    <div className="font-mono font-bold text-emerald-700">{rm.sourceBay || 'N/A'}</div>
                                                    <div className="text-xs text-slate-400">Current Status: {rm.bayStatus}</div>
                                                </div>
                                            </div>

                                            <div className="flex items-start gap-3">
                                                <Truck className="text-purple-600 mt-1" size={18} />
                                                <div>
                                                    <div className="text-xs font-bold text-slate-500 uppercase">Inward Vehicle (Trace)</div>
                                                    {rm.vehicle ? (
                                                        <div className="text-sm">
                                                            <div className="font-bold text-slate-700">{rm.vehicle.supplierName || rm.vehicle.supplier}</div>
                                                            <div className="text-slate-600">Vehicle: {rm.vehicle.vehicleNo}</div>
                                                            <div className="text-xs text-slate-500 mt-1">
                                                                Invoice: <span className="font-medium">{rm.vehicle.invoiceNumber || '-'}</span>
                                                                <span className="mx-1">•</span>
                                                                {rm.vehicle.invoiceDate ? new Date(rm.vehicle.invoiceDate).toLocaleDateString() : '-'}
                                                            </div>
                                                            <div className="text-xs text-slate-400 mt-1">Received: {new Date(rm.vehicle.updatedAt || Date.now()).toLocaleDateString()}</div>
                                                        </div>
                                                    ) : (
                                                        <div className="text-sm text-slate-400 italic">
                                                            No vehicle trace found for bay {rm.sourceBay}.
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* 4. Sales / Distribution Details */}
                        <div className="relative pl-8 border-l-2 border-indigo-200">
                            <div className="absolute -left-[9px] top-0 w-4 h-4 rounded-full bg-indigo-500 ring-4 ring-white"></div>
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Truck size={20} /> Search Distribution (Sales)
                            </h3>

                            {traceData.salesInvoices && traceData.salesInvoices.length > 0 ? (
                                <div className="grid gap-4">
                                    {traceData.salesInvoices.map((inv, idx) => (
                                        <div key={idx} className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                                            <div className="bg-indigo-50 px-4 py-2 border-b border-indigo-100 flex justify-between items-center">
                                                <div className="flex items-center gap-2">
                                                    <FileText size={16} className="text-indigo-600" />
                                                    <span className="font-bold text-indigo-900">{inv.invoiceNo}</span>
                                                </div>
                                                <span className="text-xs text-indigo-700 font-medium">{inv.date}</span>
                                            </div>
                                            <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <div className="text-xs text-slate-500 uppercase font-bold">Customer</div>
                                                    <div className="font-medium text-slate-800">{inv.customer}</div>
                                                    <div className="text-xs text-slate-400">{inv.destination}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="text-xs text-slate-500 uppercase font-bold">Dispatched</div>
                                                    <div className="font-mono font-bold text-slate-800">{inv.dispatchedQty} KG</div>
                                                    <div className="text-xs text-slate-600">{inv.bags} Bags</div>
                                                </div>
                                                <div className="col-span-full border-t border-slate-50 pt-3 mt-1 flex items-center gap-2 text-sm text-slate-600">
                                                    <Truck size={16} className="text-slate-400" />
                                                    <span>Dispatched via <span className="font-bold">{inv.vehicleNo}</span></span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="p-6 bg-slate-50 rounded-xl border border-dashed border-slate-200 text-center text-slate-500 italic">
                                    No sales invoices found linked to this lot yet.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Details Modal */}
            <Modal
                isOpen={modalConfig.isOpen}
                onClose={closeModal}
                title={modalConfig.type === 'MR' ? 'Material Requisition Details' : 'Production Lot Details'}
            >
                {modalConfig.type === 'MR' && (
                    <MaterialRequisitionForm
                        initialData={modalConfig.data}
                        readOnly={true}
                    />
                )}
                {modalConfig.type === 'LOT' && (
                    <ProductionEntryForm
                        initialData={modalConfig.data}
                        readOnly={true}
                    />
                )}
            </Modal>
        </div>
    );
};

export default TraceabilityReport;
