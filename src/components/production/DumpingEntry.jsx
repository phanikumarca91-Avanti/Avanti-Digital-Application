import React, { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { useWarehouse } from '../../contexts/WarehouseContext';
import DumpingEntryForm from '../forms/DumpingEntryForm';

const DumpingEntry = ({ showAlert }) => {
    const { getAllMRs, updateBinStock, updateMRStatus } = useWarehouse();

    // Filter history MRs
    const historyMRs = getAllMRs().filter(mr => mr.status === 'IN_PROGRESS' || mr.status === 'CLOSED');

    const [viewMode, setViewMode] = useState('entry'); // 'entry', 'history', 'view_details'
    const [viewData, setViewData] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleViewDetails = (mr) => {
        setViewData(mr);
        setViewMode('view_details');
    };

    const handleBackToHistory = () => {
        setViewData(null);
        setViewMode('history');
    };

    const handleSubmit = (formData) => {
        if (isSubmitting) return;
        setIsSubmitting(true);

        // 1. Deduct from Source Bay (Pass UOM)
        updateBinStock(formData.item.sourceBay, formData.qty, formData.item.name, 'REMOVE', null, formData.item.uom);

        // 2. Add to Target Bin (Pass UOM for conversion)
        updateBinStock(formData.binId, formData.qty, formData.item.name, 'ADD', null, formData.item.uom);

        // 3. Update MR Status to IN_PROGRESS so it shows in history
        updateMRStatus(formData.mr.id, 'IN_PROGRESS', {
            action: 'DUMP',
            item: formData.item.name,
            qty: formData.qty,
            bin: formData.binId,
            timestamp: new Date().toISOString()
        });

        showAlert(`Successfully Dumped ${formData.qty} ${formData.item.uom} of ${formData.item.name} from ${formData.item.sourceBay} into ${formData.binId}`);
        setTimeout(() => setIsSubmitting(false), 1000);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header with Toggle */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <ArrowRight className="text-brand-600" /> Material Dumping
                </h2>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => { setViewMode('entry'); setViewData(null); }}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'entry'
                            ? 'bg-white text-brand-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        New Entry
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
                <DumpingEntryForm
                    onSubmit={handleSubmit}
                />
            )}

            {viewMode === 'view_details' && viewData && (
                <div className="relative">
                    <button onClick={handleBackToHistory} className="mb-4 text-sm text-slate-500 hover:text-brand-600 flex items-center gap-1 font-medium">
                        &larr; Back to History
                    </button>
                    {/* 
                        Use Form in ReadOnly. 
                        Since MR might have multiple items, this simple form might only show the MR ID. 
                        Ideally we'd want to see which bins were assigned, but that data isn't easily available on the MR object 
                        unless we tracked it during dumping.
                        For now, we display the View state of the MR ID.
                     */}
                    <DumpingEntryForm
                        initialData={{
                            mrId: viewData.id,
                            // If we want to show items, we might need to enhance the form to show a list in read-only mode, 
                            // or iteration through items. 
                            // For now, simpler is better to match the 'single form' requirement.
                            material: viewData.items[0]?.name, // Just showing first item as example or empty
                            qty: viewData.items[0]?.qty,
                            sourceBay: viewData.items[0]?.sourceBay
                        }}
                        readOnly={true}
                    />
                </div>
            )}

            {viewMode === 'history' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">MR ID</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Shift</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {historyMRs.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-8 text-center text-slate-500">No dumping history found.</td>
                                </tr>
                            ) : (
                                historyMRs.map(mr => (
                                    <tr key={mr.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-slate-500">{new Date(mr.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{mr.id}</td>
                                        <td className="px-6 py-4 text-slate-500">{mr.shift}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${mr.status === 'CLOSED' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                                                }`}>
                                                {mr.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4">
                                            <button
                                                onClick={() => handleViewDetails(mr)}
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

export default DumpingEntry;
