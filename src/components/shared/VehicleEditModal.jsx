import React, { useState, useEffect } from 'react';
import { X, Save, AlertTriangle } from 'lucide-react';
import SearchableSelect from './SearchableSelect'; // Assuming in same directory
import { useMasterData } from '../../contexts/MasterDataContext';

const VehicleEditModal = ({ isOpen, onClose, vehicle, onSave, title = "Correct Vehicle Data" }) => {
    const { masterData } = useMasterData();
    const [formData, setFormData] = useState({
        vehicleNo: '',
        supplierName: '',
        materialName: '',
        qtyMts: '',
        invoiceNumber: '',
        invoiceDate: '',
        remarks: '',
        correctionReason: ''
    });

    useEffect(() => {
        if (vehicle && isOpen) {
            setFormData({
                vehicleNo: vehicle.vehicleNo || '',
                supplierName: vehicle.supplierName || vehicle.partyName || '',
                materialName: vehicle.materialName || vehicle.materialDesc || vehicle.material || '',
                qtyMts: vehicle.qtyMts || vehicle.declaredQty || '',
                invoiceNumber: vehicle.invoiceNumber || '',
                invoiceDate: vehicle.invoiceDate || '',
                remarks: vehicle.remarks || '',
                correctionReason: ''
            });
        }
    }, [vehicle, isOpen]);

    if (!isOpen) return null;

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(vehicle.id, {
            ...formData,
        }, formData.correctionReason);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-lg w-full overflow-hidden flex flex-col max-h-[90vh]">
                {/* Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <AlertTriangle className="text-amber-500" size={20} />
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <form onSubmit={handleSubmit} className="p-6 overflow-y-auto space-y-4">
                    <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-800 mb-4">
                        Please update the fields below carefully. Used for correcting data entry errors.
                        Changes will be logged.
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Vehicle Number</label>
                        <input
                            type="text"
                            required
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none uppercase"
                            value={formData.vehicleNo}
                            onChange={(e) => setFormData({ ...formData, vehicleNo: e.target.value.toUpperCase() })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Supplier / Party Name</label>
                        <SearchableSelect
                            options={masterData?.SUPPLIERS || []}
                            value={formData.supplierName}
                            onChange={(val) => setFormData({ ...formData, supplierName: val.target.value })}
                            placeholder="Select Supplier"
                            className="w-full"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Number</label>
                        <input
                            type="text"
                            required
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            value={formData.invoiceNumber}
                            onChange={(e) => setFormData({ ...formData, invoiceNumber: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Invoice Date</label>
                        <input
                            type="date"
                            required
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            value={formData.invoiceDate}
                            onChange={(e) => setFormData({ ...formData, invoiceDate: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Material Name</label>
                        <SearchableSelect
                            options={masterData?.RAW_MATERIALS || []}
                            value={formData.materialName}
                            onChange={(val) => setFormData({ ...formData, materialName: val.target.value })}
                            placeholder="Select Material"
                            className="w-full"
                            required
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Declared Quantity (MT)</label>
                        <input
                            type="number"
                            step="0.01"
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none"
                            value={formData.qtyMts}
                            onChange={(e) => setFormData({ ...formData, qtyMts: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">Remarks (Security)</label>
                        <textarea
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none h-16"
                            value={formData.remarks}
                            onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-1">Reason for Correction (Mandatory)</label>
                        <textarea
                            required
                            placeholder="Why is this data being changed? e.g., 'Typo in Security Gate', 'Wrong Material Selected'. Write 'Verified' if no changes."
                            className="w-full p-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none resize-none h-20"
                            value={formData.correctionReason}
                            onChange={(e) => setFormData({ ...formData, correctionReason: e.target.value })}
                        />
                    </div>

                    {/* Footer */}
                    <div className="pt-4 flex justify-end gap-3 border-t border-slate-100 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold shadow-lg shadow-brand-500/20 transition-all active:scale-95 flex items-center gap-2"
                        >
                            <Save size={18} /> Update & Log
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default VehicleEditModal;
