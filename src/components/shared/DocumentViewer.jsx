import React from 'react';
import { X, Printer, CheckCircle, FileText, AlertTriangle, AlertOctagon } from 'lucide-react';

const DocumentViewer = ({ isOpen, documentType, vehicle, onClose, onAuthorize }) => {
    if (!isOpen || !vehicle) return null;

    const docTitle = {
        'GRN': 'Goods Receipt Note',
        'DC': 'Delivery Challan (Return)',
        'DEBIT_NOTE': 'Debit Note & Rejection GRN',
        'PROV_GRN': 'Provisional GRN'
    }[documentType] || 'Document';

    const isRejection = documentType === 'DEBIT_NOTE';

    // Financial Calculations
    const baseRate = 36.38; // Placeholder rate
    const acceptedQty = vehicle.netWeight || 0;
    const grossValue = acceptedQty * baseRate;
    const igstRate = 0.05;
    const tdsRate = 0.001;
    const igstAmount = grossValue * igstRate;
    const tdsAmount = grossValue * tdsRate;
    const totalAmount = grossValue + igstAmount - tdsAmount;

    // Determine Sign for display
    const sign = (documentType === 'DEBIT_NOTE') ? -1 : 1;
    const currentGrossValue = grossValue * sign;
    const currentIgstAmount = igstAmount * sign;
    const currentTdsAmount = tdsAmount * sign;
    const currentTotalAmount = totalAmount * sign;

    const renderFinancialRow = (label, value, isNegativeAllowed = false) => {
        let displayValue = value;
        let colorClass = 'text-slate-900';

        if (isNegativeAllowed && displayValue < 0) {
            colorClass = 'text-red-600 font-bold';
        } else if (!isNegativeAllowed && displayValue < 0) {
            displayValue = -displayValue;
        }

        const formattedValue = new Intl.NumberFormat('en-IN', {
            style: 'currency',
            currency: 'INR',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        }).format(displayValue);

        return (
            <tr className="border-b border-slate-100 last:border-0">
                <td className="py-2 text-sm font-medium text-slate-600">{label}</td>
                <td className={`py-2 text-right font-mono text-sm ${colorClass}`}>{formattedValue}</td>
            </tr>
        );
    };

    return (
        <div className="fixed inset-0 z-50 flex justify-end animate-in fade-in duration-300">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={onClose} />

            {/* Slide-over Panel */}
            <div className="relative w-full max-w-2xl bg-surface-50 h-full shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">

                {/* Header */}
                <div className="px-6 py-4 bg-white border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg ${isRejection ? 'bg-red-50 text-red-600' : 'bg-brand-50 text-brand-600'}`}>
                            <FileText size={24} />
                        </div>
                        <div>
                            <h2 className="text-lg font-bold text-slate-900">{docTitle}</h2>
                            <p className="text-xs text-slate-500 font-mono">REF: {vehicle.uniqueID}</p>
                        </div>
                    </div>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 transition-colors">
                        <X size={24} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {/* Document Preview Card */}
                    <div className="bg-white border border-slate-200 rounded-xl shadow-sm p-8 min-h-[600px] relative">
                        {/* Watermark */}
                        <div className="absolute inset-0 flex items-center justify-center opacity-[0.03] pointer-events-none">
                            <h1 className="text-9xl font-black transform -rotate-45">AVANTI</h1>
                        </div>

                        {/* Doc Header */}
                        <div className="flex justify-between items-start mb-8 border-b pb-6">
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 mb-1">AVANTI FEEDS LIMITED</h1>
                                <p className="text-xs text-slate-500">Kovvur, Andhra Pradesh, India</p>
                                <p className="text-xs text-slate-500">GSTIN: 37AAACA1234A1Z5</p>
                            </div>
                            <div className="text-right">
                                <h3 className={`text-xl font-bold ${isRejection ? 'text-red-600' : 'text-brand-600'}`}>{documentType.replace('_', ' ')}</h3>
                                <p className="text-sm font-mono mt-1 text-slate-700">#{vehicle.documents?.grn || 'PENDING'}</p>
                                <p className="text-xs text-slate-400 mt-1">{new Date().toLocaleDateString()}</p>
                            </div>
                        </div>

                        {/* Supplier & Vehicle Info */}
                        <div className="grid grid-cols-2 gap-8 mb-8">
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Supplier Details</h4>
                                <p className="font-bold text-slate-800">{vehicle.supplierName}</p>
                                <p className="text-sm text-slate-600">Inv #: {vehicle.invoiceNo}</p>
                                <p className="text-sm text-slate-600">Date: {vehicle.invoiceDate}</p>
                            </div>
                            <div>
                                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Vehicle & Material</h4>
                                <p className="font-bold text-slate-800">{vehicle.vehicleNo}</p>
                                <p className="text-sm text-slate-600">{vehicle.material}</p>
                                <p className="text-sm text-slate-600">Driver: {vehicle.driverName || 'N/A'}</p>
                            </div>
                        </div>

                        {/* Weight Table */}
                        <div className="mb-8">
                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Weighment Details</h4>
                            <table className="w-full text-sm text-left border border-slate-200 rounded-lg overflow-hidden">
                                <thead className="bg-slate-50 text-slate-700">
                                    <tr>
                                        <th className="p-3 border-b">Description</th>
                                        <th className="p-3 border-b text-right">Weight (Kgs)</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    <tr><td className="p-3">Gross Weight</td><td className="p-3 text-right font-mono">{vehicle.weigh1}</td></tr>
                                    <tr><td className="p-3">Tare Weight</td><td className="p-3 text-right font-mono">{vehicle.weigh2}</td></tr>
                                    <tr className="bg-slate-50 font-bold text-slate-900">
                                        <td className="p-3">Net Weight</td>
                                        <td className="p-3 text-right font-mono">{vehicle.netWeight}</td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Financial Summary */}
                        <div className="flex justify-end mb-8">
                            <table className="w-80 border-collapse">
                                <tbody>
                                    {renderFinancialRow("Net Value", currentGrossValue, true)}
                                    {renderFinancialRow("IGST @ 5.00%", currentIgstAmount, true)}
                                    {renderFinancialRow("Total Taxable Value", currentGrossValue + currentIgstAmount, true)}
                                    {renderFinancialRow("TDS @ 0.100%", currentTdsAmount, true)}
                                    <tr className={`border-t-2 ${documentType === 'DEBIT_NOTE' ? 'border-red-500' : 'border-brand-500'}`}>
                                        <td className={`py-3 text-sm font-bold ${documentType === 'DEBIT_NOTE' ? 'text-red-700' : 'text-brand-900'}`}>TOTAL AMOUNT</td>
                                        <td className={`py-3 text-right text-lg font-bold ${documentType === 'DEBIT_NOTE' ? 'text-red-700' : 'text-brand-900'}`}>
                                            {new Intl.NumberFormat('en-IN', {
                                                style: 'currency',
                                                currency: 'INR',
                                                minimumFractionDigits: 2,
                                                maximumFractionDigits: 2,
                                            }).format(currentTotalAmount)}
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>

                        {/* Rejection/Remarks Section */}
                        {isRejection && (
                            <div className="bg-red-50 border border-red-100 p-4 rounded-lg mb-8">
                                <h4 className="text-sm font-bold text-red-800 flex items-center gap-2 mb-2">
                                    <AlertOctagon size={16} /> Rejection Details
                                </h4>
                                <p className="text-sm text-red-700">Reason: {vehicle.qc1Remarks || vehicle.qc2Remarks || 'Quality Standards Not Met'}</p>
                                <p className="text-xs text-red-500 mt-1 italic">* Debit Note generated for transport/handling charges.</p>
                            </div>
                        )}

                        {documentType === 'DC' && (
                            <div className="mt-4 p-3 bg-orange-50 border border-orange-300 rounded-lg text-sm text-orange-800 mb-8">
                                <p className="font-bold flex items-center gap-1"><AlertTriangle size={16} /> Caution: This is a Delivery Challan for internal transfer (Bandapuram). E-Way Bill must be handled by the ERP team.</p>
                            </div>
                        )}

                        {/* Footer */}
                        <div className="mt-12 pt-8 border-t border-slate-200 flex justify-between items-end">
                            <div className="text-center">
                                <div className="h-12 w-32 border-b border-slate-300 mb-2"></div>
                                <p className="text-xs text-slate-400">Authorized Signatory</p>
                            </div>
                            <div className="text-right text-xs text-slate-300">
                                Generated via ADA
                            </div>
                        </div>
                    </div>
                </div>

                {/* Footer Actions */}
                <div className="p-6 bg-white border-t border-slate-200 flex items-center justify-between">
                    <button className="flex items-center gap-2 text-slate-600 hover:text-slate-900 font-medium transition-colors">
                        <Printer size={18} /> Print Preview
                    </button>
                    <button
                        onClick={onAuthorize}
                        className="bg-brand-600 hover:bg-brand-700 text-white px-8 py-3 rounded-xl font-bold shadow-lg shadow-brand-500/25 transition-all active:scale-95 flex items-center gap-2"
                    >
                        <CheckCircle size={20} />
                        Authorize & Release
                    </button>
                </div>

            </div>
        </div>
    );
};

export default DocumentViewer;
