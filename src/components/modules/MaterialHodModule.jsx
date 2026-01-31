import React, { useState } from 'react';
import { FileCheck, XCircle, CheckCircle, Clock, AlertTriangle, FileText, Filter, Search, History } from 'lucide-react';
import StatusBadge from '../shared/StatusBadge';
import LogViewerModal from '../shared/LogViewerModal';
import { useVehicles } from '../../contexts/VehicleContext';

const MaterialHodModule = ({ showAlert, showConfirm }) => {
    const { vehicles, updateVehicle } = useVehicles();
    const [activeTab, setActiveTab] = useState('PENDING');
    const [showLogModal, setShowLogModal] = useState(false);
    const [selectedLogs, setSelectedLogs] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [rejectionReason, setRejectionReason] = useState('');
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [showRejectModal, setShowRejectModal] = useState(false);

    // Filter vehicles pending HOD approval
    // Includes those at Security Out (waiting to leave) and those who have left (Pending HOD)
    const pendingVehicles = vehicles.filter(v =>
        v.status === 'PROVISIONAL_PENDING_HOD' ||
        (v.status === 'AT_SECURITY_OUT' && v.isProvisional)
    );

    // Filter history (Approved or Rejected by HOD)
    // Assuming they go to COMPLETED (Approved) or REJECTED_RETURN_PENDING (Rejected)
    // We can filter by checking logs for 'HOD' stage or implied by status if unique
    const historyVehicles = vehicles.filter(v =>
        (v.status === 'COMPLETED' || v.status === 'REJECTED_RETURN_PENDING' || v.status === 'RETURN_VEHICLE_INSIDE' || v.status === 'RETURN_COMPLETED') &&
        v.isProvisional === true // Flag to identify these were provisional
    );

    // Helper to match legacy prop signature
    const updateStatus = (id, status, data, logAction) => {
        updateVehicle(id, { status, ...data }, logAction ? {
            stage: 'HOD',
            action: logAction,
            timestamp: new Date().toISOString(),
            user: 'HOD_USER'
        } : null);
    };

    const handleApprove = (vehicleAndId) => {
        showConfirm(`Approve Provisional GRN ${vehicleAndId.documents?.grn || ''}? This will convert it to a Final GRN.`, () => {
            // Logic to convert P-GRN to GRN (remove P- prefix or generate new)
            const finalGrn = (vehicleAndId.documents?.grn || '').replace('P-', '');

            updateStatus(vehicleAndId.id, 'COMPLETED', {
                status: 'COMPLETED',
                documents: {
                    ...vehicleAndId.documents,
                    grn: finalGrn
                },
                isProvisional: false, // Cleared
                hodDecision: 'APPROVED',
                hodDecisionTime: new Date().toISOString()
            }, 'HOD Approved. Provisional GRN converted to Final GRN.');

            showAlert(`Approved! Final GRN ${finalGrn} generated.`);
        });
    };

    const handleReject = (e) => {
        e.preventDefault();
        if (!rejectionReason.trim()) {
            showAlert("Rejection reason is mandatory.");
            return;
        }

        updateStatus(selectedVehicle.id, 'REJECTED_RETURN_PENDING', {
            status: 'REJECTED_RETURN_PENDING',
            hodDecision: 'REJECTED',
            hodRemarks: rejectionReason,
            hodDecisionTime: new Date().toISOString()
        }, `HOD Rejected. Reason: ${rejectionReason}`);

        showAlert("Vehicle marked for Return. Supplier must pick up the material.");
        setShowRejectModal(false);
        setRejectionReason('');
        setSelectedVehicle(null);
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Material HOD Approval</h1>
                    <p className="text-slate-500">Review Provisional GRNs & Under Observation Material</p>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('PENDING')}
                    className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'PENDING' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <Clock size={18} /> Pending Approval
                    {pendingVehicles.length > 0 && (
                        <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full text-xs font-bold">
                            {pendingVehicles.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('HISTORY')}
                    className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'HISTORY' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                >
                    <FileCheck size={18} /> History
                </button>
            </div>

            {/* Pending Tab */}
            {activeTab === 'PENDING' && (
                <div className="space-y-4 animate-fade-in">
                    {pendingVehicles.length === 0 ? (
                        <div className="bg-white rounded-xl shadow-sm p-12 text-center text-slate-400 border border-slate-200">
                            <CheckCircle size={48} className="mx-auto mb-4 opacity-20" />
                            <p>No provisional GRNs pending approval.</p>
                        </div>
                    ) : (
                        <div className="grid gap-4">
                            {pendingVehicles.map(v => (
                                <div key={v.id} className="bg-white rounded-xl p-6 shadow-sm border border-slate-200 flex flex-col md:flex-row gap-6">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="bg-yellow-100 text-yellow-800 text-xs font-bold px-2 py-1 rounded border border-yellow-200">Under Observation</span>
                                            <span className="font-mono text-xs text-slate-400">{v.uniqueID}</span>
                                        </div>
                                        <h3 className="text-lg font-bold text-slate-800">{v.vehicleNo}</h3>
                                        <p className="text-slate-600 mb-1">{v.supplierName}</p>
                                        <p className="text-sm text-slate-500">{v.materialName}</p>

                                        <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-100 text-sm">
                                            <div className="flex justify-between mb-1">
                                                <span className="text-slate-500">Provisional GRN:</span>
                                                <span className="font-mono font-bold">{v.documents?.grn || '-'}</span>
                                            </div>
                                            <div className="flex justify-between mb-1">
                                                <span className="text-slate-500">Net Weight:</span>
                                                <span className="font-mono font-bold">{v.netWeight} {v.uom}</span>
                                            </div>
                                            <div className="flex justify-between">
                                                <span className="text-slate-500">QC Remarks:</span>
                                                <span className="italic text-slate-700">{v.qc2Remarks || 'No remarks'}</span>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="flex flex-col justify-center gap-3 min-w-[200px]">
                                        <button
                                            onClick={() => handleApprove(v)}
                                            className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                                        >
                                            <CheckCircle size={18} /> Approve (Finalize)
                                        </button>
                                        <button
                                            onClick={() => { setSelectedVehicle(v); setShowRejectModal(true); }}
                                            className="w-full py-2 bg-white border border-red-200 text-red-600 hover:bg-red-50 rounded-lg font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
                                        >
                                            <XCircle size={18} /> Reject (Return)
                                        </button>
                                        <button
                                            onClick={() => { setSelectedLogs(v.logs || []); setShowLogModal(true); }}
                                            className="w-full py-2 text-slate-400 hover:text-brand-600 text-sm font-medium flex items-center justify-center gap-2"
                                        >
                                            <History size={16} /> View Logs
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}

            {/* History Tab */}
            {activeTab === 'HISTORY' && (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-3">Date</th>
                                <th className="px-6 py-3">Vehicle / ID</th>
                                <th className="px-6 py-3">P-GRN / Final GRN</th>
                                <th className="px-6 py-3">HOD Status</th>
                                <th className="px-6 py-3">Remarks</th>
                                <th className="px-6 py-3">Logs</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {historyVehicles.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-8 text-center text-slate-400">No history found.</td>
                                </tr>
                            ) : (
                                historyVehicles.map(v => (
                                    <tr key={v.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-3 text-slate-600">
                                            {v.hodDecisionTime ? new Date(v.hodDecisionTime).toLocaleDateString() : '-'}
                                        </td>
                                        <td className="px-6 py-3">
                                            <div className="font-bold text-slate-800">{v.vehicleNo}</div>
                                            <div className="font-mono text-xs text-slate-400">{v.uniqueID}</div>
                                        </td>
                                        <td className="px-6 py-3 font-mono text-slate-600">
                                            {v.documents?.grn || '-'}
                                        </td>
                                        <td className="px-6 py-3">
                                            <StatusBadge status={v.hodDecision === 'APPROVED' ? 'COMPLETED' : 'REJECTED_RETURN_PENDING'} />
                                            {/* Custom badge specifically for decision */}
                                            <div className={`text-[10px] font-bold mt-1 ${v.hodDecision === 'APPROVED' ? 'text-green-600' : 'text-red-600'}`}>
                                                HOD: {v.hodDecision || '-'}
                                            </div>
                                        </td>
                                        <td className="px-6 py-3 text-slate-600 italic truncate max-w-xs" title={v.hodRemarks}>
                                            {v.hodRemarks || '-'}
                                        </td>
                                        <td className="px-6 py-3">
                                            <button
                                                onClick={() => { setSelectedLogs(v.logs || []); setShowLogModal(true); }}
                                                className="text-slate-400 hover:text-brand-600"
                                            >
                                                <History size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}

            {/* Reject Modal */}
            {showRejectModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6">
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                <AlertTriangle className="text-red-500" /> Reject & Return
                            </h3>
                            <button onClick={() => setShowRejectModal(false)} className="text-slate-400 hover:text-slate-600">
                                <XCircle size={24} />
                            </button>
                        </div>

                        <p className="text-slate-600 text-sm mb-4">
                            You are about to reject the material for vehicle <strong>{selectedVehicle?.vehicleNo}</strong>.
                            This will initiate the <strong>Return Material</strong> workflow.
                        </p>

                        <form onSubmit={handleReject}>
                            <label className="block text-sm font-bold text-slate-700 mb-2">
                                Reason for Rejection <span className="text-red-500">*</span>
                            </label>
                            <textarea
                                required
                                value={rejectionReason}
                                onChange={(e) => setRejectionReason(e.target.value)}
                                className="w-full border border-slate-300 rounded-lg p-3 text-sm focus:ring-2 focus:ring-red-500/20 outline-none h-24 resize-none"
                                placeholder="Enter specific comments on why this material is being rejected..."
                            ></textarea>

                            <div className="flex gap-3 mt-6">
                                <button
                                    type="button"
                                    onClick={() => setShowRejectModal(false)}
                                    className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold shadow-lg shadow-red-500/20 transition-colors"
                                >
                                    Confirm Rejection
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Log Viewer */}
            <LogViewerModal
                isOpen={showLogModal}
                onClose={() => setShowLogModal(false)}
                logs={selectedLogs}
                title="Vehicle History"
            />
        </div>
    );
};

export default MaterialHodModule;
