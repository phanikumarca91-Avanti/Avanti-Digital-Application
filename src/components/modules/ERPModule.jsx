import React, { useState } from 'react';
import { FileText, CheckCircle, AlertTriangle, FileCheck, FileX, History } from 'lucide-react';
import StatusBadge from '../shared/StatusBadge';
import ERPDocument from './ERPDocument';
import LogViewerModal from '../shared/LogViewerModal';

const ERPModule = ({ vehicles, updateStatus, showAlert, openDocument }) => {
    const [viewingDoc, setViewingDoc] = useState(null);
    const [activeTab, setActiveTab] = useState('PENDING');
    const [showLogModal, setShowLogModal] = useState(false);
    const [selectedLogs, setSelectedLogs] = useState([]);
    const pendingERP = vehicles.filter(v => v.status === 'AT_ERP' || v.status === 'RETURN_AT_ERP');
    const historyERP = vehicles.filter(v => v.status === 'AT_SECURITY_OUT' || v.status === 'COMPLETED' || v.status === 'RETURN_AT_SECURITY_OUT' || v.status === 'RETURN_COMPLETED');

    const handleGenerateDoc = (id, type) => {
        const vehicle = vehicles.find(v => v.id === id);
        let docName = '';
        const rate = parseFloat(vehicle.ratePerUOM) || 0;
        const netWeight = parseFloat(vehicle.netWeight) || 0;
        const invoiceQty = parseFloat(vehicle.invoiceQty) || 0;
        const shortQty = (invoiceQty - netWeight).toFixed(2);

        // Determine Current Status (Maintain Status)
        const currentStatus = vehicle.status;

        if (type === 'GRN_WITH_DN') {
            // Generate both GRN and Debit Note
            const grnDocNo = `GRN-${Math.floor(Math.random() * 10000)}`;
            const dnDocNo = `DN-${Math.floor(Math.random() * 10000)}`;
            const grnAmount = (netWeight * rate).toFixed(2);
            const debitAmount = (shortQty * rate).toFixed(2);

            updateStatus(id, currentStatus, {
                documents: {
                    ...vehicle.documents,
                    grn: grnDocNo,
                    grnAmount: grnAmount,
                    debitNote: dnDocNo,
                    debitAmount: debitAmount,
                    shortQty: shortQty
                }
            }, 'Generated GRN & Debit Note');
            showAlert(`Documents Generated: GRN (${grnDocNo}) and DN (${dnDocNo}). Please review and release.`);
            setViewingDoc({ vehicle: { ...vehicle, documents: { ...vehicle.documents, grn: grnDocNo, debitNote: dnDocNo } }, type: 'GRN' });

        } else if (type === 'GRN') {
            docName = `GRN-${Math.floor(Math.random() * 10000)}`;
            const grnAmount = (netWeight * rate).toFixed(2);

            updateStatus(id, currentStatus, {
                documents: { ...vehicle.documents, grn: docName, grnAmount: grnAmount }
            }, 'Generated GRN');
            showAlert(`GRN Generated: ${docName}. Please review and release.`);
            setViewingDoc({ vehicle: { ...vehicle, documents: { ...vehicle.documents, grn: docName } }, type: 'GRN' });

        } else if (type === 'DC') {
            docName = `DC-${Math.floor(Math.random() * 10000)}`;
            updateStatus(id, currentStatus, {
                documents: { ...vehicle.documents, dc: docName }
            }, 'Generated Delivery Challan');
            showAlert(`Delivery Challan Generated: ${docName}. Please review and release.`);
            setViewingDoc({ vehicle: { ...vehicle, documents: { ...vehicle.documents, dc: docName } }, type: 'DC' });

        } else if (type === 'DEBIT_NOTE') {
            docName = `DN-${Math.floor(Math.random() * 10000)}`;
            const debitAmount = (shortQty * rate).toFixed(2);

            updateStatus(id, currentStatus, {
                documents: { ...vehicle.documents, debitNote: docName, debitAmount: debitAmount, shortQty: shortQty }
            }, 'Generated Debit Note');
            showAlert(`Debit Note Generated: ${docName}. Please review and release.`);
            setViewingDoc({ vehicle: { ...vehicle, documents: { ...vehicle.documents, debitNote: docName } }, type: 'DEBIT_NOTE' });

        } else if (type === 'PROV_GRN') {
            docName = `P-GRN-${Math.floor(Math.random() * 10000)}`;
            const grnAmount = (netWeight * rate).toFixed(2);

            updateStatus(id, currentStatus, {
                documents: { ...vehicle.documents, grn: docName, grnAmount: grnAmount },
                isProvisional: true
            }, 'Generated Provisional GRN');
            showAlert(`Provisional GRN Generated: ${docName}. Please review and release.`);
            setViewingDoc({ vehicle: { ...vehicle, documents: { ...vehicle.documents, grn: docName } }, type: 'PROV_GRN' });

        } else if (type === 'RETURN_DN') {
            docName = `DN-${Math.floor(Math.random() * 10000)}`;
            const debitAmount = (netWeight * rate).toFixed(2); // Full net weight is being returned

            updateStatus(id, currentStatus, {
                documents: { ...vehicle.documents, debitNote: docName, debitAmount: debitAmount }
            }, 'Generated Return Debit Note');
            showAlert(`Return DN Generated: ${docName}. Please review and release.`);
            setViewingDoc({ vehicle: { ...vehicle, documents: { ...vehicle.documents, debitNote: docName } }, type: 'DEBIT_NOTE' });
        }
    };

    const handleRelease = (id, isReturn = false) => {
        const nextStatus = isReturn ? 'RETURN_AT_SECURITY_OUT' : 'AT_SECURITY_OUT';
        updateStatus(id, nextStatus, {}, 'Released from ERP');
        showAlert(`Vehicle ${isReturn ? 'Returned' : 'Released'} to Security Gate Out.`);
    };

    return (
        <div className="space-y-8">
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-6 rounded-2xl shadow-card border border-slate-100 flex items-center gap-4">
                    <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
                        <FileText size={24} />
                    </div>
                    <div>
                        <p className="text-sm text-slate-500 font-medium">Pending Actions</p>
                        <h3 className="text-2xl font-bold text-slate-800">{pendingERP.length}</h3>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('PENDING')}
                    className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'PENDING' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}
                >
                    <FileCheck size={18} /> Pending Actions
                    {pendingERP.length > 0 && (
                        <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full text-xs font-bold">
                            {pendingERP.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => setActiveTab('HISTORY')}
                    className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'HISTORY' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}
                >
                    <FileText size={18} /> History
                </button>
            </div>

            {/* Content */}
            {activeTab === 'PENDING' ? (
                <div className="bg-white rounded-2xl shadow-card overflow-hidden border border-slate-100 animate-fade-in">
                    <div className="bg-slate-900 px-6 py-4 flex justify-between items-center">
                        <h3 className="text-white font-bold text-lg flex items-center gap-2">
                            <FileCheck size={20} /> ERP & Documentation
                        </h3>
                    </div>

                    <div className="p-6">
                        {pendingERP.length === 0 ? (
                            <div className="text-center py-12 text-slate-400">
                                <p>No vehicles pending for ERP action.</p>
                            </div>
                        ) : (
                            <div className="grid gap-6">
                                {pendingERP.map(v => {
                                    const isRejected = v.qc2Status === 'REJECTED' || v.qc1Status === 'REJECTED';
                                    const isObservation = v.qc2Status === 'UNDER_OBSERVATION';
                                    const rate = parseFloat(v.ratePerUOM) || 0;
                                    const netWeight = parseFloat(v.netWeight) || 0;
                                    const invoiceQty = parseFloat(v.invoiceQty) || 0;
                                    const shortQty = (invoiceQty - netWeight).toFixed(2);
                                    const debitAmount = (shortQty * rate).toFixed(2);

                                    return (
                                        <div key={v.id} className="bg-slate-50 border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow">
                                            <div className="flex justify-between items-start mb-4">
                                                <div>
                                                    <h4 className="font-bold text-lg text-slate-800">{v.vehicleNo}</h4>
                                                    <p className="text-sm text-slate-500">{v.supplierName}</p>
                                                    <div className="flex gap-2 mt-2">
                                                        <StatusBadge status={v.status} />
                                                        {isRejected && <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full font-bold border border-red-200">QC Rejected</span>}
                                                        {isObservation && <span className="px-2 py-0.5 bg-yellow-100 text-yellow-700 text-xs rounded-full font-bold border border-yellow-200">Under Observation</span>}
                                                    </div>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-xs text-slate-400">Entry: {new Date(v.entryTime).toLocaleTimeString()}</p>
                                                    <p className="font-mono text-sm font-bold text-slate-700 mt-1">{v.uniqueID}</p>
                                                    <button
                                                        onClick={() => { setSelectedLogs(v.logs || []); setShowLogModal(true); }}
                                                        className="text-xs font-bold text-slate-400 hover:text-brand-600 flex items-center justify-end gap-1 transition-colors mt-1 ml-auto"
                                                    >
                                                        <History size={12} /> View Logs
                                                    </button>
                                                </div>
                                            </div>

                                            <div className="grid grid-cols-2 gap-4 text-sm text-slate-600 mb-4 bg-white p-3 rounded-lg border border-slate-100">
                                                <div>
                                                    <span className="block text-xs text-slate-400">Material</span>
                                                    <span className="font-medium">{v.materialName || v.material}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-xs text-slate-400">Net Weight</span>
                                                    <span className="font-medium font-mono">{netWeight} {v.uom}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-xs text-slate-400">Invoice Qty</span>
                                                    <span className="font-medium font-mono">{invoiceQty} {v.uom}</span>
                                                </div>
                                                <div>
                                                    <span className="block text-xs text-slate-400">Rate</span>
                                                    <span className="font-medium font-mono">₹{rate}</span>
                                                </div>
                                            </div>

                                            {shortQty > 0 && (
                                                <div className="mb-4 p-3 bg-red-50 border border-red-100 rounded-lg flex items-start gap-3">
                                                    <AlertTriangle size={18} className="text-red-500 mt-0.5" />
                                                    <div>
                                                        <p className="text-sm font-bold text-red-700">Shortage Detected</p>
                                                        <p className="text-xs text-red-600 mt-1">
                                                            Shortage: <span className="font-mono font-bold">{shortQty} {v.uom}</span>
                                                        </p>
                                                        <p className="text-xs text-red-600">
                                                            Debit Amount: <span className="font-mono font-bold">₹{debitAmount}</span>
                                                        </p>
                                                    </div>
                                                </div>
                                            )}

                                            <div className="flex gap-2">
                                                {/* Logic to determine if documents are already generated */}
                                                {(v.status === 'RETURN_AT_ERP' ? v.documents?.debitNote : (v.documents?.grn || v.documents?.debitNote || v.documents?.dc)) ? (
                                                    <>
                                                        <button
                                                            onClick={() => setViewingDoc({ vehicle: v, type: v.documents?.grn ? (v.isProvisional ? 'PROV_GRN' : 'GRN') : 'DEBIT_NOTE' })}
                                                            className="flex-1 py-3 bg-white border border-brand-200 text-brand-600 rounded-lg font-bold hover:bg-brand-50 transition-colors flex items-center justify-center gap-2"
                                                        >
                                                            <FileText size={18} /> View Doc
                                                        </button>
                                                        <button
                                                            onClick={() => handleRelease(v.id, v.status === 'RETURN_AT_ERP')}
                                                            className="flex-1 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2"
                                                        >
                                                            <CheckCircle size={18} /> Release Vehicle
                                                        </button>
                                                    </>
                                                ) : (
                                                    <button
                                                        onClick={() => handleGenerateDoc(v.id, v.status === 'RETURN_AT_ERP' ? 'RETURN_DN' : (isObservation ? 'PROV_GRN' : (shortQty > 0 ? 'GRN_WITH_DN' : 'GRN')))}
                                                        className={`w-full py-3 ${v.status === 'RETURN_AT_ERP' ? 'bg-red-600 hover:bg-red-700 shadow-red-500/20' : (isObservation ? 'bg-yellow-500 hover:bg-yellow-600 shadow-yellow-500/20' : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20')} text-white rounded-lg font-bold shadow-lg transition-all active:scale-95 flex items-center justify-center gap-2`}
                                                    >
                                                        <FileCheck size={18} />
                                                        {v.status === 'RETURN_AT_ERP'
                                                            ? 'Generate Return DN'
                                                            : (isObservation
                                                                ? 'Generate Provisional GRN'
                                                                : (shortQty > 0 ? 'Generate GRN & Debit Note' : 'Generate GRN')
                                                            )
                                                        }
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div >
                        )}
                    </div >
                </div >
            ) : (
                <div className="bg-white rounded-2xl shadow-card overflow-hidden border border-slate-100 animate-fade-in">
                    <div className="bg-slate-50 px-6 py-4 border-b border-slate-200">
                        <h3 className="font-bold text-slate-700 flex items-center gap-2">
                            <FileText size={20} /> Transaction History
                        </h3>
                    </div>
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                <tr>
                                    <th className="px-6 py-3">Date</th>
                                    <th className="px-6 py-3">Vehicle No</th>
                                    <th className="px-6 py-3">Material</th>
                                    <th className="px-6 py-3">GRN No</th>
                                    <th className="px-6 py-3">Debit Note</th>
                                    <th className="px-6 py-3">Status</th>
                                    <th className="px-6 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {historyERP.length === 0 ? (
                                    <tr>
                                        <td colSpan="7" className="px-6 py-8 text-center text-slate-400">
                                            No history available.
                                        </td>
                                    </tr>
                                ) : (
                                    historyERP.map(v => (
                                        <tr key={v.id} className="hover:bg-slate-50 transition-colors">
                                            <td className="px-6 py-3">
                                                <div className="font-medium text-slate-700">{new Date(v.entryTime).toLocaleDateString()}</div>
                                                <div className="text-xs text-slate-400">{new Date(v.entryTime).toLocaleTimeString()}</div>
                                            </td>
                                            <td className="px-6 py-3 font-medium text-slate-800">{v.vehicleNo}</td>
                                            <td className="px-6 py-3 text-slate-600">{v.materialName || v.material}</td>
                                            <td className="px-6 py-3 font-mono text-slate-600">{v.documents?.grn || '-'}</td>
                                            <td className="px-6 py-3 font-mono text-slate-600">{v.documents?.debitNote || '-'}</td>
                                            <td className="px-6 py-3"><StatusBadge status={v.status} /></td>
                                            <td className="px-6 py-3">
                                                <button
                                                    onClick={() => setViewingDoc({ vehicle: v, type: 'GRN' })}
                                                    className="text-brand-600 hover:text-brand-700 font-medium text-xs hover:underline"
                                                >
                                                    View GRN
                                                </button>
                                                <button
                                                    onClick={() => { setSelectedLogs(v.logs || []); setShowLogModal(true); }}
                                                    className="block mt-1 text-slate-400 hover:text-brand-600 font-medium text-xs hover:underline flex items-center gap-1"
                                                >
                                                    <History size={12} /> Logs
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Document Viewer */}
            {
                viewingDoc && (
                    <ERPDocument
                        vehicle={viewingDoc.vehicle}
                        type={viewingDoc.type}
                        onClose={() => setViewingDoc(null)}
                    />
                )
            }

            {/* Log Viewer Modal */}
            <LogViewerModal
                isOpen={showLogModal}
                onClose={() => setShowLogModal(false)}
                logs={selectedLogs}
                title="Vehicle Audit Logs (ERP)"
            />
        </div >
    );
};

export default ERPModule;
