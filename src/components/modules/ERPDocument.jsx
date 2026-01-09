import React from 'react';
import { X, Printer, Download } from 'lucide-react';

const ERPDocument = ({ vehicle, type, onClose }) => {
    if (!vehicle) return null;

    const isGRN = type === 'GRN' || type === 'PROV_GRN';
    const title = type === 'PROV_GRN' ? 'PROVISIONAL GOODS RECEIPT NOTE' : (isGRN ? 'GOODS RECEIPT NOTE' : (type === 'DEBIT_NOTE' ? 'DEBIT NOTE' : 'DELIVERY CHALLAN'));
    const docNo = isGRN ? vehicle.documents?.grn : (type === 'DEBIT_NOTE' ? vehicle.documents?.debitNote : vehicle.documents?.dc);

    // Calculations
    const qty = parseFloat(vehicle.invoiceQty) || 0;
    const rate = parseFloat(vehicle.ratePerUOM) || 0;
    const netWeight = parseFloat(vehicle.netWeight) || 0;

    // For GRN, we use Net Weight as Accepted Qty
    const acceptedQty = isGRN ? netWeight : 0;
    const rejectedQty = isGRN ? 0 : (type === 'DEBIT_NOTE' ? (qty - netWeight) : 0);

    // Value Calculations
    const grossValue = (acceptedQty * rate).toFixed(2);
    const shortValue = (rejectedQty * rate).toFixed(2);
    const taxableValue = isGRN ? grossValue : shortValue;

    const igstRate = 5; // Example 5%
    const igstAmount = (parseFloat(taxableValue) * igstRate / 100).toFixed(2);
    const totalAmount = (parseFloat(taxableValue) + parseFloat(igstAmount)).toFixed(2);
    const tdsAmount = (parseFloat(taxableValue) * 0.001).toFixed(2); // Example 0.1%

    const handlePrint = () => {
        window.print();
    };

    const handleDownloadPDF = () => {
        window.print(); // Browser will show option to save as PDF
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-auto print:p-0 print:bg-white print:static">
            <div className="bg-white w-full max-w-4xl shadow-2xl rounded-xl overflow-hidden print:shadow-none print:rounded-none print:w-full">

                {/* Toolbar - Hidden in Print */}
                <div className="bg-slate-900 text-white p-4 flex justify-between items-center print:hidden">
                    <h3 className="font-bold text-lg">{title} Preview</h3>
                    <div className="flex gap-3">
                        <button onClick={handlePrint} className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-700 rounded-lg font-bold transition-colors">
                            <Printer size={18} /> Print
                        </button>
                        <button onClick={handleDownloadPDF} className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 rounded-lg font-bold transition-colors">
                            <Download size={18} /> Save as PDF
                        </button>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
                            <X size={24} />
                        </button>
                    </div>
                </div>

                {/* Document Content */}
                <div className="p-8 print:p-0 text-slate-900 font-serif text-sm">

                    {/* Header */}
                    <div className="border-b-2 border-slate-800 pb-4 mb-4 flex justify-between items-start">
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 bg-brand-600 text-white flex items-center justify-center font-bold text-2xl rounded">A</div>
                            <div>
                                <h1 className="text-2xl font-bold text-slate-900 uppercase tracking-wide">AVANTI FEEDS LIMITED</h1>
                                <p className="text-xs text-slate-600 max-w-md">
                                    D.No. 15-11-24, Near Railway Station, Unit-1, Kovvur, W.G. Dist,<br />
                                    Kovvur-534350 (08813) 231541, 231588<br />
                                    CIN: L16001AP1993PLC095778 www.avantifeeds.com GSTIN: 37AABCA7365E2ZP
                                </p>
                            </div>
                        </div>
                    </div>

                    <h2 className="text-center text-xl font-bold uppercase border-b-2 border-slate-800 pb-2 mb-6">{title}</h2>

                    {/* Info Grid */}
                    <div className="grid grid-cols-2 gap-8 mb-6">
                        <div className="border border-slate-300 p-4 rounded">
                            <h4 className="font-bold text-xs uppercase text-slate-500 mb-2">Vendor Details</h4>
                            <p className="font-bold text-lg">{vehicle.supplierName}</p>
                            <p className="text-slate-600">
                                28, Industrial Area, Dewas-455001<br />
                                Madhya Pradesh, India<br />
                                Phone: {vehicle.driverPhone || 'N/A'}<br />
                                GSTIN: 23AABCV1297N2ZZ
                            </p>
                        </div>
                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
                            <div className="font-bold text-slate-600">Doc No:</div>
                            <div className="font-bold">{docNo || 'PENDING'}</div>

                            <div className="font-bold text-slate-600">Date:</div>
                            <div>{new Date().toLocaleDateString()}</div>

                            <div className="font-bold text-slate-600">Invoice No:</div>
                            <div>{vehicle.invoiceNo}</div>

                            <div className="font-bold text-slate-600">Invoice Date:</div>
                            <div>{vehicle.invoiceDate}</div>

                            <div className="font-bold text-slate-600">Vehicle No:</div>
                            <div>{vehicle.vehicleNo}</div>

                            <div className="font-bold text-slate-600">PO Number:</div>
                            <div>{vehicle.poNumber}</div>
                        </div>
                    </div>

                    {/* Table */}
                    <table className="w-full border-collapse border border-slate-300 mb-6">
                        <thead>
                            <tr className="bg-slate-100 text-xs uppercase">
                                <th className="border border-slate-300 p-2 text-center w-12">S.No</th>
                                <th className="border border-slate-300 p-2 text-left">Product</th>
                                <th className="border border-slate-300 p-2 text-center">UOM</th>
                                <th className="border border-slate-300 p-2 text-right">Qty</th>
                                <th className="border border-slate-300 p-2 text-right">Rate</th>
                                <th className="border border-slate-300 p-2 text-right">Value</th>
                            </tr>
                        </thead>
                        <tbody>
                            <tr>
                                <td className="border border-slate-300 p-2 text-center">1</td>
                                <td className="border border-slate-300 p-2">
                                    <span className="font-bold block">{vehicle.material}</span>
                                    <span className="text-xs text-slate-500">{vehicle.materialDesc || 'Standard Quality Check Passed'}</span>
                                </td>
                                <td className="border border-slate-300 p-2 text-center">{vehicle.uom}</td>
                                <td className="border border-slate-300 p-2 text-right font-mono">
                                    {isGRN ? acceptedQty : rejectedQty}
                                </td>
                                <td className="border border-slate-300 p-2 text-right font-mono">{rate.toFixed(2)}</td>
                                <td className="border border-slate-300 p-2 text-right font-mono font-bold">{taxableValue}</td>
                            </tr>
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan="5" className="border border-slate-300 p-2 text-right font-bold">Net Value</td>
                                <td className="border border-slate-300 p-2 text-right font-mono">{taxableValue}</td>
                            </tr>
                            <tr>
                                <td colSpan="5" className="border border-slate-300 p-2 text-right">IGST @ {igstRate}%</td>
                                <td className="border border-slate-300 p-2 text-right font-mono">{igstAmount}</td>
                            </tr>
                            <tr>
                                <td colSpan="5" className="border border-slate-300 p-2 text-right">TDS @ 0.1%</td>
                                <td className="border border-slate-300 p-2 text-right font-mono">{tdsAmount}</td>
                            </tr>
                            <tr className="bg-slate-50">
                                <td colSpan="5" className="border border-slate-300 p-2 text-right font-bold text-lg">Total Amount</td>
                                <td className="border border-slate-300 p-2 text-right font-mono font-bold text-lg">{totalAmount}</td>
                            </tr>
                        </tfoot>
                    </table>

                    {/* Footer Signatures */}
                    <div className="mt-12 pt-8 border-t border-slate-300 grid grid-cols-3 gap-8 text-center text-xs uppercase font-bold text-slate-500">
                        <div>
                            <div className="h-16 mb-2"></div>
                            Prepared By
                        </div>
                        <div>
                            <div className="h-16 mb-2"></div>
                            Approved By
                        </div>
                        <div>
                            <div className="h-16 mb-2"></div>
                            Authorised Signatory
                        </div>
                    </div>

                    <div className="mt-8 text-center text-[10px] text-slate-400">
                        This is a computer generated document. No signature required.
                    </div>

                </div>
            </div>
        </div>
    );
};

export default ERPDocument;
