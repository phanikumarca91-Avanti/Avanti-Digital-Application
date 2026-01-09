import React, { useState } from 'react';
import { ShoppingCart, Truck, Map, FileText, Package } from 'lucide-react';
import DispatchPlanner from '../sales/DispatchPlanner';
import SalesInvoiceGenerator from '../sales/SalesInvoiceGenerator';
import { useSales } from '../../contexts/SalesContext';
import { useProduction } from '../../contexts/ProductionContext';

const SalesModule = ({ showAlert, vehicles, setVehicles }) => {
    const [activeTab, setActiveTab] = useState('DISPATCH_PLAN'); // Default to Dispatch Plan as per user focus
    const { orders, setOrders, plannedVehicles, setPlannedVehicles } = useSales();
    // Removed vehicles from useSales to avoid shadowing props. If SalesContext vehicles are needed (e.g. Master Fleet), rename them.
    // However, DispatchPlanner uses 'vehicles' prop. DispatchPlanner likely needs Master Fleet from SalesContext?
    // Let's check DispatchPlanner usage. It uses 'vehicles' passed to it.
    // If DispatchPlanner needs Master Fleet, we should get that from useSales and rename it.
    // But for 'Call for Vehicle' (Active Gate Transactions), we need App State.

    // Let's assume DispatchPlanner uses Master Fleet.
    const { vehicles: fleetVehicles } = useSales();
    // We will pass fleetVehicles to DispatchPlanner, but 'vehicles' (App State) to SalesInvoiceGenerator?
    // Actually, DispatchPlanner uses it for "Available Vehicles" list. That should be Fleet.

    // Wait, the original code had: const { ..., vehicles, setVehicles, ... } = useSales();
    // I should rename the prop 'vehicles' to 'appVehicles' or similar to avoid confusion, OR rename the context one.
    // Let's rename Context one to 'fleetVehicles'.
    const { lots } = useProduction();

    return (
        <div className="space-y-6">
            {/* Module Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Sales & Dispatch</h1>
                    <p className="text-slate-500">Manage orders, plan dispatch, and track fleet.</p>
                </div>
            </div>

            {/* Navigation Tabs */}
            <div className="flex gap-2 border-b border-slate-200">
                <button
                    onClick={() => setActiveTab('ORDERS')}
                    className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'ORDERS' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}
                >
                    <ShoppingCart size={18} /> Sales Orders
                    <span className="bg-brand-100 text-brand-700 px-2 py-0.5 rounded-full text-xs font-bold">
                        {orders.filter(o => o.status === 'PENDING').length}
                    </span>
                </button>
                <button
                    onClick={() => setActiveTab('DISPATCH_PLAN')}
                    className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'DISPATCH_PLAN' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}
                >
                    <Map size={18} /> Dispatch Plan (Control Tower)
                </button>
                <button
                    onClick={() => setActiveTab('INVOICES')}
                    className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'INVOICES' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}
                >
                    <FileText size={18} /> Sales Invoices
                </button>
                <button
                    onClick={() => setActiveTab('VEHICLES')}
                    className={`px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors ${activeTab === 'VEHICLES' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}
                >
                    <Truck size={18} /> Vehicle Status
                </button>
            </div>

            {/* Content Area */}
            <div className="min-h-[600px]">
                {activeTab === 'ORDERS' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-lg mb-4">Pending Sales Orders</h3>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm text-left">
                                <thead className="bg-slate-50 text-slate-500 font-semibold border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3">Order ID</th>
                                        <th className="px-4 py-3">Customer</th>
                                        <th className="px-4 py-3">Region</th>
                                        <th className="px-4 py-3">Product</th>
                                        <th className="px-4 py-3 text-right">Qty (MT)</th>
                                        <th className="px-4 py-3">Date</th>
                                        <th className="px-4 py-3">Status</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {orders.map(order => (
                                        <tr key={order.id} className="hover:bg-slate-50">
                                            <td className="px-4 py-3 font-medium text-slate-700">{order.id}</td>
                                            <td className="px-4 py-3">{order.customer}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-blue-50 text-blue-700 rounded text-xs font-bold border border-blue-100">
                                                    {order.region}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">{order.product}</td>
                                            <td className="px-4 py-3 text-right font-mono">{order.qty}</td>
                                            <td className="px-4 py-3 text-slate-500">{order.date}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2 py-1 bg-yellow-50 text-yellow-700 rounded-full text-xs font-bold border border-yellow-100">
                                                    {order.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )}

                {activeTab === 'DISPATCH_PLAN' && (
                    <DispatchPlanner
                        orders={orders}
                        vehicles={fleetVehicles}
                        plannedVehicles={plannedVehicles}
                        setPlannedVehicles={setPlannedVehicles}
                        onUpdateOrders={setOrders}
                        showAlert={showAlert}
                    />
                )}

                {activeTab === 'INVOICES' && (
                    <SalesInvoiceGenerator
                        plannedVehicles={plannedVehicles}
                        setPlannedVehicles={setPlannedVehicles}
                        lots={lots}
                        showAlert={showAlert}
                        // Pass Main App State for Gate Entry
                        appVehicles={vehicles}
                        setAppVehicles={setVehicles}
                    />
                )}

                {activeTab === 'VEHICLES' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-lg mb-4">Vehicle Status</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {vehicles.map(vehicle => {
                                const isAssigned = plannedVehicles.some(pv => pv.id === vehicle.id);
                                const status = isAssigned ? 'ASSIGNED' : vehicle.status;

                                return (
                                    <div key={vehicle.id} className="border border-slate-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-slate-800">{vehicle.vehicleNo}</h4>
                                            <span className={`px-2 py-0.5 rounded text-xs font-bold ${status === 'AVAILABLE' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                                                {status}
                                            </span>
                                        </div>
                                        <div className="text-sm text-slate-600 space-y-1">
                                            <p>Type: <span className="font-medium">{vehicle.type}</span></p>
                                            <p>Capacity: <span className="font-medium">{vehicle.capacity} MT</span></p>
                                            <p>Driver/Transporter: <span className="font-medium">{vehicle.driver || vehicle.transporter}</span></p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SalesModule;
