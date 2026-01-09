import React, { useState } from 'react';
import { Package, MapPin, CheckCircle, ArrowRight } from 'lucide-react';
import { useProduction } from '../../contexts/ProductionContext';
import { useWarehouse } from '../../contexts/WarehouseContext';
import SearchableSelect from '../shared/SearchableSelect';

const FGPlacement = ({ showAlert }) => {
    const { lots, updateLotStatus } = useProduction();
    const { updateBinStock, bays } = useWarehouse();
    const [selectedLot, setSelectedLot] = useState(null);
    const [selectedBay, setSelectedBay] = useState('');

    // Filter lots pending placement (Approved by QA but not placed)
    const pendingPlacementLots = lots.filter(lot => !lot.fgBay);

    // Dynamic FG Bay List from Warehouse Context (Only Empty or same Product ones ideally)
    // For now, list all FG Bays
    const FG_BAY_LIST = bays.filter(b => b.id.startsWith('FG')).map(b => ({
        name: b.id,
        unit: b.unit
    }));

    const handleSubmit = () => {
        if (!selectedLot || !selectedBay) {
            showAlert("Please select a Lot and a Bay.");
            return;
        }

        // Update Lot with Bay info in Production Context
        updateLotStatus(selectedLot.id, selectedLot.status, { ...selectedLot.qcData, fgBay: selectedBay });

        // Update Stock in Warehouse Context (ADD)
        // Assuming lot.qty is in MT (consistent with Initial Stock)
        // If lot.producedQty exists, use that.
        const qtyToAdd = parseFloat(selectedLot.qty || selectedLot.producedQty || 0);
        const productName = selectedLot.fgName || selectedLot.productName || 'Finished Goods';
        const grade = selectedLot.grade || null; // Use grade from lot if available
        const shift = selectedLot.shift || null; // Use shift from lot if available

        updateBinStock(selectedBay, qtyToAdd, productName, 'ADD', grade, shift);

        showAlert(`Lot ${selectedLot.id} placed in Bay ${selectedBay}`);

        setSelectedLot(null);
        setSelectedBay('');
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                    <Package className="text-brand-600" /> FG Placement
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* List of Lots */}
                    <div className="space-y-4">
                        <h3 className="font-bold text-slate-700">Pending Placement</h3>
                        {pendingPlacementLots.length === 0 ? (
                            <div className="text-slate-400 italic">No lots waiting for placement.</div>
                        ) : (
                            <div className="space-y-3 max-h-96 overflow-y-auto pr-2">
                                {pendingPlacementLots.map(lot => (
                                    <div
                                        key={lot.id}
                                        onClick={() => setSelectedLot(lot)}
                                        className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedLot?.id === lot.id
                                            ? 'bg-brand-50 border-brand-500 shadow-sm'
                                            : 'bg-white border-slate-200 hover:border-brand-300'
                                            }`}
                                    >
                                        <div className="flex justify-between items-start mb-1">
                                            <span className="font-mono font-bold text-slate-700">{lot.id}</span>
                                            <span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded text-slate-500">{lot.status}</span>
                                        </div>
                                        <div className="text-sm font-medium text-slate-800">{lot.fgName}</div>
                                        <div className="text-xs text-slate-500 mt-1">{lot.unit} • {lot.shift}</div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Assignment Form */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 h-fit">
                        <h3 className="font-bold text-slate-700 mb-4">Assign Location</h3>

                        {selectedLot ? (
                            <div className="space-y-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Selected Lot</label>
                                    <div className="text-lg font-bold text-slate-800">{selectedLot.id}</div>
                                    <div className="text-sm text-slate-600">{selectedLot.fgName}</div>
                                </div>

                                <SearchableSelect
                                    label="Select FG Bay"
                                    placeholder="Search Bay..."
                                    options={FG_BAY_LIST}
                                    value={selectedBay}
                                    onChange={(e) => setSelectedBay(e.target.value)}
                                />

                                <button
                                    onClick={handleSubmit}
                                    className="w-full bg-brand-600 hover:bg-brand-700 text-white font-bold py-3 rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center justify-center gap-2"
                                >
                                    <CheckCircle size={18} /> Confirm Placement
                                </button>
                            </div>
                        ) : (
                            <div className="text-center text-slate-400 py-12">
                                <MapPin size={48} className="mx-auto mb-4 opacity-20" />
                                <p>Select a Lot to assign a bay.</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default FGPlacement;
