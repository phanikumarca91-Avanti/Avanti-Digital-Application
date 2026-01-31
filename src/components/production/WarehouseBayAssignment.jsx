import React, { useState } from 'react';
import { Package, ArrowRight, MapPin, CheckCircle, AlertCircle } from 'lucide-react';
import { useWarehouse } from '../../contexts/WarehouseContext';
import SearchableSelect from '../shared/SearchableSelect';
import { MOCK_BAYS } from '../../data/mockBays';

const WarehouseBayAssignment = ({ showAlert }) => {
    const { getOpenMRs, assignBayToMR, bays, seedBins } = useWarehouse();
    const openMRs = getOpenMRs().filter(mr => mr.status === 'PENDING_BAY_ASSIGNMENT');

    const [selectedMR, setSelectedMR] = useState(null);
    const [assignments, setAssignments] = useState({}); // { itemId: bayName }
    const [showAllBays, setShowAllBays] = useState(false);

    const handleBaySelect = (itemId, bay) => {
        setAssignments(prev => ({ ...prev, [itemId]: bay }));
    };

    const handleSubmit = () => {
        if (!selectedMR) return;

        // Validate all items have bays
        const allAssigned = selectedMR.items.every(item => assignments[item.id]);
        if (!allAssigned) {
            showAlert("Please assign a Source Bay for all materials.");
            return;
        }

        // Create updated items list with bay info
        const updatedItems = selectedMR.items.map(item => ({
            ...item,
            sourceBay: assignments[item.id]
        }));

        assignBayToMR(selectedMR.id, updatedItems);
        showAlert(`Bays assigned for MR ${selectedMR.id}. Sent to Dumping.`);
        setSelectedMR(null);
        setAssignments({});
        setShowAllBays(false);
    };

    const getAvailableBays = (item) => {
        // Filter bays that have the required material and non-zero quantity
        const available = bays.filter(b => {
            // STRICT RULE: Only show Raw Material (RM) Bays
            if (!b.id.startsWith('RM')) return false;

            if (showAllBays) {
                // Return ANY bay that has stock (occupied or qty > 0)
                return b.status === 'OCCUPIED' || parseFloat(b.qty) > 0;
            }

            const normalize = (str) => (str || '').toLowerCase().replace(/\s+/g, ' ').replace(/\s*-\s*/g, '-').trim();
            const bayMaterial = normalize(b.material);
            const reqMaterial = normalize(item.name);

            // Allow loose matching
            const materialMatch = bayMaterial === reqMaterial || bayMaterial.includes(reqMaterial) || reqMaterial.includes(bayMaterial);
            const hasQty = parseFloat(b.qty) > 0;
            // Relax occupancy check slightly: If it has Qty > 0, it's effectively occupied/available for picking
            const isOccupied = b.status === 'OCCUPIED' || hasQty;

            return materialMatch && isOccupied;
        });

        return available.map(b => ({
            id: b.name,
            name: `${b.name} - ${b.qty} ${b.uom} (${b.material})`,
            value: b.name // Return ID as value, not the displayed name
        }));
    };

    return (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* MR List */}
            <div className="lg:col-span-1 space-y-4">
                <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                    <AlertCircle size={20} className="text-amber-500" /> Pending Assignment
                </h3>
                {openMRs.length === 0 ? (
                    <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-slate-400">
                        No MRs pending bay assignment.
                    </div>
                ) : (
                    openMRs.map(mr => (
                        <div
                            key={mr.id}
                            onClick={() => setSelectedMR(mr)}
                            className={`p-4 rounded-xl border cursor-pointer transition-all ${selectedMR?.id === mr.id
                                ? 'bg-brand-50 border-brand-500 shadow-md'
                                : 'bg-white border-slate-200 hover:border-brand-300'
                                }`}
                        >
                            <div className="flex justify-between items-start mb-2">
                                <span className="font-mono text-xs font-bold text-slate-500">{mr.id}</span>
                                <span className="bg-amber-100 text-amber-700 text-[10px] px-2 py-0.5 rounded-full font-bold">PENDING</span>
                            </div>
                            <div className="text-sm font-medium text-slate-800 mb-1">
                                {mr.fgs.map(fg => fg.name).join(', ')}
                            </div>
                            <div className="text-xs text-slate-500">
                                {mr.items.length} Materials Requested
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Assignment Area */}
            <div className="lg:col-span-2">
                {selectedMR ? (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                        <div className="flex justify-between items-center mb-6 pb-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-xl font-bold text-slate-800">Assign Source Bays</h2>
                                <p className="text-sm text-slate-500">Select where to pick materials for {selectedMR.id}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={showAllBays}
                                        onChange={(e) => setShowAllBays(e.target.checked)}
                                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                    />
                                    Show All Occupied Bays
                                </label>
                                <button
                                    onClick={handleSubmit}
                                    className="bg-brand-600 hover:bg-brand-700 text-white px-6 py-2 rounded-lg font-bold flex items-center gap-2 transition-colors"
                                >
                                    <CheckCircle size={18} /> Confirm Assignment
                                </button>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {selectedMR.items.map(item => {
                                const availableBays = getAvailableBays(item);
                                return (
                                    <div key={item.id} className="bg-slate-50 p-4 rounded-lg border border-slate-200 flex flex-col md:flex-row items-center gap-4">
                                        <div className="flex-1">
                                            <h4 className="font-bold text-slate-700">{item.name}</h4>
                                            <p className="text-sm text-slate-500">Required: <span className="font-mono font-bold">{item.qty} {item.uom}</span></p>
                                        </div>
                                        <div className="w-full md:w-64">
                                            <SearchableSelect
                                                label="Source Bay"
                                                placeholder="Select Bay..."
                                                options={availableBays}
                                                value={assignments[item.id] || ''}
                                                onChange={(e) => handleBaySelect(item.id, e.target.value)}
                                            />
                                            {availableBays.length === 0 && (
                                                <div className="mt-2 text-xs text-red-500 flex items-center justify-end gap-1">
                                                    <span>No RM Stock.</span>
                                                    <button
                                                        onClick={() => { seedBins(); setShowAllBays(true); }}
                                                        className="underline font-bold hover:text-red-700"
                                                    >
                                                        Add Test Stock
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-400 bg-slate-50/50 rounded-xl border-2 border-dashed border-slate-200 p-12">
                        <MapPin size={48} className="mb-4 opacity-20" />
                        <p>Select a Material Requisition to assign bays.</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default WarehouseBayAssignment;
