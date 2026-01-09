import React from 'react';
import { LayoutGrid, CheckCircle, Package, AlertCircle } from 'lucide-react';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { useOrganization } from '../../contexts/OrganizationContext';

const BinList = () => {
    const { getBinsByUnit } = useWarehouse();
    const { currentUnit } = useOrganization();

    // Get live bin data for the current unit
    // This ensures we see live status (Occupied/Empty) and Qty
    const bins = getBinsByUnit(currentUnit?.name, 'BIN');

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                        <LayoutGrid className="text-brand-600" />
                        Production Bins
                    </h2>
                    <p className="text-sm text-slate-500">
                        {currentUnit?.name} • Live Status ({bins.length})
                    </p>
                </div>
                <div className="flex gap-4 text-xs font-medium">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Empty
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span> Occupied
                    </div>
                </div>
            </div>

            {bins.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <p className="text-slate-500">No production bins found for {currentUnit?.name}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {bins.map((bin) => {
                        const isOccupied = bin.status === 'OCCUPIED';

                        return (
                            <div
                                key={bin.id}
                                className={`
                                    relative p-4 rounded-xl border-2 transition-all group
                                    ${isOccupied
                                        ? 'bg-red-50 border-red-200 shadow-sm'
                                        : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-md'
                                    }
                                `}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <span className={`text-xs font-bold uppercase tracking-wider ${isOccupied ? 'text-red-600' : 'text-slate-400'}`}>
                                        BIN
                                    </span>
                                    {isOccupied ? (
                                        <Package size={16} className="text-red-500" />
                                    ) : (
                                        <CheckCircle size={16} className="text-emerald-500" />
                                    )}
                                </div>

                                <div className={`font-bold text-lg mb-1 truncate ${isOccupied ? 'text-red-900' : 'text-slate-800'}`}>
                                    {bin.name}
                                </div>

                                {isOccupied ? (
                                    <div className="mt-2 text-xs border-t border-red-100 pt-2 space-y-1">
                                        <div className="font-semibold text-red-800 truncate" title={bin.material}>
                                            {bin.material}
                                        </div>
                                        <div className="font-mono font-bold text-red-700">
                                            {bin.qty} {bin.uom}
                                        </div>
                                    </div>
                                ) : (
                                    <div className="mt-2 text-xs text-slate-400 border-t border-slate-100 pt-2 flex justify-between items-center">
                                        <span className="bg-emerald-50 text-emerald-600 px-2 py-0.5 rounded font-medium">Available</span>
                                        <span className="text-[10px] bg-slate-100 px-1.5 rounded">{bin.unit}</span>
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default BinList;
