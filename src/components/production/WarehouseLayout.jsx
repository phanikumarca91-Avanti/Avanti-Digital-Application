import React from 'react';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { useOrganization } from '../../contexts/OrganizationContext';
import { Package, AlertCircle } from 'lucide-react';

const WarehouseLayout = () => {
    const { getBinsByUnit } = useWarehouse();
    const { currentUnit } = useOrganization();

    const bays = getBinsByUnit(currentUnit?.name, 'BAY');
    const productionBins = getBinsByUnit(currentUnit?.name, 'BIN');

    const rmBays = bays.filter(b => b.id.startsWith('RM'));
    const fgBays = bays.filter(b => b.id.startsWith('FG'));

    const getStatusColor = (status) => {
        switch (status) {
            case 'OCCUPIED': return 'bg-red-100 border-red-200 text-red-700';
            case 'MAINTENANCE': return 'bg-slate-100 border-slate-200 text-slate-500';
            default: return 'bg-emerald-50 border-emerald-200 text-emerald-700';
        }
    };

    const renderGrid = (items, title, icon) => (
        <div className="space-y-4">
            <h3 className="font-bold text-slate-700 flex items-center gap-2">
                {icon} {title} ({items.length})
            </h3>
            {items.length === 0 ? (
                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                    <AlertCircle className="mx-auto h-8 w-8 text-slate-400 mb-2" />
                    <p className="text-sm text-slate-500">No {title.toLowerCase()} found for {currentUnit?.name}</p>
                </div>
            ) : (
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                    {items.map(item => (
                        <div
                            key={item.id}
                            className={`
                                relative p-4 rounded-xl border-2 transition-all cursor-pointer hover:shadow-md
                                ${getStatusColor(item.status)}
                            `}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="text-xs font-bold uppercase tracking-wider opacity-70">{item.type || 'Bin'}</span>
                                <Package size={16} className="opacity-50" />
                            </div>
                            <div className="font-mono font-bold text-lg mb-1 truncate" title={item.name}>
                                {item.name}
                            </div>

                            {item.status === 'OCCUPIED' ? (
                                <div className="text-xs mt-2 pt-2 border-t border-black/5">
                                    <div className="font-medium truncate" title={item.material}>{item.material}</div>
                                    <div className="opacity-75">{item.qty} {item.uom}</div>
                                </div>
                            ) : (
                                <div className="text-xs mt-2 pt-2 border-t border-black/5 opacity-50">
                                    Available
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h2 className="text-lg font-bold text-slate-800">Warehouse Layout - {currentUnit?.name}</h2>
                <div className="flex gap-4 text-xs font-medium">
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Empty
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="w-3 h-3 rounded-full bg-red-500"></span> Occupied
                    </div>
                </div>
            </div>

            {renderGrid(rmBays, "Raw Material Bays", <Package size={18} className="text-blue-600" />)}
            {renderGrid(fgBays, "Finished Goods Bays", <Package size={18} className="text-purple-600" />)}
            {renderGrid(productionBins, "Production Bins", <Package size={18} className="text-orange-600" />)}
        </div>
    );
};

export default WarehouseLayout;
