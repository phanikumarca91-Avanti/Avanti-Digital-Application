import React, { useState } from 'react';
import { ShoppingCart, Truck, Map, FileText, Package, RefreshCcw, AlertCircle } from 'lucide-react';
import DispatchPlanner from '../sales/DispatchPlanner';
import SalesInvoiceGenerator from '../sales/SalesInvoiceGenerator';
import { useSales } from '../../contexts/SalesContext';
import { useProduction } from '../../contexts/ProductionContext';
import { useVehicles } from '../../contexts/VehicleContext';

const SalesModule = ({ showAlert }) => {
    const [activeTab, setActiveTab] = useState('DISPATCH_PLAN'); // Default to Dispatch Plan as per user focus
    const {
        orders,
        updateOrderStatus,
        plannedVehicles,
        // setPlannedVehicles, // Deprecated, removed
        vehicles: fleetVehicles,
        error,
        refreshOrders,
        isLoading,
        addToDispatchPlan,
        updateDispatchPlan,
        removeFromDispatchPlan
    } = useSales();
    const { vehicles: appVehicles, addVehicle, updateVehicle } = useVehicles();
    const { lots } = useProduction();

    return (
        <div className="space-y-6">
            {/* Module Header */}
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Sales & Dispatch</h1>
                    <p className="text-slate-500">Manage orders, plan dispatch, and track fleet.</p>
                </div>
                <button
                    onClick={() => refreshOrders(true)}
                    disabled={isLoading}
                    className={`flex items-center gap-2 px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-slate-600 hover:bg-slate-50 text-sm font-medium transition-colors ${isLoading ? 'opacity-50 cursor-not-allowed' : ''}`}
                >
                    <RefreshCcw size={16} className={isLoading ? 'animate-spin' : ''} />
                    {isLoading ? 'Syncing...' : 'Refresh Sync'}
                </button>
            </div>

            {/* Error Banner */}
            {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg flex items-center gap-3">
                    <AlertCircle size={20} />
                    <div>
                        <p className="font-bold">Sync Error</p>
                        <p className="text-sm">{error}</p>
                    </div>
                </div>
            )}

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
                        addToDispatchPlan={addToDispatchPlan}
                        updateDispatchPlan={updateDispatchPlan}
                        removeFromDispatchPlan={removeFromDispatchPlan}
                        updateOrderStatus={updateOrderStatus}
                        showAlert={showAlert}
                    />
                )}

                {activeTab === 'INVOICES' && (
                    <SalesInvoiceGenerator
                        plannedVehicles={plannedVehicles}
                        updateDispatchPlan={updateDispatchPlan}
                        removeFromDispatchPlan={removeFromDispatchPlan}
                        lots={lots}
                        showAlert={showAlert}
                        // Pass Main App State for Gate Entry
                        appVehicles={appVehicles}
                        addVehicle={addVehicle}
                        updateVehicle={updateVehicle}
                    />
                )}

                {activeTab === 'VEHICLES' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <h3 className="font-bold text-lg mb-4">Vehicle Status</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {fleetVehicles.map(vehicle => {
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
