import React, { useState } from 'react';
import { ClipboardList, Package, Factory, LayoutGrid, ArrowDownToLine, ClipboardCheck, History } from 'lucide-react';
import MaterialRequisition from '../production/MaterialRequisition';
import DumpingEntry from '../production/DumpingEntry';
import LotGeneration from '../production/LotGeneration';
import ProductionEntry from '../production/ProductionEntry';
import MRClosure from '../production/MRClosure';
import BinList from '../production/BinList';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { useProduction } from '../../contexts/ProductionContext';

const ProductionModule = ({ showAlert }) => {
    const [activeTab, setActiveTab] = useState('MR');
    const { getOpenMRs, getAllMRs } = useWarehouse();
    const { getLotsByStatus } = useProduction();

    // Calculate Badge Counts
    const openMRs = getOpenMRs();
    const pendingDumping = openMRs.filter(mr => mr.status === 'PENDING_DUMPING').length;
    const inProgressMRs = openMRs.filter(mr => mr.status === 'IN_PROGRESS').length;
    const unassignedLots = getLotsByStatus('UNASSIGNED').length;

    // Get History Data
    const allMRs = getAllMRs();
    const closedMRs = allMRs.filter(mr => mr.status === 'CLOSED').sort((a, b) => new Date(b.closedAt) - new Date(a.closedAt));

    const tabs = [
        {
            id: 'MR',
            label: 'Material Requisition',
            icon: ClipboardList,
            badge: null
        },
        {
            id: 'DUMPING',
            label: 'Dumping Entry',
            icon: ArrowDownToLine,
            badge: pendingDumping > 0 ? pendingDumping : null
        },
        {
            id: 'BINS',
            label: 'Bin Status',
            icon: LayoutGrid,
            badge: null
        },
        {
            id: 'LOT_GEN',
            label: 'Lot Generation',
            icon: Factory,
            badge: null
        },
        {
            id: 'PRODUCTION',
            label: 'Production Entry',
            icon: Package, // Icon for assigning FG
            badge: unassignedLots > 0 ? unassignedLots : null
        },
        {
            id: 'MR_CLOSURE',
            label: 'MR Closure',
            icon: ClipboardCheck,
            badge: inProgressMRs > 0 ? inProgressMRs : null
        },
        {
            id: 'HISTORY',
            label: 'History',
            icon: History,
            badge: null
        }
    ];

    return (
        <div className="space-y-6">
            {/* Module Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Production Management</h1>
                    <p className="text-slate-500">Manage Requisitions, Dumping, and Production Lots</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200 overflow-x-auto">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors whitespace-nowrap ${activeTab === tab.id
                            ? 'border-brand-600 text-brand-600'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                            }`}
                    >
                        <tab.icon size={18} />
                        {tab.label}
                        {tab.badge && (
                            <span className="absolute top-2 right-1 flex h-2.5 w-2.5">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500"></span>
                            </span>
                        )}
                    </button>
                ))}
            </div>

            {/* Content Area */}
            <div className="animate-fade-in">
                {activeTab === 'MR' && <MaterialRequisition showAlert={showAlert} />}
                {activeTab === 'DUMPING' && <DumpingEntry showAlert={showAlert} />}
                {activeTab === 'BINS' && <BinList />}
                {activeTab === 'LOT_GEN' && <LotGeneration showAlert={showAlert} />}
                {activeTab === 'PRODUCTION' && <ProductionEntry showAlert={showAlert} />}
                {activeTab === 'MR_CLOSURE' && <MRClosure showAlert={showAlert} />}

                {activeTab === 'HISTORY' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Closed Date</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">MR ID</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Material</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Requested Qty</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {closedMRs.length === 0 ? (
                                        <tr>
                                            <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No completed production history found.</td>
                                        </tr>
                                    ) : (
                                        closedMRs.map(mr => (
                                            <tr key={mr.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 text-slate-500">{new Date(mr.closedAt).toLocaleDateString()}</td>
                                                <td className="px-6 py-4 font-medium text-slate-900">{mr.id}</td>
                                                <td className="px-6 py-4 text-slate-500">{mr.material || mr.materialName || (mr.items && mr.items[0]?.materialName) || '-'}</td>
                                                <td className="px-6 py-4 font-mono text-slate-600">{mr.qty} {mr.uom}</td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-700">
                                                        Closed
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ProductionModule;
