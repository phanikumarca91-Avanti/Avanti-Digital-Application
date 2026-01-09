import React from 'react';
import { ShoppingBag, CheckCircle, XCircle, Truck, AlertTriangle } from 'lucide-react';
import { useSales } from '../../contexts/SalesContext';
import StatusBadge from '../shared/StatusBadge';

const SalesOrderList = ({ onSelectOrder }) => {
    const { salesOrders } = useSales();

    // Filter for Pending/Approved orders that need dispatch
    const pendingOrders = salesOrders.filter(o => o.status === 'APPROVED' || o.status === 'PENDING');

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <ShoppingBag className="text-brand-600" />
                        Sales Orders
                    </h2>
                    <p className="text-sm text-slate-500">Manage incoming orders and plan dispatch</p>
                </div>
                <div className="flex gap-2">
                    <span className="bg-white px-3 py-1 rounded-full border border-slate-200 text-xs font-bold text-slate-600 shadow-sm">
                        Pending: {pendingOrders.length}
                    </span>
                </div>
            </div>

            <div className="grid gap-4">
                {pendingOrders.length === 0 ? (
                    <div className="text-center py-12 bg-white rounded-xl border border-slate-200 border-dashed">
                        <p className="text-slate-400">No pending sales orders found.</p>
                    </div>
                ) : (
                    pendingOrders.map(order => (
                        <div key={order.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex flex-col lg:flex-row justify-between gap-6">
                                {/* Order Details */}
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <h3 className="text-lg font-bold text-slate-800">{order.customerName}</h3>
                                        <span className="text-xs font-mono bg-slate-100 px-2 py-1 rounded text-slate-500">{order.id}</span>
                                    </div>
                                    <div className="flex items-center gap-4 text-sm text-slate-600 mb-3">
                                        <span className="flex items-center gap-1">
                                            <Truck size={14} /> {order.deliveryLocation}
                                        </span>
                                        <span className="w-1 h-1 bg-slate-300 rounded-full"></span>
                                        <span className="font-bold text-slate-800">{order.qtyMts} MT</span>
                                    </div>

                                    {/* Items */}
                                    <div className="space-y-1">
                                        {order.items.map((item, idx) => (
                                            <p key={idx} className="text-xs text-slate-500 bg-slate-50 px-2 py-1 rounded inline-block mr-2">
                                                {item.material} ({item.qty} MT)
                                            </p>
                                        ))}
                                    </div>
                                </div>

                                {/* Credit & Actions */}
                                <div className="flex flex-col items-end gap-3 min-w-[200px]">
                                    <div className="flex items-center gap-2">
                                        <span className="text-xs font-bold text-slate-400 uppercase">Credit Status</span>
                                        {order.creditStatus === 'OK' ? (
                                            <span className="flex items-center gap-1 text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-full border border-emerald-100">
                                                <CheckCircle size={12} /> Approved
                                            </span>
                                        ) : (
                                            <span className="flex items-center gap-1 text-xs font-bold text-red-600 bg-red-50 px-2 py-1 rounded-full border border-red-100">
                                                <XCircle size={12} /> Hold
                                            </span>
                                        )}
                                    </div>

                                    {order.creditStatus === 'OK' ? (
                                        <button
                                            onClick={() => onSelectOrder(order)}
                                            className="px-4 py-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-bold rounded-lg shadow-sm transition-colors flex items-center gap-2"
                                        >
                                            <Truck size={16} /> Plan Dispatch
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2 text-amber-600 text-xs bg-amber-50 px-3 py-2 rounded-lg border border-amber-100">
                                            <AlertTriangle size={14} />
                                            <span>Credit Hold - Cannot Dispatch</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

export default SalesOrderList;
