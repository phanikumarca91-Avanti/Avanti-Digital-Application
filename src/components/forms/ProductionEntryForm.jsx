import React, { useState } from 'react';
import { Factory, CheckCircle, ArrowRight } from 'lucide-react';
import SearchableSelect from '../shared/SearchableSelect';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { useProduction } from '../../contexts/ProductionContext';
import { useMasterData } from '../../contexts/MasterDataContext';

import { FG_MATERIAL_MASTER } from '../../data/fgMaterialMaster';

const ProductionEntryForm = ({
    initialData = null,
    readOnly = false,
    onSubmit,
}) => {
    const { getLotsByStatus } = useProduction();
    const { getOpenMRs } = useWarehouse();
    const { masterData } = useMasterData();

    const [selectedLotId, setSelectedLotId] = useState(initialData?.lotNumber || '');
    const [selectedMR, setSelectedMR] = useState(initialData?.mrId || '');
    const [targetFG, setTargetFG] = useState(initialData?.grade || initialData?.fgName || ''); // Prefer grade
    const [shift, setShift] = useState(initialData?.shift || 'Shift A');
    const [productionQty, setProductionQty] = useState(initialData?.qty || '');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // ... (rest of state)

    // Fetch unassigned lots for selection
    const unassignedLots = getLotsByStatus('UNASSIGNED');
    const openMRs = getOpenMRs();

    const handleSubmitInternal = () => {
        if (readOnly) return;
        if (!selectedLotId) {
            alert("Please select a Lot Number.");
            return;
        }
        if (!selectedMR) {
            alert("Please select a Source MR.");
            return;
        }
        if (!targetFG) {
            alert("Please select a Finished Good.");
            return;
        }
        if (!productionQty || parseFloat(productionQty) <= 0) {
            alert("Please enter a valid Production Quantity.");
            return;
        }

        setIsSubmitting(true);
        // Simulate async
        setTimeout(() => {
            if (onSubmit) {
                // Look up product details from the selected Grade
                const gradeDetails = FG_MATERIAL_MASTER[targetFG];
                onSubmit({
                    lotId: selectedLotId,
                    fgName: gradeDetails?.productName || targetFG,
                    grade: targetFG, // Store the specific grade string (e.g. "TITAN NO.1 - 10 KG")
                    shift: shift,
                    mrId: selectedMR,
                    qty: parseFloat(productionQty),
                    uom: 'MT'
                });
            }
            // Reset...
            if (!initialData) {
                setSelectedLotId('');
                setSelectedMR('');
                setTargetFG('');
                setProductionQty('');
                setIsSubmitting(false);
            }
        }, 500);
    };

    // Prepare FG Options using Full Grade Names (includes weight)
    const fgOptions = Object.keys(FG_MATERIAL_MASTER).map(grade => ({
        name: grade, // Display "TITAN NO.1 - 10 KG"
        id: grade    // Value "TITAN NO.1 - 10 KG"
    }));

    return (
        <div className={`space-y-6 ${readOnly ? 'pointer-events-none' : ''}`}>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                    <div className="p-2 bg-brand-50 rounded-lg text-brand-600">
                        <Factory size={24} />
                    </div>
                    <div>
                        <h2 className="text-xl font-bold text-slate-800">
                            {readOnly ? 'Production Lot Details' : 'Production Entry'}
                        </h2>
                        <p className="text-sm text-slate-500">
                            {readOnly ? 'View Recorded Production' : 'Assign Finished Goods to Generated Lot IDs'}
                        </p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    {/* Step 1: Select Lot ID */}
                    <div>
                        <h3 className="font-bold text-slate-700 mb-2">1. Lot Identification</h3>
                        {readOnly ? (
                            <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 font-mono font-bold text-slate-700">
                                {selectedLotId || 'N/A'}
                            </div>
                        ) : (
                            <>
                                <SearchableSelect
                                    label="Unassigned Lot ID"
                                    placeholder="Select Lot ID..."
                                    options={unassignedLots.map(l => ({ name: l.lotNumber, id: l.lotNumber }))}
                                    value={selectedLotId}
                                    onChange={(e) => setSelectedLotId(e.target.value)}
                                />
                                <div className="mt-2 text-xs text-slate-500">
                                    {unassignedLots.length} unassigned IDs available.
                                </div>
                            </>
                        )}
                    </div>

                    {/* Step 2: Assign Details */}
                    <div>
                        <h3 className="font-bold text-slate-700 mb-2">2. Production Details</h3>
                        <div className="space-y-4">
                            {readOnly ? (
                                <>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Source MR</label>
                                        <input type="text" value={selectedMR} disabled className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Finished Good</label>
                                        <input type="text" value={targetFG} disabled className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Shift</label>
                                        <input type="text" value={shift} disabled className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700" />
                                    </div>
                                    <div>
                                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Quantity (MT)</label>
                                        <input type="text" value={productionQty} disabled className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-bold" />
                                    </div>
                                </>
                            ) : (
                                <>
                                    <SearchableSelect
                                        label="Source Material Requisition (MR)"
                                        placeholder="Select Source MR..."
                                        options={openMRs.map(mr => ({ name: mr.id, id: mr.id }))}
                                        value={selectedMR}
                                        onChange={(e) => setSelectedMR(e.target.value)}
                                    />

                                    <SearchableSelect
                                        label="Produced Finished Good"
                                        placeholder="Select FG Grade..."
                                        options={fgOptions}
                                        value={targetFG}
                                        onChange={(e) => setTargetFG(e.target.value)}
                                    />

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Shift</label>
                                        <select
                                            value={shift}
                                            onChange={(e) => setShift(e.target.value)}
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20"
                                        >
                                            <option>Shift A</option>
                                            <option>Shift B</option>
                                            <option>Shift C</option>
                                        </select>
                                    </div>

                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1.5">Production Qty (MT)</label>
                                        <input
                                            type="number"
                                            value={productionQty}
                                            onChange={(e) => setProductionQty(e.target.value)}
                                            placeholder="0.00"
                                            className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20"
                                        />
                                    </div>
                                </>
                            )}
                        </div>
                    </div>
                </div>

                {!readOnly && (
                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                        <button
                            onClick={handleSubmitInternal}
                            disabled={isSubmitting || !selectedLotId || !targetFG || !selectedMR}
                            className={`
                                px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 shadow-lg transition-all
                                ${isSubmitting || !selectedLotId || !targetFG || !selectedMR
                                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                    : 'bg-brand-600 hover:bg-brand-700 shadow-brand-500/20'
                                }
                            `}
                        >
                            <CheckCircle size={20} /> {isSubmitting ? 'Processing...' : 'Confirm Production'}
                        </button>
                    </div>
                )}
            </div >
        </div >
    );
};

export default ProductionEntryForm;
