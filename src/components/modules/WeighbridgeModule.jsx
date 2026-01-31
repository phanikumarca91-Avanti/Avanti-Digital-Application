import React, { useState, useEffect } from 'react';
import { Scale, Truck, ArrowRight, AlertTriangle, Camera, Download, XCircle, History } from 'lucide-react';
import { useVehicles } from '../../contexts/VehicleContext';
import { useWarehouse } from '../../contexts/WarehouseContext';
import Input from '../shared/Input';
import CameraCapture from '../shared/CameraCapture';
import PhotoGalleryModal from '../shared/PhotoGalleryModal';
import VehicleEditModal from '../shared/VehicleEditModal';
import LogViewerModal from '../shared/LogViewerModal';

const WeighbridgeModule = ({ showAlert }) => {
    const { vehicles, updateVehicle } = useVehicles();
    const { updateBinStock } = useWarehouse();
    const safeVehicles = vehicles || [];
    const [weight, setWeight] = useState(0);
    const [isStable, setIsStable] = useState(false);
    const [isManual, setIsManual] = useState(false);
    const [activeTab, setActiveTab] = useState('PENDING');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Helper to match legacy prop signature
    const updateStatus = (id, status, data, logAction) => {
        updateVehicle(id, { status, ...data }, logAction ? {
            stage: 'WEIGHBRIDGE',
            action: logAction,
            timestamp: new Date().toISOString(),
            user: 'WEIGH_OFFICER'
        } : null);
    };

    // Camera State
    const [showCamera, setShowCamera] = useState(false);
    const [currentCam, setCurrentCam] = useState(null); // { id }
    const [viewPhotos, setViewPhotos] = useState(null);

    // Data Correction State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState(null);
    const [showLogModal, setShowLogModal] = useState(false);
    const [selectedLogs, setSelectedLogs] = useState([]);

    // Simulate Weighbridge Data
    useEffect(() => {
        if (isManual) {
            setIsStable(true); // Always stable in manual mode
            return;
        }

        const interval = setInterval(() => {
            const fluctuation = Math.random() * 50;
            const baseWeight = 25000;
            const currentWeight = baseWeight + fluctuation;
            setWeight(Math.floor(currentWeight));
            setIsStable(Math.random() > 0.7);
        }, 500);
        return () => clearInterval(interval);
    }, [isManual]);

    const pendingWeigh1 = safeVehicles.filter(v => v.status === 'AT_WEIGHBRIDGE_1' || v.status === 'RETURN_AT_WEIGHBRIDGE_1' || v.status === 'SALES_AT_SECURITY' || v.status === 'SALES_AT_WEIGHBRIDGE_1');
    const pendingWeigh2 = safeVehicles.filter(v => v.status === 'AT_WEIGHBRIDGE_2' || v.status === 'RETURN_AT_WEIGHBRIDGE_2' || v.status === 'SALES_AT_WEIGHBRIDGE_2');
    const completedWeighments = safeVehicles.filter(v => v.weigh2 && v.netWeight).sort((a, b) => b.id - a.id);

    const handleCaptureWeight = (id, type) => {
        if (isSubmitting) return;

        if (!isStable && !isManual) {
            showAlert("Scale is unstable. Please wait.");
            return;
        }

        setIsSubmitting(true);
        const vehicle = vehicles.find(v => v.id === id);

        if (type === 'GROSS') {
            if (vehicle.status === 'RETURN_AT_WEIGHBRIDGE_1' || vehicle.status === 'SALES_AT_SECURITY' || vehicle.status === 'SALES_AT_WEIGHBRIDGE_1') {
                // Return & Sales Flow: 1st Weight is EMPTY
                const isSales = vehicle.status === 'SALES_AT_SECURITY' || vehicle.status === 'SALES_AT_WEIGHBRIDGE_1';
                const nextStatus = isSales ? 'SALES_AT_LOADING' : 'RETURN_AT_WEIGHBRIDGE_2';
                const msg = isSales ? 'Empty Weight Captured. Proceed to Loading FG.' : 'Empty Weight Captured. Proceed to Loading Rejected Material.';

                updateStatus(id, nextStatus, {
                    weigh1: weight,
                    weigh1Time: new Date().toISOString()
                }, msg);
                showAlert(`${msg} (${weight} kg)`);
            } else {
                // Regular Flow: 1st Weight is GROSS
                updateStatus(id, 'AT_WAREHOUSE', {
                    weigh1: weight,
                    weigh1Time: new Date().toISOString()
                });
                showAlert(`Gross Weight captured: ${weight} kg. Vehicle moved to Warehouse for Bay Assignment.`);
            }
        } else if (type === 'TARE') {
            if (vehicle.status === 'RETURN_AT_WEIGHBRIDGE_2' || vehicle.status === 'SALES_AT_WEIGHBRIDGE_2') {
                // Return & Sales Flow: 2nd Weight is GROSS (Full)
                // Net = Full (Weight) - Empty (Weigh1)
                const emptyWeight = vehicle.weigh1 || 0;
                const net = Math.abs(weight - emptyWeight);

                if (vehicle.status === 'SALES_AT_WEIGHBRIDGE_2') {
                    // Sales Verification
                    const planned = vehicle.plannedWeight || 0;
                    const diff = net - planned;
                    let warning = '';
                    if (Math.abs(diff) > 50) { // Tolerance 50kg?
                        warning = `. Warning: Diff ${diff} kg vs Planned ${planned} kg`;
                    }

                    updateStatus(id, 'SALES_AT_SECURITY_EXIT', {
                        weigh2: weight,
                        weigh2Time: new Date().toISOString(),
                        netWeight: net
                    }, `Sales Loading Completed. Net: ${net} kg${warning}`);
                    showAlert(`Sales Loading Complete. Net: ${net} kg. Proceed to Security Exit.`);
                } else {
                    // Return Flow
                    updateStatus(id, 'RETURN_AT_ERP', {
                        weigh2: weight,
                        weigh2Time: new Date().toISOString(),
                        netWeight: net
                    }, 'Gross Weight Captured. Proceed to ERP for Debit Note.');
                    showAlert(`Gross Weight (after loading) captured: ${weight} kg. Net Rejected Qty: ${net} kg. Proceed to ERP.`);
                }

            } else {
                // Regular Flow: 2nd Weight is TARE (Empty)
                // Net = Gross (Weigh1) - Empty (Weight)
                const gross = vehicle.weigh1 || 0;
                const net = Math.abs(gross - weight);
                const rate = parseFloat(vehicle.ratePerUOM) || 0;
                const totalValue = (net * rate).toFixed(2);

                updateStatus(id, 'AT_ERP', {
                    weigh2: weight,
                    weigh2Time: new Date().toISOString(),
                    netWeight: net,
                    totalValue: totalValue
                });

                // Update Warehouse Stock
                if (vehicle.assignedBay) {
                    updateBinStock(vehicle.assignedBay, net, vehicle.materialName || 'Unknown Material', 'ADD');
                }

                showAlert(`Tare Weight captured: ${weight} kg. Net Weight: ${net} kg. Value: ₹${totalValue}. Vehicle moved to ERP for GRN.`);
            }
        }
        setTimeout(() => setIsSubmitting(false), 1000);
    };

    const handleCameraTrigger = (id) => {
        setCurrentCam({ id });
        setShowCamera(true);
    };

    const handlePhotoCapture = (imageData) => {
        if (!currentCam || isSubmitting) return; // Fix: Prevent double submission
        const { id } = currentCam;

        setIsSubmitting(true);
        const vehicle = vehicles.find(v => v.id === id);
        if (vehicle) {
            const currentAttachments = vehicle.attachments || [];
            const newAttachments = [...currentAttachments, imageData];

            // Hack: Update with SAME status to persist data
            updateStatus(id, vehicle.status, { attachments: newAttachments });
        }
        showAlert("Photo captured!");
        setTimeout(() => setIsSubmitting(false), 1000);
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Digital Scale Display - Keep as is */}
            <div className="lg:col-span-1">
                <div className="bg-slate-900 rounded-2xl shadow-card p-8 text-center relative overflow-hidden border border-slate-800">
                    <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-brand-500 to-transparent opacity-50"></div>

                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-slate-400 text-sm font-bold uppercase tracking-widest">Digital Weighbridge</h3>
                        <button
                            onClick={() => setIsManual(!isManual)}
                            className={`text-xs px-2 py-1 rounded border ${isManual ? 'bg-brand-600 border-brand-500 text-white' : 'bg-slate-800 border-slate-700 text-slate-400'}`}
                        >
                            {isManual ? 'Manual Mode' : 'Auto Mode'}
                        </button>
                    </div>

                    <div className="bg-black rounded-xl p-6 mb-6 border border-slate-800 shadow-inner relative">
                        {isManual ? (
                            <div className="flex items-center justify-center gap-2">
                                <input
                                    type="number"
                                    value={weight}
                                    onChange={(e) => setWeight(Number(e.target.value))}
                                    className="bg-transparent text-5xl font-mono font-bold text-green-500 tracking-wider tabular-nums text-center w-full focus:outline-none"
                                />
                                <span className="text-xl text-green-700 font-mono">kg</span>
                            </div>
                        ) : (
                            <div className="text-5xl font-mono font-bold text-green-500 tracking-wider tabular-nums">
                                {weight.toLocaleString()} <span className="text-xl text-green-700">kg</span>
                            </div>
                        )}
                        <div className={`absolute top-4 right-4 w-3 h-3 rounded-full ${isStable ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.8)]' : 'bg-red-500 animate-pulse'}`}></div>
                    </div>

                    <div className="flex justify-center gap-4 text-xs font-mono text-slate-500">
                        <div className="bg-slate-800 px-3 py-1 rounded">ZERO: 0.00</div>
                        <div className="bg-slate-800 px-3 py-1 rounded">TARE: 0.00</div>
                        <div className="bg-slate-800 px-3 py-1 rounded">NET: 0.00</div>
                    </div>
                </div>

                {/* Last Weighed Info */}
                <div className="mt-4 bg-white rounded-xl shadow-sm p-4 border border-slate-100">
                    <h4 className="text-xs font-bold text-slate-400 uppercase mb-2">Last Weighed</h4>
                    {completedWeighments.length > 0 ? (
                        (() => {
                            const lastVehicle = completedWeighments[0];
                            return (
                                <div>
                                    <p className="font-bold text-slate-800">{lastVehicle.vehicleNo}</p>
                                    <div className="mt-3 space-y-1 text-sm">
                                        <div className="flex justify-between text-slate-500">
                                            <span>Gross Weight:</span>
                                            <span className="font-mono font-bold text-slate-700">{lastVehicle.weigh1} kg</span>
                                        </div>
                                        <div className="flex justify-between text-slate-500">
                                            <span>Tare Weight:</span>
                                            <span className="font-mono font-bold text-slate-700">{lastVehicle.weigh2} kg</span>
                                        </div>
                                        <div className="flex justify-between pt-2 border-t border-slate-100 mt-2">
                                            <span className="font-bold text-slate-800">Net Weight:</span>
                                            <span className="font-mono font-bold text-brand-600">{lastVehicle.netWeight} kg</span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })()
                    ) : (
                        <p className="text-xs text-slate-400 italic">No completed weighments yet.</p>
                    )}
                </div>
            </div>

            {/* Weighing Lists */}
            <div className="lg:col-span-2 space-y-6">

                {/* Tabs */}
                <div className="flex gap-2 border-b border-slate-200">
                    <button
                        onClick={() => setActiveTab('PENDING')}
                        className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'PENDING' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Scale size={18} /> Pending Weighments
                        {(pendingWeigh1.length + pendingWeigh2.length) > 0 && (
                            <span className="bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-bold">
                                {pendingWeigh1.length + pendingWeigh2.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setActiveTab('HISTORY')}
                        className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'HISTORY' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700'}`}
                    >
                        <Truck size={18} /> History / Completed
                    </button>
                </div>

                {activeTab === 'PENDING' ? (
                    <div className="space-y-8 animate-fade-in">
                        {/* 1st Weighment (Gross) */}
                        <div className="bg-white rounded-2xl shadow-card overflow-hidden border border-slate-100">
                            <div className="bg-brand-50 px-6 py-4 border-b border-brand-100 flex justify-between items-center">
                                <h3 className="text-brand-800 font-bold flex items-center gap-2">
                                    <Truck size={20} /> 1st Weighment (Gross / Return Empty)
                                </h3>
                                <span className="bg-brand-200 text-brand-800 px-2 py-1 rounded text-xs font-bold">{pendingWeigh1.length}</span>
                            </div>

                            <div className="p-6">
                                {pendingWeigh1.length === 0 ? (
                                    <div className="text-center text-slate-400 py-8">No vehicles waiting for Gross Weight.</div>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingWeigh1.map(v => (
                                            <div key={v.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{v.vehicleNo}</h4>
                                                    <p className="text-[10px] font-mono text-slate-400">{v.uniqueID}</p>
                                                    <p className="text-xs text-slate-500">{v.supplierName}</p>
                                                    <p className="text-xs text-slate-500 mt-1">QC Status: <span className="text-green-600 font-bold">{v.qc1Status}</span></p>
                                                    {v.attachments && v.attachments.length > 0 && (
                                                        <button
                                                            onClick={() => setViewPhotos(v.attachments)}
                                                            className="mt-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100"
                                                        >
                                                            <Camera size={12} /> Photos ({v.attachments.length})
                                                        </button>
                                                    )}
                                                </div>
                                                <div className="flex flex-col gap-2">
                                                    <button
                                                        onClick={() => { setSelectedLogs(v.logs || []); setShowLogModal(true); }}
                                                        className="text-xs font-bold text-slate-400 hover:text-brand-600 flex items-center justify-end gap-1 transition-colors mb-1"
                                                    >
                                                        <History size={12} /> View Logs
                                                    </button>
                                                    <button
                                                        onClick={() => handleCameraTrigger(v.id)}
                                                        className="px-6 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold transition-colors flex items-center justify-center gap-2"
                                                    >
                                                        <Camera size={18} /> Add Photo
                                                    </button>
                                                    <button
                                                        onClick={() => { setEditingVehicle(v); setShowEditModal(true); }}
                                                        className="px-6 py-2 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg font-bold transition-colors flex items-center justify-center gap-2 border border-amber-200"
                                                    >
                                                        <AlertTriangle size={18} /> Correct Data
                                                    </button>
                                                    <button
                                                        onClick={() => handleCaptureWeight(v.id, 'GROSS')}
                                                        disabled={!isStable || isSubmitting}
                                                        className="px-6 py-2 bg-brand-600 hover:bg-brand-700 disabled:bg-slate-400 text-white rounded-lg font-bold shadow-lg shadow-brand-500/20 transition-all active:scale-95 flex items-center gap-2"
                                                    >
                                                        <Scale size={18} /> {v.status.includes('RETURN') ? 'Capture Empty' : 'Capture Gross'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 2nd Weighment (Tare) */}
                        <div className="bg-white rounded-2xl shadow-card overflow-hidden border border-slate-100">
                            <div className="bg-accent-50 px-6 py-4 border-b border-accent-100 flex justify-between items-center">
                                <h3 className="text-accent-800 font-bold flex items-center gap-2">
                                    <Truck size={20} /> 2nd Weighment (Tare / Return Full)
                                </h3>
                                <span className="bg-accent-200 text-accent-800 px-2 py-1 rounded text-xs font-bold">{pendingWeigh2.length}</span>
                            </div>

                            <div className="p-6">
                                {pendingWeigh2.length === 0 ? (
                                    <div className="text-center text-slate-400 py-8">No vehicles waiting for Tare Weight.</div>
                                ) : (
                                    <div className="space-y-4">
                                        {pendingWeigh2.map(v => (
                                            <div key={v.id} className="flex items-center justify-between p-4 bg-slate-50 rounded-xl border border-slate-200">
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{v.vehicleNo}</h4>
                                                    <p className="text-[10px] font-mono text-slate-400">{v.uniqueID}</p>
                                                    <p className="text-xs text-slate-500">{v.supplierName}</p>
                                                    <div className="flex gap-4 mt-1 text-xs">
                                                        <p className="text-slate-600">Gross: <span className="font-mono font-bold">{v.weigh1} kg</span></p>
                                                        <p className="text-slate-600">QC2: <span className={`font-bold ${v.qc2Status === 'REJECTED' ? 'text-red-600' : 'text-green-600'}`}>{v.qc2Status}</span></p>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col gap-2 items-end">
                                                    <button
                                                        onClick={() => { setSelectedLogs(v.logs || []); setShowLogModal(true); }}
                                                        className="text-xs font-bold text-slate-400 hover:text-brand-600 flex items-center justify-end gap-1 transition-colors mb-1"
                                                    >
                                                        <History size={12} /> View Logs
                                                    </button>
                                                    {v.attachments && v.attachments.length > 0 && (
                                                        <button
                                                            onClick={() => setViewPhotos(v.attachments)}
                                                            className="mb-2 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100"
                                                        >
                                                            <Camera size={12} /> Photos ({v.attachments.length})
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => handleCaptureWeight(v.id, 'TARE')}
                                                        disabled={!isStable || isSubmitting}
                                                        className="px-6 py-2 bg-accent-600 hover:bg-accent-700 disabled:bg-slate-400 text-white rounded-lg font-bold shadow-lg shadow-accent-500/20 transition-all active:scale-95 flex items-center justify-center gap-2"
                                                    >
                                                        <Scale size={18} /> {v.status.includes('RETURN') ? 'Capture Gross' : 'Capture Tare'}
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden animate-fade-in">
                        <div className="p-6">
                            {completedWeighments.length === 0 ? (
                                <div className="text-center text-slate-400 py-12">No completed weighment history.</div>
                            ) : (
                                <div className="space-y-4">
                                    {completedWeighments.map(v => (
                                        <div key={v.id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 hover:bg-slate-100 transition-colors">
                                            <div className="flex justify-between items-start">
                                                <div>
                                                    <h4 className="font-bold text-slate-800">{v.vehicleNo}</h4>
                                                    <p className="text-[10px] font-mono text-slate-400">{v.uniqueID}</p>
                                                    <p className="text-xs text-slate-500">{v.supplierName}</p>
                                                    <p className="text-xs text-slate-500 mt-1">{v.materialName || v.material}</p>
                                                </div>
                                                <div className="text-right text-sm">
                                                    <div className="flex justify-end gap-4 text-xs text-slate-500 mb-1">
                                                        <span>Gross: <span className="font-mono font-bold">{v.weigh1}</span></span>
                                                        <span>Tare: <span className="font-mono font-bold">{v.weigh2}</span></span>
                                                    </div>
                                                    <div className="font-bold text-slate-800">
                                                        Net: <span className="font-mono text-lg text-brand-600">{v.netWeight} kg</span>
                                                    </div>
                                                    <div className="flex justify-end gap-2 mt-2">
                                                        <button
                                                            onClick={() => { setSelectedLogs(v.logs || []); setShowLogModal(true); }}
                                                            className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-slate-500 hover:bg-slate-200 text-xs font-medium transition-colors"
                                                        >
                                                            <History size={12} /> Logs
                                                        </button>
                                                        {v.attachments && v.attachments.length > 0 && (
                                                            <button
                                                                onClick={() => setViewPhotos(v.attachments)}
                                                                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-medium hover:bg-blue-100"
                                                            >
                                                                <Camera size={12} /> View Photos ({v.attachments.length})
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Active Modals */}
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
                    title="Correct Vehicle Data (Weighbridge)"
                    onSave={(id, updatedData, reason) => {
                        if (isSubmitting) return;
                        setIsSubmitting(true);
                        updateStatus(id, editingVehicle.status, updatedData, `Data Correction (Weighbridge): ${reason}`);
                        showAlert("Vehicle data corrected and logged successfully.");
                        setTimeout(() => setIsSubmitting(false), 1000);
                    }}
                />
            )}
            {/* Log Viewer Modal */}
            <LogViewerModal
                isOpen={showLogModal}
                onClose={() => setShowLogModal(false)}
                logs={selectedLogs}
                title="Vehicle Audit Logs (Weighbridge)"
            />
        </div>
    );
};

export default WeighbridgeModule;
