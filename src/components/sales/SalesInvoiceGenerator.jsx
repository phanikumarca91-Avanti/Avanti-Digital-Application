import React, { useState, useMemo, useRef } from 'react';
import { FileText, Printer, Check, AlertCircle, X, Eye, Undo, Camera, Truck } from 'lucide-react';
import { numberToWords } from '../../utils/numberToWords';
import CameraCapture from '../shared/CameraCapture';
import PhotoGalleryModal from '../shared/PhotoGalleryModal';
// import { useReactToPrint } from 'react-to-print'; // Can be added later if needed, for now standard print
import { useSales } from '../../contexts/SalesContext';
import { useWarehouse } from '../../contexts/WarehouseContext';

const SalesInvoiceGenerator = ({ plannedVehicles, lots, updateDispatchPlan, removeFromDispatchPlan, showAlert, appVehicles, addVehicle, updateVehicle }) => {
    const { updateBinStock } = useWarehouse();
    const { generateInvoice } = useSales();
    const [selectedVehicle, setSelectedVehicle] = useState(null);
    const [showPreview, setShowPreview] = useState(false);
    const [activeSubTab, setActiveSubTab] = useState('PENDING'); // 'PENDING' | 'GENERATED'
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Camera State
    const [showCamera, setShowCamera] = useState(false);
    const [currentVehicleId, setCurrentVehicleId] = useState(null);
    const [viewPhotos, setViewPhotos] = useState(null);

    // Draggable Modal State
    const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
    const dragStartRef = useRef(null);
    const modalRef = useRef(null);

    // Filter vehicles that have assignments
    const filteredVehicles = useMemo(() => {
        if (activeSubTab === 'PENDING') {
            return plannedVehicles.filter(v => v.assignedOrders && v.assignedOrders.length > 0 && v.stage === 'SUBMITTED');
        } else {
            return plannedVehicles.filter(v => ['INVOICED', 'DISPATCH_READY', 'DISPATCHED', 'COMPLETED'].includes(v.stage)); // Show generated invoices and subsequent stages
        }
    }, [plannedVehicles, activeSubTab]);

    // FIFO Allocation Logic
    const allocateLotsFIFO = (orderItem) => {
        try {
            // 1. Get relevant lots: Status='COMPLETED' or 'STORED'
            // Ensure lenient matching for material name
            // ProductionEntry uses 'fgName', Warehouse sometimes 'productName', legacy 'materialName'
            const availableLots = lots.filter(lot => {
                const lotMaterialName = lot.fgName || lot.productName || lot.materialName || '';
                return (lot.status === 'COMPLETED' || lot.status === 'STORED') &&
                    lotMaterialName.toLowerCase().includes(orderItem.product.toLowerCase());
            }).sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt)); // Oldest first

            let qtyToFulfill = orderItem.qty * 1000; // KG
            const allocatedLots = [];

            for (const lot of availableLots) {
                if (qtyToFulfill <= 0) break;

                // ProductionEntry saves 'qty' in MT. We need KG for calculation.
                const rawQty = parseFloat(lot.qty || lot.producedQty || 0);
                const lotQty = rawQty * 1000; // Convert MT to KG

                if (lotQty <= 0) continue;

                const takenQty = Math.min(lotQty, qtyToFulfill);
                const extractedBags = Math.ceil(takenQty / 25); // 25kg bags

                allocatedLots.push({
                    lotNumber: lot.lotNumber || lot.id,
                    qty: takenQty, // KG
                    bags: extractedBags,
                    bay: lot.assignedBay || '-' // FG Bay
                });

                qtyToFulfill -= takenQty;
            }

            return { allocatedLots, remainingDetails: qtyToFulfill };
        } catch (error) {
            console.error("Allocation Error:", error);
            // Return empty allocation to prevent crash
            return { allocatedLots: [], remainingDetails: orderItem.qty * 1000 };
        }
    };

    const handleReturnToPlan = (vehicleId) => {
        if (window.confirm("Return this vehicle to Dispatch Plan? Invoices will not be generated.")) {
            updateDispatchPlan(vehicleId, { stage: 'DRAFT' });
        }
    };

    const handleCameraTrigger = (vehicleId) => {
        setCurrentVehicleId(vehicleId);
        setShowCamera(true);
    };

    const handlePhotoCapture = (imageData) => {
        if (!currentVehicleId) return;

        const currentV = plannedVehicles.find(v => v.id === currentVehicleId);
        if (currentV) {
            updateDispatchPlan(currentVehicleId, { attachments: [...(currentV.attachments || []), imageData] });
            showAlert("Photo captured and attached to vehicle!");
        }
    };

    const handleGenerateInvoice = (vehicle) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        // Prepare data for invoice
        // For simplicity, we create one invoice per vehicle containing all orders (or one per order?)

        // Check if invoices already exist to avoid regenerating IDs
        if (vehicle.generatedInvoices && vehicle.generatedInvoices.length > 0) {
            setSelectedVehicle(vehicle);
            setModalPosition({ x: window.innerWidth / 2 - 450, y: 50 });
            setShowPreview(true);
            return;
        }

        const invoices = [];
        const ordersByCustomer = vehicle.assignedOrders.reduce((acc, order) => {
            if (!acc[order.customer]) acc[order.customer] = [];
            acc[order.customer].push(order);
            return acc;
        }, {});

        Object.entries(ordersByCustomer).forEach(([customer, orders]) => {
            const items = orders.map(order => {
                const { allocatedLots, remainingDetails } = allocateLotsFIFO(order);
                return {
                    ...order,
                    lots: allocatedLots,
                    unfulfilledQty: remainingDetails
                };
            });

            invoices.push({
                id: `INV-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
                date: new Date().toISOString().split('T')[0],
                customer: customer,
                vehicleNo: vehicle.vehicleNo,
                sourceUnit: vehicle.sourceUnit,
                driver: vehicle.driver || vehicle.transporter,
                items: items,
                totalAmount: items.reduce((sum, i) => sum + (i.netAmount || 0), 0) // Need netAmount from order
            });
        });

        // --- REAL TIME STOCK DEDUCTION ---
        // Iterate through generated invoices -> items (orders) -> lots
        invoices.forEach(inv => {
            inv.items.forEach(item => {
                if (item.lots && item.lots.length > 0) {
                    item.lots.forEach(lot => {
                        // Deduct from Warehouse Bay
                        if (lot.bay && lot.bay !== '-') {
                            const qtyMT = lot.qty / 1000;
                            updateBinStock(lot.bay, qtyMT, item.product, 'REMOVE');
                        }
                    });
                }
            });
        });

        setSelectedVehicle({ ...vehicle, generatedInvoices: invoices });
        // Center the modal initially
        setModalPosition({ x: window.innerWidth / 2 - 450, y: 50 });
        setShowPreview(true);
        setTimeout(() => setIsSubmitting(false), 500);
    };

    const handleCallForVehicle = (vehicle) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        if (!window.confirm(`Call vehicle ${vehicle.vehicleNo} to Security Gate?`)) {
            setIsSubmitting(false);
            return;
        }

        // 1. Update Planned Vehicle Stage
        updateDispatchPlan(vehicle.id, { stage: 'DISPATCH_READY' });

        // 2. Create/Update Global Vehicle Entry for Security
        const existingVehicle = appVehicles && appVehicles.find(v => v.vehicleNo === vehicle.vehicleNo && !v.status.includes('COMPLETED'));

        if (existingVehicle) {
            // Update existing active vehicle
            updateVehicle(existingVehicle.id, {
                status: 'SALES_EXPECTED_AT_SECURITY',
                assignedOrders: vehicle.assignedOrders,
                generatedInvoices: vehicle.generatedInvoices
            });
        } else {
            // Create new expected vehicle
            const newVehicle = {
                id: Date.now(),
                vehicleNo: vehicle.vehicleNo,
                driverName: vehicle.driver || vehicle.transporter,
                status: 'SALES_EXPECTED_AT_SECURITY',
                entryTime: null, // Not entered yet
                registerId: 'feed_dispatch',
                assignedOrders: vehicle.assignedOrders,
                generatedInvoices: vehicle.generatedInvoices, // Pass invoice data
                plannedWeight: vehicle.assignedOrders.reduce((sum, o) => sum + Number(o.qty), 0) * 1000 // Convert MT to KG approx
            };
            addVehicle(newVehicle);
        }

        showAlert(`Vehicle ${vehicle.vehicleNo} called! Security notified.`);
        setTimeout(() => setIsSubmitting(false), 1000);
    };

    // Drag Handlers
    const handleMouseDown = (e) => {
        if (e.target.closest('.modal-header')) {
            dragStartRef.current = {
                x: e.clientX - modalPosition.x,
                y: e.clientY - modalPosition.y
            };
            document.addEventListener('mousemove', handleMouseMove);
            document.addEventListener('mouseup', handleMouseUp);
        }
    };

    const handleMouseMove = (e) => {
        if (dragStartRef.current) {
            setModalPosition({
                x: e.clientX - dragStartRef.current.x,
                y: e.clientY - dragStartRef.current.y
            });
        }
    };

    const handleMouseUp = () => {
        dragStartRef.current = null;
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
    };

    const componentRef = useRef();

    return (
        <div className="space-y-6">

            {/* Sub-Tabs */}
            <div className="flex gap-4 border-b border-slate-200">
                <button
                    onClick={() => setActiveSubTab('PENDING')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeSubTab === 'PENDING' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}
                >
                    Pending Invoices
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                        {plannedVehicles.filter(v => v.assignedOrders && v.assignedOrders.length > 0 && v.stage === 'SUBMITTED').length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveSubTab('GENERATED')}
                    className={`pb-3 text-sm font-bold flex items-center gap-2 border-b-2 transition-colors ${activeSubTab === 'GENERATED' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}
                >
                    Generated History
                    <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">
                        {plannedVehicles.filter(v => ['INVOICED', 'DISPATCH_READY', 'DISPATCHED', 'COMPLETED'].includes(v.stage)).length}
                    </span>
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {filteredVehicles.map(vehicle => (
                    <div key={vehicle.id} className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 flex flex-col">
                        <div className="flex justify-between items-start mb-4">
                            <div>
                                <h3 className="font-bold text-lg text-slate-800">{vehicle.vehicleNo}</h3>
                                <p className="text-sm text-slate-500">{vehicle.driver || vehicle.transporter}</p>
                            </div>
                            <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold border border-blue-100">
                                {vehicle.assignedOrders.length} Orders
                            </span>
                        </div>

                        <div className="space-y-3 flex-1">
                            {vehicle.assignedOrders.map(order => (
                                <div key={order.id} className="text-sm border-b border-slate-50 pb-2 last:border-0">
                                    <p className="font-medium text-slate-700">{order.customer}</p>
                                    <div className="flex justify-between mt-1 text-xs text-slate-500">
                                        <span>{order.product}</span>
                                        <span className="font-mono">{order.qty} MT</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex flex-col gap-2 mt-6">
                            {vehicle.attachments && vehicle.attachments.length > 0 && (
                                <button
                                    onClick={() => setViewPhotos(vehicle.attachments)}
                                    className="w-full py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-bold border border-blue-100 flex items-center justify-center gap-2 hover:bg-blue-100 mb-2"
                                >
                                    <Camera size={14} /> View Attached Photos ({vehicle.attachments.length})
                                </button>
                            )}
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleReturnToPlan(vehicle.id)}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold flex items-center justify-center transition-colors border border-slate-300"
                                    title="Return to Dispatch Plan"
                                >
                                    <Undo size={18} />
                                </button>
                                <button
                                    onClick={() => handleCameraTrigger(vehicle.id)}
                                    className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg font-bold flex items-center justify-center transition-colors border border-slate-300"
                                    title="Capture Photo"
                                >
                                    <Camera size={18} />
                                </button>
                                <button
                                    onClick={() => handleGenerateInvoice(vehicle)}
                                    disabled={isSubmitting}
                                    className={`flex-1 py-2 ${activeSubTab === 'GENERATED' ? 'bg-slate-800 hover:bg-slate-900' : 'bg-brand-600 hover:bg-brand-700'} text-white rounded-lg font-bold flex items-center justify-center gap-2 transition-colors`}
                                >
                                    {activeSubTab === 'GENERATED' ? <Eye size={18} /> : <FileText size={18} />}
                                    {activeSubTab === 'GENERATED' ? 'View Invoice' : 'Generate Invoice'}
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
                {filteredVehicles.length === 0 && (
                    <div className="col-span-full text-center py-12 text-slate-400 bg-slate-50 rounded-xl border-2 border-dashed border-slate-200">
                        <FileText size={48} className="mx-auto mb-3 opacity-50" />
                        <p>No processed vehicles waiting for invoicing.</p>
                    </div>
                )}
            </div>

            {/* Print Preview Modal - Draggable */}
            {
                showPreview && selectedVehicle && (
                    <div className="fixed inset-0 bg-black/50 z-50 overflow-hidden">
                        <div
                            ref={modalRef}
                            style={{
                                transform: `translate(${modalPosition.x}px, ${modalPosition.y}px)`,
                                position: 'absolute',
                                top: 0,
                                left: 0
                            }}
                            className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
                        >
                            <div
                                onMouseDown={handleMouseDown}
                                className="modal-header p-4 border-b border-slate-200 flex justify-between items-center bg-slate-50 rounded-t-lg cursor-move select-none"
                            >
                                <h2 className="font-bold text-lg text-slate-800 pointer-events-none">Invoice Preview (Drag Me)</h2>
                                <button onClick={() => setShowPreview(false)} className="text-slate-500 hover:text-slate-700">
                                    <X size={24} />
                                </button>
                            </div>

                            <div className="flex-1 overflow-y-auto p-8 bg-slate-500/10">
                                {/* Paper Container */}
                                {selectedVehicle.generatedInvoices.map((invoice, idx) => (
                                    <InvoicePaper key={idx} invoice={invoice} />
                                ))}
                            </div>

                            <div className="p-4 border-t border-slate-200 flex justify-end gap-2 bg-white rounded-b-lg">
                                <button onClick={() => setShowPreview(false)} className="px-4 py-2 text-slate-600 font-bold hover:bg-slate-100 rounded-lg">
                                    Close
                                </button>
                                {activeSubTab === 'PENDING' && (
                                    <button
                                        onClick={async () => {
                                            if (isSubmitting) return;
                                            if (window.confirm('Are you sure you want to finalize this invoice? It will be moved to History.')) {
                                                setIsSubmitting(true);
                                                try {
                                                    // 1. Save to Supabase
                                                    for (const inv of selectedVehicle.generatedInvoices) {
                                                        await generateInvoice(inv);
                                                    }

                                                    // 2. Update Local/Planned State -> Sync to Cloud
                                                    updateDispatchPlan(selectedVehicle.id, {
                                                        stage: 'INVOICED',
                                                        generatedInvoices: selectedVehicle.generatedInvoices
                                                    });

                                                    setShowPreview(false);
                                                    showAlert('Invoice finalized and saved to Cloud!');
                                                } catch (error) {
                                                    console.error("Save Failed", error);
                                                    showAlert("Failed to save invoice to cloud. Please try again.");
                                                } finally {
                                                    setTimeout(() => setIsSubmitting(false), 1000);
                                                }
                                            }
                                        }}
                                        disabled={isSubmitting}
                                        className="px-4 py-2 bg-green-600 text-white font-bold rounded-lg flex items-center gap-2 hover:bg-green-700"
                                    >
                                        <Check size={18} /> Finalize & Save
                                    </button>
                                )}
                                {activeSubTab === 'GENERATED' && (
                                    <button
                                        onClick={() => {
                                            handleCallForVehicle(selectedVehicle);
                                            setShowPreview(false);
                                        }}
                                        disabled={isSubmitting}
                                        className="px-4 py-2 bg-blue-600 text-white font-bold rounded-lg flex items-center gap-2 hover:bg-blue-700"
                                    >
                                        <Truck size={18} /> Call for Vehicle
                                    </button>
                                )}
                                <button onClick={() => window.print()} className="px-4 py-2 bg-brand-600 text-white font-bold rounded-lg flex items-center gap-2 hover:bg-brand-700">
                                    <Printer size={18} /> Print All
                                </button>
                            </div>
                        </div>
                    </div>
                )
            }

            {/* Hidden Printable Area - Bypass Modal/Transform issues */}
            {selectedVehicle && (
                <div id="printable-area" className="hidden">
                    {selectedVehicle.generatedInvoices.map((invoice, idx) => (
                        <div key={idx} className="print-page-break">
                            <InvoicePaper invoice={invoice} />
                        </div>
                    ))}
                </div>
            )}

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
        </div >
    );
};

// Internal Component for the actual Invoice Layout
const InvoicePaper = ({ invoice }) => {
    // Helper to calculate totals based on ALLOCATED quantities
    const calculateInvoiceTotals = () => {
        let grossTotal = 0;

        invoice.items.forEach(item => {
            // Calculate based on Allocated Lots + Unfulfilled
            // Actually, invoice should only bill for what is allocated/supplied, or if unfulfilled is pending, maybe not bill it?
            // "Bill of Supply" usually implies billing for shipped goods.
            // But if we show unfulfilled as "Pending", we shouldn't charge for it yet? 
            // The previous logic used 'item.totals.netAmount' which was total order amount.
            // Let's charge for EVERYTHING on the invoice row for now to match the user's expectation of "1 MT order" even if part is pending?
            // NO, standard accounting: Bill for what you ship. 
            // BUT the user complains "1 MT = 40 Bags" and expects the invoice to show 40 bags.
            // If we allocated 40 bags (even if 39 pending), the user might expect the full bill?
            // Let's assume for now we bill for the TOTAL quantity listed on the invoice rows.

            // Wait, in my previous fix I added "unfulfilled" rows. 
            // If I include unfulfilled in the bill, it is a "Proforma" or "Order" invoice.
            // If it is a "Tax Invoice" / "Bill of Supply", it should be for goods leaving.
            // However, the user's "1 MT" vs "1 Bag" complaint suggests they want to see the FULL order.
            // Let's sum up the amounts of all rows.

            // 1. Lots
            if (item.lots) {
                item.lots.forEach(lot => {
                    const qtyMT = (lot.bags * 25) / 1000;
                    const rate = item.items?.[0]?.rate || 0;
                    grossTotal += (qtyMT * rate);
                });
            }

            // 2. Unfulfilled
            if (item.unfulfilledQty > 0 || (!item.lots || item.lots.length === 0)) {
                // If we are showing it, are we billing it? 
                // The screenshot showed "Amount 75000" for 1 MT.
                // So yes, calculate for unfulfilled too if it appears in the list.
                // Logic: item.unfulfilledQty is in KG (from my previous fix? No, allocate returns KG).
                const qtyMT = item.unfulfilledQty > 0 ? (item.unfulfilledQty / 1000) : item.qty; // item.qty is MT
                const rate = item.items?.[0]?.rate || 0;
                grossTotal += (qtyMT * rate);
            }
        });

        // Ensure we handle string numbers correctly
        const tradeDiscountPercent = Number(invoice.items[0]?.tradeDiscountPercent || 0);
        const cashDiscountPercent = Number(invoice.items[0]?.cashDiscountPercent || 0);

        const tradeDiscountAmount = grossTotal * (tradeDiscountPercent / 100);
        const taxableAmount = grossTotal - tradeDiscountAmount;
        const cashDiscountAmount = taxableAmount * (cashDiscountPercent / 100);

        const netAmount = taxableAmount - cashDiscountAmount;

        return {
            grossTotal,
            tradeDiscountPercent,
            tradeDiscountAmount,
            cashDiscountPercent,
            cashDiscountAmount,
            netAmount
        };
    };

    const totals = calculateInvoiceTotals();
    const roundOff = Math.round(totals.netAmount) - totals.netAmount;
    const finalAmount = Math.round(totals.netAmount);

    return (
        <div className="bg-white p-8 shadow-lg mx-auto mb-8 max-w-[210mm] min-h-[297mm] text-black text-[10pt] leading-tight font-sans" style={{ fontFamily: 'Arial, sans-serif' }}>
            {/* Header */}
            <div className="text-center border-b-2 border-slate-800 pb-2 mb-2">
                <h1 className="text-xl font-bold uppercase tracking-wide">AVANTI FEEDS LIMITED</h1>
                <p>D.No.15-11-24, NEAR RAILWAY STATION UNIT-1, KOVVUR, W.G.DIST.</p>
                <p>KOVVUR, ANDHRA PRADESH - 534350, INDIA</p>
                <p>Ph: (08813) 231541, 231588, Email: feedunit1@avantifeeds.com</p>
                <p className="font-bold mt-1">GSTIN: 37AABCA7355E2ZP</p>
            </div>

            <div className="text-center font-bold text-lg underline mb-4">BILL OF SUPPLY</div>

            {/* Bill To & Details Grid */}
            <div className="flex border border-slate-800 mb-4">
                <div className="w-1/2 p-2 border-r border-slate-800">
                    <h3 className="font-bold underline mb-1">Details of Receiver (Billed To):</h3>
                    <p className="font-bold">{invoice.customer}</p>
                    <p>6-52, RAVIVARI STREET, PULLA</p>
                    <p>ELURU, ANDHRA PRADESH</p>
                    <p>State: ANDHRA PRADESH (37)</p>
                    <p>GSTIN: 37ANMPP3764B</p>
                </div>
                <div className="w-1/2 p-2 grid grid-cols-[100px_1fr] gap-y-1">
                    <span className="font-bold">Invoice No:</span> <span>{invoice.id}</span>
                    <span className="font-bold">Date:</span> <span>{invoice.date}</span>
                    <span className="font-bold">Location:</span> <span>{invoice.sourceUnit || 'KOVVUR'}</span>
                    <span className="font-bold">Vehicle No:</span> <span>{invoice.vehicleNo}</span>
                    <span className="font-bold">Dispatched By:</span> <span>ROAD</span>
                    <span className="font-bold">Pay Mode:</span> <span>CASH/CREDIT</span>
                </div>
            </div>

            {/* HSN Header */}
            <div className="mb-2 text-xs border border-slate-800 p-1">
                <span className="font-bold">HSN Name:</span> PREPARATIONS OF A KIND USED IN ANIMAL FEEDING - OTHER: PRAWN AND SHRIMPS FEED
            </div>

            {/* Line Items Table */}
            <table className="w-full border-collapse border border-slate-800 mb-4 text-xs">
                <thead>
                    <tr className="bg-slate-100">
                        <th className="border border-slate-800 p-1 w-8">SL</th>
                        <th className="border border-slate-800 p-1 text-left">Description of Goods</th>
                        <th className="border border-slate-800 p-1 w-20">HSN Code</th>
                        <th className="border border-slate-800 p-1 w-24">Lot No</th>
                        <th className="border border-slate-800 p-1 w-20">FG Bay</th>
                        <th className="border border-slate-800 p-1 w-16">No. Bags</th>
                        <th className="border border-slate-800 p-1 w-16">Net Wt/Bag</th>
                        <th className="border border-slate-800 p-1 w-20">Total Qty (MT)</th>
                        <th className="border border-slate-800 p-1 w-20 text-right">Rate/MT</th>
                        <th className="border border-slate-800 p-1 w-24 text-right">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {invoice.items.flatMap((item, itemIdx) => {
                        const rows = [];

                        // 1. Allocated Lots
                        if (item.lots && item.lots.length > 0) {
                            item.lots.forEach((lot, lotIdx) => {
                                rows.push(
                                    <tr key={`${itemIdx}-lot-${lotIdx}`}>
                                        <td className="border border-slate-800 p-1 text-center">{lotIdx === 0 ? itemIdx + 1 : ''}</td>
                                        <td className="border border-slate-800 p-1">{lotIdx === 0 ? item.product : ''}</td>
                                        <td className="border border-slate-800 p-1 text-center">23099031</td>
                                        <td className="border border-slate-800 p-1 font-mono">{lot.lotNumber}</td>
                                        <td className="border border-slate-800 p-1 text-center">{lot.bay}</td>
                                        <td className="border border-slate-800 p-1 text-center">{lot.bags}</td>
                                        <td className="border border-slate-800 p-1 text-center">25.000</td>
                                        <td className="border border-slate-800 p-1 text-center">{(lot.bags * 25 / 1000).toFixed(3)}</td>
                                        <td className="border border-slate-800 p-1 text-right">{lotIdx === 0 ? (item.items?.[0]?.rate || '0.00') : ''}</td>
                                        <td className="border border-slate-800 p-1 text-right">{((lot.bags * 25 / 1000) * (item.items?.[0]?.rate || 0)).toFixed(2)}</td>
                                    </tr>
                                );
                            });
                        }

                        // 2. Unfulfilled / No Stock
                        if (item.unfulfilledQty > 0 || (!item.lots || item.lots.length === 0)) {
                            // If completely unfulfilled (no lots), show full qty. If partial, show remaining.
                            const displayQty = item.unfulfilledQty > 0 ? (item.unfulfilledQty / 1000) : item.qty;
                            const displayBags = Math.ceil((item.unfulfilledQty > 0 ? item.unfulfilledQty : item.qty * 1000) / 25);
                            const rate = item.items?.[0]?.rate || 0;

                            rows.push(
                                <tr key={`${itemIdx}-unfulfilled`}>
                                    <td className="border border-slate-800 p-1 text-center">{(!item.lots || item.lots.length === 0) ? itemIdx + 1 : ''}</td>
                                    <td className="border border-slate-800 p-1">{(!item.lots || item.lots.length === 0) ? item.product : (item.product + ' (Pending)')}</td>
                                    <td className="border border-slate-800 p-1 text-center">23099031</td>
                                    <td className="border border-slate-800 p-1 text-center text-red-500 italic">No Stock</td>
                                    <td className="border border-slate-800 p-1 text-center">-</td>
                                    <td className="border border-slate-800 p-1 text-center">{displayBags}</td>
                                    <td className="border border-slate-800 p-1 text-center">25.000</td>
                                    <td className="border border-slate-800 p-1 text-center">{displayQty.toFixed(3)}</td>
                                    <td className="border border-slate-800 p-1 text-right">{(!item.lots || item.lots.length === 0) ? (rate) : ''}</td>
                                    <td className="border border-slate-800 p-1 text-right">{(displayQty * rate).toFixed(2)}</td>
                                </tr>
                            );
                        }

                        return rows;
                    })}
                    {/* Spacer Row to fill height */}
                    <tr className="h-40">
                        <td className="border border-slate-800"></td>
                        <td className="border border-slate-800"></td>
                        <td className="border border-slate-800"></td>
                        <td className="border border-slate-800"></td>
                        <td className="border border-slate-800"></td>
                        <td className="border border-slate-800"></td>
                        <td className="border border-slate-800"></td>
                        <td className="border border-slate-800"></td>
                        <td className="border border-slate-800"></td>
                        <td className="border border-slate-800"></td>
                    </tr>
                    {/* Totals Row */}
                    <tr className="font-bold border-t-2 border-slate-800">
                        <td colSpan="6" className="border border-slate-800 p-2 text-right">Total</td>
                        <td className="border border-slate-800 p-2 text-center">{invoice.items.reduce((sum, i) => sum + Number(i.qty), 0).toFixed(3)}</td>
                        <td className="border border-slate-800"></td>
                        <td className="border border-slate-800 p-2 text-right">{totals.grossTotal.toFixed(2)}</td>
                    </tr>
                </tbody>
            </table>

            {/* Footer Calculation Box */}
            <div className="flex border border-slate-800 mb-4">
                <div className="flex-1 p-2 border-r border-slate-800">
                    <p className="font-bold text-xs mb-1">Amount Chargeable (in words):</p>
                    <p className="capitalize italic">{numberToWords(finalAmount)} Only</p>
                </div>
                <div className="w-80 text-sm">
                    <div className="flex justify-between border-b border-slate-800 p-1">
                        <span>Gross Amount</span> <span>{totals.grossTotal.toFixed(2)}</span>
                    </div>
                    {totals.tradeDiscountAmount > 0 && (
                        <div className="flex justify-between border-b border-slate-800 p-1 text-red-600">
                            <span>Less: Trade Discount ({totals.tradeDiscountPercent}%)</span> <span>- {totals.tradeDiscountAmount.toFixed(2)}</span>
                        </div>
                    )}
                    {totals.cashDiscountAmount > 0 && (
                        <div className="flex justify-between border-b border-slate-800 p-1 text-red-600">
                            <span>Less: Cash Discount ({totals.cashDiscountPercent}%)</span> <span>- {totals.cashDiscountAmount.toFixed(2)}</span>
                        </div>
                    )}
                    <div className="flex justify-between border-b border-slate-800 p-1">
                        <span>Round Off</span> <span>{roundOff.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between p-1 font-bold bg-slate-100 text-lg">
                        <span>Total Value</span> <span>INR {finalAmount.toFixed(2)}</span>
                    </div>
                </div>
            </div>

            {/* Declarations & Signatures */}
            <div className="border border-slate-800 p-2 text-xs">
                <p className="font-bold underline mb-1">DECLARATION:</p>
                <ol className="list-decimal list-inside space-y-1 text-[10px]">
                    <li>Certified that particulars given above are true and correct and amount indicated represents the price actually charged.</li>
                    <li>Payment Terms: Due date for this invoice 00-00-0000. Interest @ 24% per annum for overdue bills.</li>
                    <li>Subject to Hyderabad / Kovvur Jurisdiction.</li>
                </ol>

                <div className="flex justify-end mt-8 pt-8 px-4">
                    <div className="text-center">
                        <p className="font-bold mb-8">For AVANTI FEEDS LIMITED</p>
                        <p className="border-t border-slate-400 w-32 mx-auto pt-1">Authorised Signatory</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default SalesInvoiceGenerator;
