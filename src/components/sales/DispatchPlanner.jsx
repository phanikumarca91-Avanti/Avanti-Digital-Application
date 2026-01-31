import React, { useState } from 'react';
import { Truck, Package, ArrowRight, Download, Save, RefreshCw, X, Send } from 'lucide-react';
import * as XLSX from 'xlsx';

import { ORGANIZATION } from '../../config/organization';

const DispatchPlanner = ({ orders, vehicles, plannedVehicles, addToDispatchPlan, updateDispatchPlan, removeFromDispatchPlan, updateOrderStatus, showAlert }) => {
    // State for the planning session
    const [draggedOrder, setDraggedOrder] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Flatten Organization Units for Dropdown
    const unitOptions = ORGANIZATION.locations.flatMap(loc =>
        loc.units.map(unit => ({
            label: `${loc.name} - ${unit.name}`,
            value: unit.id, // e.g. 'U1', 'P1'
            type: loc.name === 'Kovvuru' ? 'UNIT' : 'PLANT'
        }))
    );

    // Filter available vehicles (excluding those already in the plan)
    const availableVehicles = vehicles.filter(v =>
        v.status === 'AVAILABLE' && !plannedVehicles.some(pv => pv.id === v.id)
    );

    // Filter active plan (Show only DRAFT)
    const activePlannedVehicles = plannedVehicles.filter(pv => !pv.stage || pv.stage === 'DRAFT');

    // Filter unassigned orders
    const unassignedOrders = orders.filter(o => o.status === 'PENDING');

    // Handle Drag Start
    const handleDragStart = (e, order) => {
        setDraggedOrder(order);
        e.dataTransfer.setData('text/plain', order.id);
        e.dataTransfer.effectAllowed = 'move';
    };

    // Handle Drop on Vehicle
    const handleDrop = async (e, vehicleId) => {
        e.preventDefault();
        if (!draggedOrder || isSubmitting) return;
        setIsSubmitting(true);

        // Find if vehicle is already in plan
        let targetVehicle = plannedVehicles.find(pv => pv.id === vehicleId && pv.stage !== 'SUBMITTED');

        // Get vehicle Meta from Fleet list (for capacity check if new)
        const vehicleMeta = vehicles.find(v => v.id === vehicleId) || targetVehicle;

        // Check Capacity
        const currentAssigned = targetVehicle ? targetVehicle.assignedOrders : [];
        const currentLoad = currentAssigned.reduce((sum, o) => sum + (Number(o.qty) || 0), 0);

        if (currentLoad + (Number(draggedOrder.qty) || 0) > vehicleMeta.capacity) {
            showAlert(`Cannot assign order. Exceeds vehicle capacity! (${currentLoad + (Number(draggedOrder.qty) || 0)}/${vehicleMeta.capacity} MT)`);
            setDraggedOrder(null);
            return;
        }

        // 1. If not in plan, Add to Plan first
        if (!targetVehicle) {
            await addToDispatchPlan(vehicleMeta);
        }

        // 2. Assign Order (This updates 'orders' -> updates 'plannedVehicles' via Context)
        await updateOrderStatus(draggedOrder.id, 'PLANNED', { assignedVehicleId: vehicleId });

        setDraggedOrder(null);
        setTimeout(() => setIsSubmitting(false), 500);
    };

    const handleDragOver = (e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
    };

    // Remove order from plan
    const handleRemoveOrder = async (vehicleId, orderId) => {
        // 1. Unassign Order
        await updateOrderStatus(orderId, 'PENDING', { assignedVehicleId: null });

        // 2. Check if vehicle is now empty?
        // We assume user wants to keep vehicle unless they remove it.
        // Optional: Auto-remove if empty preference.
    };

    // Explicitly remove vehicle from plan (Add button for this?)
    // Existing UI doesn't have "Remove Vehicle" button, only "Arrow Back" or similar implicitly?
    // Let's add a "Remove Vehicle" button in the UI next to "Submit" or X.

    const handleUnitChange = (vehicleId, unitId) => {
        updateDispatchPlan(vehicleId, { sourceUnit: unitId });
    };

    const handleSubmitToInvoice = (vehicleId) => {
        if (isSubmitting) return;
        setIsSubmitting(true);
        updateDispatchPlan(vehicleId, { stage: 'SUBMITTED' });
        showAlert("Vehicle submitted to Sales Invoice tab.");
        setTimeout(() => setIsSubmitting(false), 1000);
    };

    // Real Excel Export using xlsx
    const handleExportExcel = () => {
        if (plannedVehicles.length === 0) {
            showAlert("No dispatch plan to export.");
            return;
        }

        // Prepare Data for Excel
        const data = plannedVehicles.map(v => {
            const currentLoad = v.assignedOrders.reduce((sum, o) => sum + (Number(o.qty) || 0), 0);
            const utilization = Math.round((currentLoad / v.capacity) * 100);
            const orderDetails = v.assignedOrders.map(o => `${o.customer} (${o.qty}MT)`).join("; ");

            // Find Unit Name
            const assignedUnit = unitOptions.find(u => u.value === v.sourceUnit);
            const unitName = assignedUnit ? assignedUnit.label : 'Unassigned';

            return {
                "Vehicle No": v.vehicleNo,
                "Source Unit": unitName,
                "Type": v.type,
                "Driver/Transporter": v.driver || v.transporter,
                "Capacity (MT)": v.capacity,
                "Assigned Orders": orderDetails,
                "Total Load (MT)": currentLoad,
                "Utilization %": `${utilization}%`
            };
        });

        // Create Worksheet
        const ws = XLSX.utils.json_to_sheet(data);

        // Create Workbook
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Dispatch Plan");

        // Generate Buffer
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });

        // Create Blob
        const blob = new Blob([wbout], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });

        // Trigger Download
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `Dispatch_Plan_${new Date().toISOString().slice(0, 10)}.xlsx`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);

        showAlert("Dispatch Plan downloaded successfully.");
    };

    // Mock Save Plan removed (Auto-saved)

    return (
        <div className="flex h-[calc(100vh-200px)] gap-6">
            {/* Left Panel: Available Vehicles */}
            <div className="w-1/4 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center">
                    <span>Available Vehicles</span>
                    <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-xs">{availableVehicles.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {availableVehicles.map(vehicle => {
                        return (
                            <div
                                key={vehicle.id}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, vehicle.id)}
                                className="p-3 border border-slate-200 rounded-lg hover:border-brand-400 hover:shadow-md transition-all cursor-pointer bg-white group"
                            >
                                <div className="flex justify-between items-center mb-1">
                                    <span className="font-bold text-slate-800">{vehicle.vehicleNo}</span>
                                    <span className="text-xs font-bold text-slate-500">{vehicle.capacity} MT</span>
                                </div>
                                <div className="flex justify-between items-center text-xs text-slate-500">
                                    <span>{vehicle.type}</span>
                                    <span className="group-hover:text-brand-600 flex items-center gap-1">
                                        Drag Order Here <ArrowRight size={12} />
                                    </span>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Center Panel: Active Dispatch Plan */}
            <div className="flex-1 flex flex-col bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div className="p-4 bg-white border-b border-slate-200 flex justify-between items-center shadow-sm z-10">
                    <div>
                        <h3 className="font-bold text-lg text-slate-800">Active Dispatch Plan</h3>
                        <p className="text-xs text-slate-500">Drag vehicles here or drop orders onto vehicles</p>
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleExportExcel} className="flex items-center gap-2 px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg text-sm font-bold transition-colors shadow-sm">
                            <Download size={16} /> Export Excel
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-6">
                    {activePlannedVehicles.length === 0 ? (
                        <div className="h-full flex flex-col items-center justify-center text-slate-400 border-2 border-dashed border-slate-300 rounded-xl">
                            <Truck size={48} className="mb-4 opacity-50" />
                            <p className="font-medium">No vehicles planned yet.</p>
                            <p className="text-sm">Drag orders to vehicles on the left to start planning.</p>
                        </div>
                    ) : (
                        activePlannedVehicles.map(vehicle => {
                            const currentLoad = vehicle.assignedOrders.reduce((sum, o) => sum + o.qty, 0);
                            const utilization = Math.round((currentLoad / vehicle.capacity) * 100);
                            const isOverloaded = currentLoad > vehicle.capacity;

                            return (
                                <div key={vehicle.id} className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                    {/* Vehicle Header */}
                                    <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex justify-between items-center">
                                        <div className="flex items-center gap-4">
                                            <div className="p-2 bg-white border border-slate-200 rounded-lg">
                                                <Truck size={20} className="text-slate-600" />
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-800">{vehicle.vehicleNo}</h4>
                                                <p className="text-xs text-slate-500">{vehicle.transporter || vehicle.driver} • {vehicle.type}</p>

                                                {/* Unit Selection Dropdown */}
                                                <select
                                                    value={vehicle.sourceUnit || ''}
                                                    onChange={(e) => handleUnitChange(vehicle.id, e.target.value)}
                                                    className={`mt-1 text-xs border rounded px-2 py-1 outline-none focus:ring-1 focus:ring-brand-500 ${!vehicle.sourceUnit ? 'border-red-300 bg-red-50 text-red-700' : 'border-slate-300'}`}
                                                >
                                                    <option value="">Select Source Unit...</option>
                                                    {unitOptions.map(u => (
                                                        <option key={u.value} value={u.value}>{u.label}</option>
                                                    ))}
                                                </select>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6 flex-shrink-0">
                                            <button
                                                onClick={() => handleSubmitToInvoice(vehicle.id)}
                                                disabled={isSubmitting}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-100 text-blue-700 hover:bg-blue-200 rounded-lg text-xs font-bold transition-colors"
                                                title="Submit to Invoice Generation"
                                            >
                                                Submit <Send size={14} />
                                            </button>
                                            <div className="text-right">
                                                <div className="text-xs text-slate-500 mb-1">
                                                    Available: <span className="font-bold text-brand-600">{Math.max(0, vehicle.capacity - currentLoad)} MT</span>
                                                </div>
                                                <div className="flex items-center gap-2">
                                                    <div className="w-32 h-2 bg-slate-200 rounded-full overflow-hidden">
                                                        <div
                                                            className={`h-full rounded-full ${isOverloaded ? 'bg-red-500' : (utilization > 90 ? 'bg-green-500' : 'bg-brand-500')}`}
                                                            style={{ width: `${Math.min(utilization, 100)}%` }}
                                                        ></div>
                                                    </div>
                                                    <span className={`text-sm font-bold ${isOverloaded ? 'text-red-600' : 'text-slate-700'}`}>
                                                        {currentLoad}/{vehicle.capacity} MT
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Assigned Orders List */}
                                    <div
                                        className="p-4 min-h-[100px] space-y-2 bg-slate-50/50 transition-colors hover:bg-slate-100"
                                        onDragOver={handleDragOver}
                                        onDrop={(e) => handleDrop(e, vehicle.id)}
                                    >
                                        {vehicle.assignedOrders.map(order => (
                                            <div key={order.id} className="flex justify-between items-center p-3 bg-white border border-slate-200 rounded-lg shadow-sm group">
                                                <div className="flex items-center gap-3">
                                                    <div className="p-1.5 bg-blue-50 text-blue-600 rounded">
                                                        <Package size={16} />
                                                    </div>
                                                    <div>
                                                        <p className="font-bold text-sm text-slate-800">{order.customer}</p>
                                                        <p className="text-xs text-slate-500">{order.product} • {order.region}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-mono font-bold text-slate-700">{order.qty} MT</span>
                                                    <button
                                                        onClick={() => handleRemoveOrder(vehicle.id, order.id)}
                                                        className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
                                                    >
                                                        <X size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}

                                        {/* Drop Hint */}
                                        <div className="border-2 border-dashed border-slate-200 rounded-lg p-3 text-center transition-colors hover:border-brand-300 hover:bg-brand-50">
                                            <p className="text-xs text-slate-400 font-medium flex items-center justify-center gap-2">
                                                <ArrowRight size={14} /> Drag more orders here ({Math.max(0, vehicle.capacity - currentLoad)} MT remaining)
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    )}
                </div>
            </div>

            {/* Right Panel: Unassigned Orders */}
            <div className="w-1/4 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="p-4 bg-slate-50 border-b border-slate-200 font-bold text-slate-700 flex justify-between items-center">
                    <span>Unassigned Orders</span>
                    <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full text-xs">{unassignedOrders.length}</span>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {unassignedOrders.map(order => (
                        <div
                            key={order.id}
                            draggable
                            onDragStart={(e) => handleDragStart(e, order)}
                            className="p-3 border border-slate-200 rounded-lg hover:border-brand-400 hover:shadow-md transition-all cursor-grab active:cursor-grabbing bg-white group"
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-bold text-sm text-slate-800 line-clamp-1">{order.customer}</span>
                                <span className="bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded text-[10px] font-bold">{order.region}</span>
                            </div>
                            <div className="text-xs text-slate-500 space-y-1">
                                <p className="line-clamp-1">{order.product}</p>
                                <div className="flex justify-between items-center mt-2">
                                    <span className="font-mono font-bold text-slate-700 bg-slate-50 px-2 py-1 rounded">{order.qty} MT</span>
                                    <span className="text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity text-[10px] font-bold uppercase">Drag Me</span>
                                </div>
                            </div>
                        </div>
                    ))}
                    {unassignedOrders.length === 0 && (
                        <div className="text-center py-8 text-slate-400 text-sm">
                            No pending orders.
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DispatchPlanner;
