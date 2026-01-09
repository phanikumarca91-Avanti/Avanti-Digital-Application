import React, { useState } from 'react';
import { Factory } from 'lucide-react';
import { useProduction } from '../../contexts/ProductionContext';
import ProductionEntryForm from '../forms/ProductionEntryForm';

const ProductionEntry = ({ showAlert }) => {
    const { updateLotDetails, lots } = useProduction();

    const [viewMode, setViewMode] = useState('entry'); // 'entry', 'history', 'view_details'
    const [viewData, setViewData] = useState(null);

    // Sort logic from original: Unassigned first? No, history is assigned ones.
    const historyLots = lots.filter(l => l.status !== 'UNASSIGNED').sort((a, b) => new Date(b.lotDate) - new Date(a.lotDate));

    const handleViewDetails = (lot) => {
        setViewData(lot);
        setViewMode('view_details');
    };

    const handleBackToHistory = () => {
        setViewData(null);
        setViewMode('history');
    };

    const handleSubmit = (formData) => {
        updateLotDetails(formData.lotId, {
            fgName: formData.fgName,
            shift: formData.shift,
            mrId: formData.mrId,
            qty: formData.qty,
            uom: 'MT'
        });

        showAlert(`Production Recorded! Lot ${formData.lotId} assigned to ${formData.fgName} (${formData.qty} MT).`);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header with Toggle */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Factory className="text-brand-600" /> Production Entry
                </h2>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => { setViewMode('entry'); setViewData(null); }}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'entry'
                            ? 'bg-white text-brand-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        New Production
                    </button>
                    <button
                        onClick={() => { setViewMode('history'); setViewData(null); }}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'history' || viewMode === 'view_details'
                            ? 'bg-white text-brand-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        History
                    </button>
                </div>
            </div>

            {viewMode === 'entry' && (
                <ProductionEntryForm
                    onSubmit={handleSubmit}
                />
            )}

            {viewMode === 'view_details' && viewData && (
                <div className="relative">
                    <button onClick={handleBackToHistory} className="mb-4 text-sm text-slate-500 hover:text-brand-600 flex items-center gap-1 font-medium">
                        &larr; Back to History
                    </button>
                    <ProductionEntryForm
                        initialData={viewData}
                        readOnly={true}
                    />
                </div>
            )}

            {viewMode === 'history' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">Lot Number</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">FG Name</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Qty (MT)</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {historyLots.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No production history found.</td>
                                </tr>
                            ) : (
                                historyLots.map(lot => (
                                    <tr key={lot.lotNumber} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-mono font-medium text-slate-900">{lot.lotNumber}</td>
                                        <td className="px-6 py-4 text-slate-700">{lot.fgName}</td>
                                        <td className="px-6 py-4 text-slate-600">{lot.qty}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lot.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                lot.status === 'REJECTED' ? 'bg-red-100 text-red-800' :
                                                    'bg-yellow-100 text-yellow-800'
                                                }`}>
                                                {lot.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleViewDetails(lot)}
                                                className="text-brand-600 hover:text-brand-700 font-medium text-xs border border-brand-200 px-3 py-1.5 rounded-lg hover:bg-brand-50"
                                            >
                                                View Details
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default ProductionEntry;
