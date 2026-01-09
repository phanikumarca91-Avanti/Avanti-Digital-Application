import React, { useState, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useWarehouse } from '../../contexts/WarehouseContext';
import MaterialRequisitionForm from '../forms/MaterialRequisitionForm';

const MaterialRequisition = ({ showAlert }) => {
    const { currentLocation, currentUnit } = useOrganization();
    const [viewMode, setViewMode] = useState('entry'); // 'entry' or 'history'
    const { getAllMRs, createMR } = useWarehouse();

    const historyMRs = getAllMRs().sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const [reqId, setReqId] = useState('');

    useEffect(() => {
        if (currentLocation && currentUnit) {
            const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
            const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
            setReqId(`MR-${currentLocation.id}-${currentUnit.id}-${dateStr}-${random}`);
        }
    }, [currentLocation, currentUnit]);

    // View Details Logic
    const [viewData, setViewData] = useState(null);

    const handleViewDetails = (mr) => {
        setViewData(mr);
        setViewMode('view_details');
    };

    const handleBackToHistory = () => {
        setViewData(null);
        setViewMode('history');
    };

    const handleSubmit = (formData) => {
        createMR(formData);
        showAlert(`Requisition ${formData.id} Submitted Successfully!`);

        // Regenerate ID
        const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
        setReqId(`MR-${currentLocation.id}-${currentUnit.id}-${dateStr}-${random}`);
    };

    return (
        <div className="space-y-6">
            {/* Header with Toggle */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Plus className="text-brand-600" /> Material Requisition
                </h2>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => { setViewMode('entry'); setViewData(null); }}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'entry'
                            ? 'bg-white text-brand-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        New Request
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
                <MaterialRequisitionForm
                    reqId={reqId}
                    onSubmit={handleSubmit}
                />
            )}

            {viewMode === 'view_details' && viewData && (
                <div className="relative">
                    <button onClick={handleBackToHistory} className="mb-4 text-sm text-slate-500 hover:text-brand-600 flex items-center gap-1 font-medium">
                        &larr; Back to History
                    </button>
                    <MaterialRequisitionForm
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
                                <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">MR ID</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Shift</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Target FGs</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {historyMRs.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-500">No requisition history found.</td>
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
                                        <td className="px-6 py-4 text-slate-600">
                                            {mr.fgs?.map(f => f.name).join(', ')}
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


export default MaterialRequisition;
