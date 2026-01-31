import React, { useState } from 'react';
import { ClipboardCheck, CheckCircle, AlertTriangle, ArrowRight } from 'lucide-react';
import SearchableSelect from '../shared/SearchableSelect';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { useProduction } from '../../contexts/ProductionContext';
import { useOrganization } from '../../contexts/OrganizationContext';

const MRClosure = ({ showAlert }) => {
    const { getOpenMRs, closeMR, getBinsByUnit, updateBinStock, getAllMRs } = useWarehouse();
    const { lots } = useProduction();
    const { currentUnit } = useOrganization();

    const [viewMode, setViewMode] = useState('entry'); // 'entry' or 'history'
    const historyMRs = getAllMRs().filter(mr => mr.status === 'CLOSED').sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

    const [selectedMR, setSelectedMR] = useState(null);
    const [selectedLots, setSelectedLots] = useState([]);
    const [consumptionData, setConsumptionData] = useState({}); // { binId: qty }

    // Filter MRs
    const openMRs = getOpenMRs().filter(mr => mr.status === 'PENDING_DUMPING' || mr.status === 'IN_PROGRESS');

    // Filter Lots
    const availableLots = lots.filter(l => !l.mrId);

    // Get Occupied Bins for Consumption
    // We strictly want Production Bins (U1KVRB...) here
    const occupiedBins = getBinsByUnit(currentUnit?.name, 'BIN').filter(b => b.status === 'OCCUPIED');

    const handleLotToggle = (lotId) => {
        setSelectedLots(prev =>
            prev.includes(lotId)
                ? prev.filter(id => id !== lotId)
                : [...prev, lotId]
        );
    };

    const handleConsumptionChange = (binId, qty) => {
        setConsumptionData(prev => ({
            ...prev,
            [binId]: qty
        }));
    };

    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = () => {
        if (isSubmitting) return;

        if (!selectedMR) {
            showAlert("Please select an MR to close.");
            return;
        }

        const binsToConsume = Object.entries(consumptionData).filter(([_, qty]) => qty && parseFloat(qty) > 0);

        if (binsToConsume.length === 0) {
            showAlert("Please enter consumption quantity for at least one bin.");
            return;
        }

        setIsSubmitting(true);

        // 1. Consume Bins (Reduce Stock)
        binsToConsume.forEach(([binId, qty]) => {
            updateBinStock(binId, qty, null, 'REMOVE');
        });

        // 2. Close MR
        closeMR(selectedMR.id, { lots: selectedLots, consumed: binsToConsume });

        // 3. Update Lots
        console.log(`Linked ${selectedLots.length} lots to MR ${selectedMR.id}`);

        showAlert(`MR ${selectedMR.id} Closed Successfully! Consumed materials & linked lots.`);
        setSelectedMR(null);
        setSelectedLots([]);
        setConsumptionData({});
        setTimeout(() => setIsSubmitting(false), 1000);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-6">
            {/* Header with Toggle */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <ClipboardCheck className="text-brand-600" /> MR Closure
                </h2>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('entry')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'entry'
                            ? 'bg-white text-brand-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        New Closure
                    </button>
                    <button
                        onClick={() => setViewMode('history')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'history'
                            ? 'bg-white text-brand-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        History
                    </button>
                </div>
            </div>

            {viewMode === 'entry' ? (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                    <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-100">
                        <div className="p-2 bg-green-50 rounded-lg text-green-600">
                            <ClipboardCheck size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">MR Closure & Consumption</h2>
                            <p className="text-sm text-slate-500">Consume Materials, Link Lots, and Close MR</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
                        {/* Step 1: Select MR */}
                        <div>
                            <h3 className="font-bold text-slate-700 mb-4">1. Select Open Requisition</h3>
                            <SearchableSelect
                                label="Open MR"
                                placeholder="Search MR ID..."
                                options={openMRs.map(mr => ({ name: mr.id, ...mr }))}
                                value={selectedMR?.id || ''}
                                onChange={(e) => setSelectedMR(openMRs.find(m => m.id === e.target.value))}
                            />
                        </div>

                        {/* Step 2: Select Lots */}
                        <div>
                            <h3 className="font-bold text-slate-700 mb-4">2. Assign Produced Lots</h3>
                            {availableLots.length === 0 ? (
                                <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-300 text-center text-slate-500 text-sm">
                                    No unassigned lots available.
                                </div>
                            ) : (
                                <div className="space-y-2 max-h-40 overflow-y-auto">
                                    {availableLots.map(lot => (
                                        <div
                                            key={lot.id}
                                            onClick={() => handleLotToggle(lot.id)}
                                            className={`p-3 rounded-lg border cursor-pointer flex justify-between items-center ${selectedLots.includes(lot.id)
                                                ? 'bg-green-50 border-green-500'
                                                : 'bg-white border-slate-200 hover:border-green-300'
                                                }`}
                                        >
                                            <div>
                                                <div className="font-mono font-bold text-slate-700">{lot.lotNumber}</div>
                                                <div className="text-xs text-slate-500">{lot.fgName}</div>
                                            </div>
                                            {selectedLots.includes(lot.id) && <CheckCircle size={16} className="text-green-600" />}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Step 3: Consumption */}
                    {selectedMR && (
                        <div className="space-y-4 border-t border-slate-100 pt-6">
                            <div className="flex justify-between items-center">
                                <h3 className="font-bold text-slate-700 flex items-center gap-2">
                                    <ArrowRight size={16} className="text-brand-500" /> 3. Consume from Bins
                                </h3>
                                <span className="text-xs text-slate-500">Enter quantity to consume</span>
                            </div>

                            {occupiedBins.length === 0 ? (
                                <div className="p-8 text-center bg-slate-50 rounded-xl border border-dashed border-slate-300">
                                    <AlertTriangle className="mx-auto h-8 w-8 text-amber-400 mb-2" />
                                    <p className="text-slate-600 font-medium">No Materials in Bins</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-60 overflow-y-auto p-1">
                                    {occupiedBins.map(bin => (
                                        <div
                                            key={bin.id}
                                            className={`p-4 rounded-xl border transition-all ${consumptionData[bin.id]
                                                ? 'bg-brand-50 border-brand-500 shadow-sm'
                                                : 'bg-white border-slate-200'
                                                }`}
                                        >
                                            <div className="flex justify-between items-start mb-2">
                                                <span className="text-xs font-bold text-slate-500">{bin.name}</span>
                                                <span className="text-xs bg-slate-100 px-2 py-0.5 rounded text-slate-600">
                                                    Avail: {bin.qty} {bin.uom}
                                                </span>
                                            </div>
                                            <div className="font-medium text-slate-800 truncate mb-3" title={bin.material}>
                                                {bin.material}
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <input
                                                    type="number"
                                                    placeholder="Consume Qty"
                                                    className="w-full bg-white border border-slate-300 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-brand-500"
                                                    value={consumptionData[bin.id] || ''}
                                                    onChange={(e) => handleConsumptionChange(bin.id, e.target.value)}
                                                />
                                                <span className="text-xs text-slate-500 font-medium">{bin.uom}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                        <button
                            onClick={handleSubmit}
                            disabled={!selectedMR || (selectedLots.length === 0 && Object.keys(consumptionData).length === 0)}
                            className={`
                                px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 shadow-lg transition-all
                                ${!selectedMR || (selectedLots.length === 0 && Object.keys(consumptionData).length === 0)
                                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                    : 'bg-green-600 hover:bg-green-700 shadow-green-500/20'
                                }
                            `}
                        >
                            <CheckCircle size={20} /> Confirm Closure & Consumption
                        </button>
                    </div>
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">MR ID</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Shift</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {historyMRs.length === 0 ? (
                                <tr>
                                    <td colSpan="4" className="px-6 py-8 text-center text-slate-500">No closed MR history found.</td>
                                </tr>
                            ) : (
                                historyMRs.map(mr => (
                                    <tr key={mr.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 text-slate-500">{new Date(mr.createdAt).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 font-medium text-slate-900">{mr.id}</td>
                                        <td className="px-6 py-4 text-slate-500">{mr.shift}</td>
                                        <td className="px-6 py-4">
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                                {mr.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
};

export default MRClosure;
