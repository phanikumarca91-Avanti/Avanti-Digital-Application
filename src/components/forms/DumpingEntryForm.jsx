import React, { useState } from 'react';
import { ArrowRight, CheckCircle, AlertCircle } from 'lucide-react';
import SearchableSelect from '../shared/SearchableSelect';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { useOrganization } from '../../contexts/OrganizationContext';

const DumpingEntryForm = ({
    initialData = null,
    readOnly = false,
    onSubmit,
}) => {
    const { getBinsByUnit, getOpenMRs } = useWarehouse();
    const { currentUnit } = useOrganization();

    // Simplify initial logic. 
    // If readOnly, we assume initialData contains all display strings nicely.
    // If not, we rely on selection.

    const [selectedMR, setSelectedMR] = useState(initialData?.mrId ? { id: initialData.mrId, items: [] } : null); // Items handled dynamically
    // Note: complex state like 'selectedItem' object might easier be just ID or Name strings for display
    const [selectedItemName, setSelectedItemName] = useState(initialData?.material || '');
    const [selectedBinName, setSelectedBinName] = useState(initialData?.bin || '');
    const [qty, setQty] = useState(initialData?.qty || '');
    const [uom, setUom] = useState(initialData?.uom || 'KGS');
    const [sourceBay, setSourceBay] = useState(initialData?.sourceBay || '');

    // For Entry Mode
    const pendingMRs = !readOnly ? getOpenMRs().filter(mr => mr.status === 'PENDING_DUMPING') : [];
    // We need logic to hydrate the 'selectedMR' fully to get items if in Entry Mode
    // But if we are entry mode, initialData is null usually.

    const availableBins = !readOnly ? getBinsByUnit(currentUnit?.name, 'BIN') : [];

    const handleMRChange = (mrId) => {
        if (readOnly) return;
        const mr = pendingMRs.find(m => m.id === mrId);
        setSelectedMR(mr);
        setSelectedItemName('');
        setQty('');
        setSourceBay('');
    };

    const handleItemChange = (itemName) => {
        if (readOnly) return;
        if (!selectedMR) return;
        const item = selectedMR.items.find(i => i.name === itemName);
        setSelectedItemName(item.name);
        setQty(item.qty); // Default
        setUom(item.uom);
        setSourceBay(item.sourceBay);
    };

    const handleSubmitInternal = () => {
        if (readOnly) return;
        if (!selectedMR || !selectedItemName || !selectedBinName || !qty) {
            alert("Please fill all fields");
            return;
        }

        if (onSubmit) {
            // Find full item object to pass back
            const item = selectedMR.items.find(i => i.name === selectedItemName);

            onSubmit({
                mr: selectedMR,
                item: item,
                binId: selectedBinName,
                qty: qty
            });
        }

        // Reset
        setSelectedItemName('');
        setSelectedBinName('');
        setQty('');
        setSourceBay('');
    };

    return (
        <div className={`space-y-6 ${readOnly ? 'pointer-events-none' : ''}`}>
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-8">
                <div className="space-y-8">
                    {/* Step 1: Select MR */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Source Selection</h3>
                        {readOnly ? (
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">MR ID</label>
                                    <input type="text" value={selectedMR?.id || 'N/A'} disabled className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-mono" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Material</label>
                                    <input type="text" value={selectedItemName || 'N/A'} disabled className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Source Bay</label>
                                    <input type="text" value={sourceBay || 'N/A'} disabled className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700" />
                                </div>
                            </div>
                        ) : (
                            <>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <SearchableSelect
                                        label="Select Approved Requisition"
                                        placeholder="Search MR ID..."
                                        options={pendingMRs.map(mr => ({ name: mr.id, ...mr }))}
                                        value={selectedMR?.id || ''}
                                        onChange={(e) => handleMRChange(e.target.value)}
                                    />
                                    {selectedMR && (
                                        <SearchableSelect
                                            label="Select Material to Dump"
                                            placeholder="Select material..."
                                            options={selectedMR.items}
                                            value={selectedItemName || ''}
                                            onChange={(e) => handleItemChange(e.target.value)}
                                        />
                                    )}
                                </div>
                                {selectedItemName && sourceBay && (
                                    <div className="mt-4 flex items-center gap-2 text-sm text-blue-700 bg-blue-50 px-4 py-2 rounded-lg border border-blue-100">
                                        <AlertCircle size={16} />
                                        <span>Pick from Bay: <strong>{sourceBay}</strong></span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>

                    {/* Step 2: Select Bin */}
                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200">
                        <h3 className="text-sm font-bold text-slate-700 mb-4 uppercase tracking-wider">Target Bin Allocation</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Target Bin Location</label>
                                {readOnly ? (
                                    <input type="text" value={selectedBinName} disabled className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-mono" />
                                ) : (
                                    <select
                                        value={selectedBinName}
                                        onChange={(e) => setSelectedBinName(e.target.value)}
                                        className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20"
                                    >
                                        <option value="">Select Bin...</option>
                                        {availableBins.map(bin => {
                                            const isOccupiedByOther = bin.status === 'OCCUPIED' && bin.material !== selectedItemName;
                                            return (
                                                <option key={bin.id} value={bin.id} disabled={isOccupiedByOther}>
                                                    {bin.name} ({bin.status === 'EMPTY' ? 'Empty' : `${bin.qty} ${bin.uom} ${bin.material}`})
                                                    {isOccupiedByOther ? ' - Occupied' : ''}
                                                </option>
                                            );
                                        })}
                                    </select>
                                )}
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">Quantity to Dump ({uom})</label>
                                <input
                                    type="number"
                                    value={qty}
                                    onChange={(e) => setQty(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20"
                                    placeholder="0.00"
                                    disabled={readOnly}
                                />
                            </div>
                        </div>
                    </div>

                    {!readOnly && (
                        <button
                            onClick={handleSubmitInternal}
                            disabled={!selectedBinName || !qty}
                            className={`w-full font-bold py-3 rounded-xl shadow-lg transition-all flex items-center justify-center gap-2 mt-4 ${selectedBinName && qty
                                ? 'bg-brand-600 hover:bg-brand-700 text-white shadow-brand-500/20'
                                : 'bg-slate-200 text-slate-400 cursor-not-allowed'
                                }`}
                        >
                            <CheckCircle size={20} />
                            Confirm Dumping
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

export default DumpingEntryForm;
