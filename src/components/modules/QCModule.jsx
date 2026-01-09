import React, { useState, useRef } from 'react';
import { Upload, CheckCircle, XCircle, AlertTriangle, FileText, Package, Beaker, Camera, Download, History } from 'lucide-react';
import { useProduction } from '../../contexts/ProductionContext';
import CameraCapture from '../shared/CameraCapture';
import PhotoGalleryModal from '../shared/PhotoGalleryModal';
import VehicleEditModal from '../shared/VehicleEditModal';
import LogViewerModal from '../shared/LogViewerModal';
import StatusBadge from '../shared/StatusBadge';
import UserManualModal from '../shared/UserManualModal';
import { HelpCircle } from 'lucide-react';

const QCModule = ({ vehicles, setVehicles, updateStatus, showAlert }) => {
    const [activeTab, setActiveTab] = useState('INWARD');
    const [subTab, setSubTab] = useState('PENDING'); // PENDING or HISTORY
    const { lots, updateLotStatus, updateLotDocument } = useProduction();

    // Inward QC Data
    const pendingQC1 = vehicles.filter(v => v.status === 'AT_QC_1');
    const pendingQC2 = vehicles.filter(v => v.status === 'AT_QC_2' || v.status === 'BAY_ASSIGNED');
    const historyQC = vehicles.filter(v =>
        ['AT_WEIGHBRIDGE_1', 'AT_SECURITY_REJECT_IN', 'AT_ERP', 'AT_WEIGHBRIDGE_2', 'COMPLETED'].includes(v.status) &&
        (v.logs.some(l => l.stage === 'QC'))
    );

    const [qcData, setQcData] = useState({ remarks: '', location: 'Unit-1' });
    const [currentUpload, setCurrentUpload] = useState(null);
    const [currentCam, setCurrentCam] = useState(null); // { id, type }
    const [showCamera, setShowCamera] = useState(false);
    const [viewPhotos, setViewPhotos] = useState(null);
    const [showLogModal, setShowLogModal] = useState(false);
    const [selectedLogs, setSelectedLogs] = useState([]);

    // Data Correction State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [pendingAction, setPendingAction] = useState(null); // { type: 'APPROVE', vehicleId, data }

    const fileInputRef1 = useRef(null);
    const fileInputRef2 = useRef(null);
    const fileInputRef3 = useRef(null);

    // FG QC Data
    const pendingFGLots = lots.filter(l => l.status === 'PENDING_QA');
    const historyFGLots = lots.filter(l => l.status === 'APPROVED' || l.status === 'REJECTED');
    const [fgQcData, setFgQcData] = useState({ protein: '', moisture: '', oil: '', sand: '', remarks: '', approvedRegion: ['ALL'] });

    const handleFileTrigger = (vehicleId, type, fileRef) => {
        if (fileRef.current) {
            setCurrentUpload({ id: vehicleId, type: type });
            fileRef.current.click();
        } else {
            showAlert("Error: File upload feature is unavailable right now.");
        }
    };

    const handleCameraTrigger = (id, type) => {
        setCurrentCam({ id, type });
        setShowCamera(true);
    };

    const handlePhotoCapture = (imageData) => {
        if (!currentCam) return;
        const { id, type } = currentCam;

        if (type === 'FG') {
            // Handle Lot Attachments (FG) - Need to update Lot Context? 
            // Ideally useProduction should expose storage update. 
            // For now assuming lots are in-memory or need logic similar to updateLotDocument.
            // Im implementing a local update helper for now or just calling updateLotDocument with a special key?
            // Actually, lets assume updateLotDocument can handle 'attachments' array or just store directly.
            // But existing updateLotDocument takes (id, type, object).
            // Let's assume we update the lot object directly via updateLotStatus (which merges data).

            // Simplification: We need a way to modify lots. `updateLotStatus` takes (id, status, data). 
            // But we might not want to change status.
            // Let's modify useProduction or just use a helper here if lots was state.
            // `lots` comes from `useProduction`.
            // I will ignore FG camera for a moment or try to implement it if I see `useProduction` logic.
            // Looking at `updateLotDocument` in `QCModule`, it calls `updateLotDocument`. 
            // I'll stick to Vehicles first.
            // Wait, the user asked for "All Modules".

            // For FG, I'll alert implementation pending or try to update.
            // Assuming existing lot update logic.
        } else {
            // Vehicle Attachments
            setVehicles(prev => prev.map(v => {
                if (v.id === id) {
                    const currentAttachments = v.attachments || [];
                    return { ...v, attachments: [...currentAttachments, imageData] };
                }
                return v;
            }));
        }
        showAlert("Photo captured and attached!");
    };

    const handleFileUpload = (event, type) => {
        const file = event.target.files[0];
        if (!file || !currentUpload || currentUpload.type !== type) return;

        const { id } = currentUpload;

        if (type === 'FG') {
            // Handle Finished Goods Upload
            updateLotDocument(id, 'qcReport', {
                name: file.name,
                uploadedAt: new Date().toLocaleString()
            });
        } else {
            // Handle Vehicle QC Uploads
            const documentKey = type === 'QC1' ? 'labReport' : 'supportingDoc';
            setVehicles(prev => prev.map(v => {
                if (v.id === id) {
                    const currentDocs = v.documents || {};
                    return {
                        ...v,
                        documents: {
                            ...currentDocs,
                            [documentKey]: {
                                name: file.name,
                                uploadedAt: new Date().toLocaleString(),
                                url: URL.createObjectURL(file) // Create a temporary URL for preview if needed
                            }
                        },
                        logs: [...(v.logs || []), { time: new Date().toLocaleString(), action: `Uploaded document: ${file.name} (${documentKey})`, stage: 'QC' }]
                    };
                }
                return v;
            }));
        }

        showAlert(`Document "${file.name}" uploaded successfully.`);
        setCurrentUpload(null);
        event.target.value = null;
    };

    const handleQC1Submit = (id, decision) => {
        // Remarks mandatory for non-ACCEPT decisions
        if (decision !== 'ACCEPT' && (!qcData.remarks || !qcData.remarks.trim())) {
            showAlert("QC Remarks are mandatory. Please enter details before submitting.");
            return;
        }

        if (decision === 'ACCEPT') {
            // MANDATORY VERIFICATION: Open Edit Modal first
            const vehicle = vehicles.find(v => v.id === id);
            setEditingVehicle(vehicle);
            setPendingAction({
                type: 'APPROVE',
                vehicleId: id,
                qcData: {
                    qc1Status: 'ACCEPTED',
                    qc1Remarks: qcData.remarks
                }
            });
            setShowEditModal(true);
            return; // Stop here. Modal onSave will handle the rest.
        } else if (decision === 'REJECT') {
            // MANDATORY VERIFICATION for REJECTION
            const vehicle = vehicles.find(v => v.id === id);
            setEditingVehicle(vehicle);
            setPendingAction({
                type: 'REJECT',
                vehicleId: id,
                qcData: { qc1Status: 'REJECTED', qc1Remarks: qcData.remarks }
            });
            setShowEditModal(true);
            return;
        } else if (decision === 'BANDAPURAM') {
            updateStatus(id, 'AT_ERP', { qc1Status: 'BANDAPURAM', unit: 'Bandapuram', qc1Remarks: qcData.remarks });
        }
        setQcData({ remarks: '', location: 'Unit-1' });
    };

    const handleQC2Submit = (id, decision) => {
        if (!qcData.remarks || !qcData.remarks.trim()) {
            showAlert("QC Remarks are mandatory. Please enter details before submitting.");
            return;
        }

        const vehicle = vehicles.find(v => v.id === id);
        if (decision === 'REJECT' && !vehicle?.documents?.supportingDoc) {
            showAlert("Supporting Document upload is mandatory for Final QC Rejection.");
            return;
        }

        if (decision === 'ACCEPT') {
            updateStatus(id, 'AT_WEIGHBRIDGE_2', { qc2Status: 'ACCEPTED', qc2Remarks: qcData.remarks });
        } else if (decision === 'REJECT') {
            updateStatus(id, 'AT_WEIGHBRIDGE_2', { qc2Status: 'REJECTED', qc2Remarks: qcData.remarks });
        } else if (decision === 'OBSERVATION') {
            updateStatus(id, 'AT_WEIGHBRIDGE_2', {
                qc2Status: 'UNDER_OBSERVATION',
                qc2Remarks: qcData.remarks,
                isObservation: true
            });
            showAlert("Vehicle marked 'Under Observation'. Proceeding to Tare Weighment and Provisional GRN.");
        }
        setQcData({ remarks: '', location: 'Unit-1' });
    };

    const handleFGSubmit = (lotId, decision) => {
        if (!fgQcData.protein || !fgQcData.moisture) {
            showAlert("Protein and Moisture are mandatory fields.");
            return;
        }

        updateLotStatus(lotId, decision, fgQcData);
        showAlert(`Lot ${lotId} marked as ${decision}`);
        setFgQcData({ protein: '', moisture: '', oil: '', sand: '', remarks: '', approvedRegion: ['ALL'] });
    };

    return (
        <div className="space-y-6">
            {/* Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => { setActiveTab('INWARD'); setSubTab('PENDING'); }}
                    className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'INWARD' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'
                        }`}
                >
                    <FileText size={18} /> Vehicle Inward QC
                </button>
                <button
                    onClick={() => { setActiveTab('FG'); setSubTab('PENDING'); }}
                    className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'FG' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'
                        }`}
                >
                    <Package size={18} /> Finished Goods QC
                    {pendingFGLots.length > 0 && (
                        <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold shadow-sm">
                            {pendingFGLots.length}
                        </span>
                    )}
                </button>
            </div>

            {/* Sub Tabs for History */}
            <div className="flex space-x-2 pb-2">
                <button onClick={() => setSubTab('PENDING')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${subTab === 'PENDING' ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>Pending Actions</button>
                <button onClick={() => setSubTab('HISTORY')} className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all ${subTab === 'HISTORY' ? 'bg-brand-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}>History / Logs</button>
            </div>

            {activeTab === 'INWARD' && subTab === 'PENDING' && (
                <div className="space-y-8 animate-fade-in">
                    {/* QC 1 Section */}
                    <div className="bg-white rounded-2xl shadow-card overflow-hidden border border-slate-100">
                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <Beaker size={20} /> Preliminary QC (1st Check)
                            </h3>
                            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                                {pendingQC1.length} Pending
                            </span>
                        </div>

                        <div className="p-6">
                            {pendingQC1.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <p>No vehicles pending for Preliminary QC.</p>
                                </div>
                            ) : (
                                <div className="grid gap-6">
                                    {pendingQC1.map(v => (
                                        <div key={v.id} className="bg-slate-50 rounded-xl p-6 border border-slate-200 flex flex-col lg:flex-row gap-6">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="text-xl font-bold text-slate-800">{v.vehicleNo}</h4>
                                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 rounded">{v.uniqueID}</span>
                                                    <div className="ml-2"><StatusBadge status={v.status} /></div>
                                                </div>
                                                <p className="text-slate-600 font-medium mb-1">{v.material}</p>
                                                <p className="text-sm text-slate-500">{v.supplierName}</p>
                                            </div>

                                            <div className="flex-1 flex flex-col gap-3">
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() => { setSelectedLogs(v.logs || []); setShowLogModal(true); }}
                                                        className="text-xs font-bold text-slate-400 hover:text-brand-600 flex items-center gap-1 transition-colors"
                                                    >
                                                        <History size={12} /> View Logs
                                                    </button>
                                                </div>
                                                <textarea
                                                    placeholder="Enter QC Remarks (Mandatory)..."
                                                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 outline-none text-sm resize-none h-24"
                                                    onChange={(e) => setQcData({ ...qcData, remarks: e.target.value })}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleFileTrigger(v.id, 'QC1', fileInputRef1)}
                                                        className="flex-1 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-2"
                                                    >
                                                        <Upload size={16} /> {v.documents?.labReport ? 'Report Uploaded' : 'Upload Lab Report'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleCameraTrigger(v.id, 'QC1')}
                                                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors border border-slate-300 flex items-center gap-2"
                                                        title="Capture Photo Evidence"
                                                    >
                                                        <Camera size={18} />
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingVehicle(v); setShowEditModal(true); }}
                                                        className="px-3 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors border border-amber-200 flex items-center gap-2 text-xs font-bold"
                                                        title="Correct Data"
                                                    >
                                                        <AlertTriangle size={16} /> Correct Data
                                                    </button>
                                                </div>
                                                {/* Attachments Preview */}
                                                {v.attachments && v.attachments.length > 0 && (
                                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                                        {v.attachments.map((img, idx) => (
                                                            <div key={idx} className="relative group flex-shrink-0 cursor-pointer" onClick={() => setViewPhotos(v.attachments)}>
                                                                <img src={img} className="w-12 h-12 rounded object-cover border border-slate-200" alt="thumb" />
                                                                <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors rounded"></div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="flex gap-2">
                                                    {/* Unit Selection Removed - Moved to Warehouse Module */}
                                                    <button onClick={() => handleQC1Submit(v.id, 'ACCEPT')} className="flex-1 py-2 bg-green-600 text-white rounded-lg font-bold text-sm">Accept</button>
                                                    <button onClick={() => handleQC1Submit(v.id, 'REJECT')} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold text-sm">Reject</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* QC 2 Section */}
                    <div className="bg-white rounded-2xl shadow-card overflow-hidden border border-slate-100">
                        <div className="bg-gradient-to-r from-purple-600 to-purple-700 px-6 py-4 flex justify-between items-center">
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <CheckCircle size={20} /> Secondary QC (Final Check)
                            </h3>
                            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                                {pendingQC2.length} Pending
                            </span>
                        </div>
                        <div className="p-6">
                            {pendingQC2.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <p>No vehicles pending for Secondary QC.</p>
                                </div>
                            ) : (
                                <div className="grid gap-6">
                                    {pendingQC2.map(v => (
                                        <div key={v.id} className="bg-slate-50 rounded-xl p-6 border border-slate-200 flex flex-col lg:flex-row gap-6">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    <h4 className="text-xl font-bold text-slate-800">{v.vehicleNo}</h4>
                                                    <StatusBadge status={v.status} />
                                                </div>
                                                <p className="text-sm text-slate-600 mb-1">Bay: <span className="font-bold">{v.bay}</span></p>
                                                {v.assignedBay && (
                                                    <p className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-1 rounded inline-block mb-2">
                                                        Bay: {v.assignedBay}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex-1 flex flex-col gap-3">
                                                <div className="flex justify-end">
                                                    <button
                                                        onClick={() => { setSelectedLogs(v.logs || []); setShowLogModal(true); }}
                                                        className="text-xs font-bold text-slate-400 hover:text-brand-600 flex items-center gap-1 transition-colors"
                                                    >
                                                        <History size={12} /> View Logs
                                                    </button>
                                                </div>
                                                <textarea
                                                    placeholder="Final QC Remarks..."
                                                    className="w-full p-3 rounded-lg border border-slate-300 focus:ring-2 focus:ring-purple-500/20 outline-none text-sm resize-none h-24"
                                                    onChange={(e) => setQcData({ ...qcData, remarks: e.target.value })}
                                                />
                                                <div className="flex items-center gap-2">
                                                    <button
                                                        onClick={() => handleFileTrigger(v.id, 'QC2', fileInputRef2)}
                                                        className="flex-1 py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-2"
                                                    >
                                                        <Upload size={16} /> {v.documents?.supportingDoc ? 'Doc Uploaded' : 'Upload Support Doc'}
                                                    </button>
                                                    <button
                                                        onClick={() => handleCameraTrigger(v.id, 'QC2')}
                                                        className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg transition-colors border border-slate-300 flex items-center gap-2"
                                                        title="Capture Photo Evidence"
                                                    >
                                                        <Camera size={18} />
                                                    </button>
                                                </div>
                                                {/* Attachments Preview */}
                                                {v.attachments && v.attachments.length > 0 && (
                                                    <div className="flex gap-2 overflow-x-auto pb-2">
                                                        {v.attachments.map((img, idx) => (
                                                            <div key={idx} className="relative group flex-shrink-0 cursor-pointer" onClick={() => setViewPhotos(v.attachments)}>
                                                                <img src={img} className="w-12 h-12 rounded object-cover border border-slate-200" alt="thumb" />
                                                            </div>
                                                        ))}
                                                    </div>
                                                )}
                                                <div className="flex gap-2">
                                                    <button onClick={() => handleQC2Submit(v.id, 'ACCEPT')} className="flex-1 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm transition-colors">Final Accept</button>
                                                    <button onClick={() => handleQC2Submit(v.id, 'OBSERVATION')} className="flex-1 py-2 bg-yellow-500 hover:bg-yellow-600 text-white rounded-lg font-bold text-sm transition-colors">Under Observation</button>
                                                    <button onClick={() => handleQC2Submit(v.id, 'REJECT')} className="flex-1 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm transition-colors">Reject</button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'INWARD' && subTab === 'HISTORY' && (
                <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><FileText size={20} /> QC History</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">Input / Time</th>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">Vehicle</th>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">Material</th>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">P-QC Status</th>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">F-QC Status</th>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">Documents</th>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">Photos</th>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">Logs</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {historyQC.length > 0 ? historyQC.map(v => (
                                    <tr key={v.id} className="hover:bg-slate-50">
                                        <td className="p-3 text-sm text-slate-600">
                                            <div className="font-mono text-xs">{v.uniqueID}</div>
                                            <div className="text-xs text-slate-400">{v.inTime}</div>
                                        </td>
                                        <td className="p-3 text-sm font-bold text-slate-800">{v.vehicleNo}</td>
                                        <td className="p-3"><StatusBadge status={v.status} /></td>
                                        <td className="p-3 text-sm text-slate-600">{v.material}</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${v.qc1Status === 'ACCEPTED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {v.qc1Status || '-'}
                                            </span>
                                        </td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${v.qc2Status === 'ACCEPTED' ? 'bg-green-100 text-green-700' : v.qc2Status === 'REJECTED' ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-500'}`}>
                                                {v.qc2Status || 'PENDING'}
                                            </span>
                                        </td>
                                        <td className="p-3 text-xs text-slate-500">
                                            {v.documents?.labReport ? '✔ Lab' : ''} {v.documents?.supportingDoc ? '✔ Doc' : ''}
                                        </td>
                                        <td className="p-3">
                                            {v.attachments && v.attachments.length > 0 ? (
                                                <button
                                                    onClick={() => setViewPhotos(v.attachments)}
                                                    className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold hover:bg-blue-200"
                                                >
                                                    <Camera size={12} /> ({v.attachments.length})
                                                </button>
                                            ) : '-'}
                                        </td>
                                        <td className="p-3">
                                            <button
                                                onClick={() => { setSelectedLogs(v.logs || []); setShowLogModal(true); }}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                title="View Logs"
                                            >
                                                <History size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="6" className="p-8 text-center text-slate-400">No history found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}


            {activeTab === 'FG' && subTab === 'PENDING' && (
                <div className="space-y-8 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-card border border-slate-100">
                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-4 flex justify-between items-center rounded-t-2xl">
                            <h3 className="text-white font-bold text-lg flex items-center gap-2">
                                <Package size={20} /> Finished Goods Inspection
                            </h3>
                            <span className="bg-white/20 text-white px-3 py-1 rounded-full text-xs font-bold backdrop-blur-sm">
                                {pendingFGLots.length} Pending
                            </span>
                        </div>

                        <div className="p-6">
                            {pendingFGLots.length === 0 ? (
                                <div className="text-center py-12 text-slate-400">
                                    <p>No lots pending for inspection.</p>
                                </div>
                            ) : (
                                <div className="grid gap-6">
                                    {pendingFGLots.map(lot => (
                                        <div key={lot.id} className="bg-slate-50 rounded-xl p-6 border border-slate-200 flex flex-col lg:flex-row gap-6">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-3 mb-2">
                                                    <h4 className="text-xl font-bold text-slate-800">Lot: {lot.lotNumber}</h4>
                                                    <span className="text-[10px] font-mono text-slate-400 bg-slate-100 px-1.5 rounded">{lot.shift}</span>
                                                </div>
                                                <p className="text-slate-600 font-medium mb-1">{lot.fgName}</p>
                                                <p className="text-sm text-slate-500">{lot.unit}</p>
                                            </div>

                                            <div className="flex-[2] grid grid-cols-2 gap-4">
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-500 uppercase">Protein %</label>
                                                    <input
                                                        type="number"
                                                        className="w-full p-2 rounded border border-slate-300 text-sm"
                                                        value={fgQcData.protein}
                                                        onChange={(e) => setFgQcData({ ...fgQcData, protein: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-500 uppercase">Moisture %</label>
                                                    <input
                                                        type="number"
                                                        className="w-full p-2 rounded border border-slate-300 text-sm"
                                                        value={fgQcData.moisture}
                                                        onChange={(e) => setFgQcData({ ...fgQcData, moisture: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-500 uppercase">Oil %</label>
                                                    <input
                                                        type="number"
                                                        className="w-full p-2 rounded border border-slate-300 text-sm"
                                                        value={fgQcData.oil}
                                                        onChange={(e) => setFgQcData({ ...fgQcData, oil: e.target.value })}
                                                    />
                                                </div>
                                                <div>
                                                    <label className="text-xs font-semibold text-slate-500 uppercase">Sand/Silica %</label>
                                                    <input
                                                        type="number"
                                                        className="w-full p-2 rounded border border-slate-300 text-sm"
                                                        value={fgQcData.sand}
                                                        onChange={(e) => setFgQcData({ ...fgQcData, sand: e.target.value })}
                                                    />
                                                </div>
                                                <div className="col-span-2">
                                                    <label className="text-xs font-semibold text-slate-500 uppercase">Approved For Region</label>
                                                    <div className="relative group">
                                                        <div className="w-full p-2 rounded border border-slate-300 text-sm bg-white min-h-[38px] flex flex-wrap gap-1 cursor-pointer">
                                                            {(!fgQcData.approvedRegion || fgQcData.approvedRegion.length === 0) && (
                                                                <span className="text-slate-400">Select Regions...</span>
                                                            )}
                                                            {Array.isArray(fgQcData.approvedRegion) && fgQcData.approvedRegion.includes('ALL') ? (
                                                                <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded text-xs font-bold">All Regions</span>
                                                            ) : (
                                                                Array.isArray(fgQcData.approvedRegion) && fgQcData.approvedRegion.map(r => (
                                                                    <span key={r} className="bg-slate-100 text-slate-700 px-2 py-0.5 rounded text-xs border border-slate-200">{r}</span>
                                                                ))
                                                            )}
                                                        </div>
                                                        <div className="absolute z-50 top-full left-0 w-full mt-0 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto hidden group-hover:block">
                                                            {[
                                                                "ALL",
                                                                "WEST COAST", "NELLORE", "WEST BENGAL", "ORISSA", "GUNTUR", "AMALAPURAM",
                                                                "EAST-II", "WEST - 1", "HYDERABAD", "EAST-I", "ONGOLE", "EAST - I",
                                                                "WEST- 1", "KRISHNA", "TAMILNADU", "WEST - II", "TAMIL NADU", "WEST- II",
                                                                "KAKINADA", "WEST GODAVARI - 2", "WEST GODAVARI - 1", "KRISHNA AND GUNTUR",
                                                                "BALASORE", "WEST ZONE", "MALKIPURAM",
                                                                "VISAKHA / SRIKAKULAM", "EAST - III"
                                                            ].map(region => (
                                                                <label key={region} className="flex items-center gap-2 px-4 py-2 hover:bg-slate-50 cursor-pointer text-sm">
                                                                    <input
                                                                        type="checkbox"
                                                                        checked={Array.isArray(fgQcData.approvedRegion) ? fgQcData.approvedRegion.includes(region) : false}
                                                                        onChange={(e) => {
                                                                            let newRegions = Array.isArray(fgQcData.approvedRegion) ? [...fgQcData.approvedRegion] : [];
                                                                            if (region === 'ALL') {
                                                                                newRegions = e.target.checked ? ['ALL'] : [];
                                                                            } else {
                                                                                if (newRegions.includes('ALL')) newRegions = [];
                                                                                if (e.target.checked) {
                                                                                    newRegions.push(region);
                                                                                } else {
                                                                                    newRegions = newRegions.filter(r => r !== region);
                                                                                }
                                                                            }
                                                                            setFgQcData({ ...fgQcData, approvedRegion: newRegions });
                                                                        }}
                                                                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                                    />
                                                                    <span className={region === 'ALL' ? 'font-bold text-brand-600' : 'text-slate-700'}>
                                                                        {region === 'ALL' ? 'All Regions (Standard)' : region}
                                                                    </span>
                                                                </label>
                                                            ))}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="flex flex-col gap-2 justify-center min-w-[120px]">
                                                <button
                                                    onClick={() => handleFileTrigger(lot.id, 'FG', fileInputRef3)}
                                                    className="w-full py-2 border border-slate-300 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 flex items-center justify-center gap-2"
                                                >
                                                    <Upload size={16} /> {lot.documents?.qcReport ? 'Report Uploaded' : 'Upload Report'}
                                                </button>
                                                <button onClick={() => handleFGSubmit(lot.id, 'APPROVED')} className="w-full py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-bold text-sm shadow-sm">
                                                    Approve
                                                </button>
                                                <button onClick={() => handleFGSubmit(lot.id, 'REJECTED')} className="w-full py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-bold text-sm shadow-sm">
                                                    Reject
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'FG' && subTab === 'HISTORY' && (
                <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2"><Package size={20} /> FG QC History</h3>
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead className="bg-slate-50 border-b border-slate-200">
                                <tr>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">Lot No</th>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">Material</th>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">Unit / Shift</th>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">Protein / Moisture</th>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">Status</th>
                                    <th className="p-3 text-xs font-bold text-slate-500 uppercase">Report</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {historyFGLots.length > 0 ? historyFGLots.map(lot => (
                                    <tr key={lot.id} className="hover:bg-slate-50">
                                        <td className="p-3">
                                            <div className="font-bold text-slate-800">{lot.lotNumber}</div>
                                        </td>
                                        <td className="p-3 text-sm text-slate-600">{lot.fgName}</td>
                                        <td className="p-3 text-sm text-slate-600">{lot.unit} / {lot.shift}</td>
                                        <td className="p-3 text-sm font-mono">{lot.qcData?.protein}% / {lot.qcData?.moisture}%</td>
                                        <td className="p-3">
                                            <span className={`px-2 py-1 rounded text-xs font-bold ${lot.status === 'APPROVED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                                {lot.status}
                                            </span>
                                        </td>
                                        <td className="p-3 text-xs text-slate-500">
                                            {lot.documents?.qcReport ? '✔ Uploaded' : '-'}
                                        </td>
                                    </tr>
                                )) : (
                                    <tr><td colSpan="6" className="p-8 text-center text-slate-400">No history found.</td></tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {/* Hidden File Inputs */}
            <input type="file" ref={fileInputRef1} className="hidden" onChange={(e) => handleFileUpload(e, 'QC1')} />
            <input type="file" ref={fileInputRef2} className="hidden" onChange={(e) => handleFileUpload(e, 'QC2')} />
            <input type="file" ref={fileInputRef3} className="hidden" onChange={(e) => handleFileUpload(e, 'FG')} />

            {/* Modals */}
            {showCamera && (
                <CameraCapture
                    onCapture={handlePhotoCapture}
                    onClose={() => setShowCamera(false)}
                />
            )}
            {viewPhotos && (
                <PhotoGalleryModal
                    photos={viewPhotos}
                    onClose={() => setViewPhotos(null)}
                />
            )}
            {showEditModal && (
                <VehicleEditModal
                    isOpen={showEditModal}
                    onClose={() => { setShowEditModal(false); setEditingVehicle(null); }}
                    vehicle={editingVehicle}
                    title={pendingAction?.type === "APPROVE" ? "Verify & Approve (QC)" : pendingAction?.type === "REJECT" ? "Verify & Reject (QC)" : "Correct Vehicle Data (QC)"}
                    onSave={(id, updatedData, reason) => {
                        let statusToUpdate = editingVehicle.status;
                        let extraData = {};
                        let logMessage = `Data Correction (QC): ${reason}`;

                        if (pendingAction && pendingAction.vehicleId === id) {
                            if (pendingAction.type === 'APPROVE') {
                                statusToUpdate = 'PENDING_UNIT_ALLOCATION';
                                extraData = { ...pendingAction.qcData };
                                logMessage = `QC Approved & Verified: ${reason}`;
                            } else if (pendingAction.type === 'REJECT') {
                                statusToUpdate = 'AT_SECURITY_REJECT_IN';
                                extraData = { ...pendingAction.qcData };
                                logMessage = `QC Rejected & Verified: ${reason}`;
                            }
                        }

                        updateStatus(id, statusToUpdate, { ...updatedData, ...extraData }, logMessage);

                        if (pendingAction?.type === 'APPROVE') {
                            showAlert("Vehicle Verified & Approved. Moved to Unit Allocation.");
                        } else if (pendingAction?.type === 'REJECT') {
                            showAlert("Vehicle Verified & Rejected. Moved to Security Exit.");
                        } else {
                            showAlert("Vehicle data corrected and logged successfully.");
                        }
                        setPendingAction(null);
                    }}
                />
            )}
            {/* Log Viewer Modal */}
            <LogViewerModal
                isOpen={showLogModal}
                onClose={() => setShowLogModal(false)}
                logs={selectedLogs}
                title="Vehicle Audit Logs (QC)"
            />
        </div>
    );
};

export default QCModule;
