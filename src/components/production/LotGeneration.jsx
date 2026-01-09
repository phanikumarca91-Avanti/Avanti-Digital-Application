import React, { useState } from 'react';
import { Factory, Plus, Calendar } from 'lucide-react';
import { useOrganization } from '../../contexts/OrganizationContext';
import { useProduction } from '../../contexts/ProductionContext';

const LotGeneration = ({ showAlert }) => {
    const { generateBatchLotNumbers, addLots } = useProduction();
    const { currentUnit } = useOrganization();

    const [viewMode, setViewMode] = useState('entry'); // 'entry' or 'history'
    const { lots } = useProduction();
    const historyLots = lots.sort((a, b) => new Date(b.lotDate) - new Date(a.lotDate));

    const [lotDate, setLotDate] = useState(new Date().toISOString().split('T')[0]);
    const [quantity, setQuantity] = useState(1);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generatedLots, setGeneratedLots] = useState([]);

    const handleSubmit = () => {
        setIsSubmitting(true);
        const dateObj = new Date(lotDate);

        // Generate Batch Lots
        const newLotNumbers = generateBatchLotNumbers(currentUnit?.name || 'Unit-1', dateObj, quantity);

        // Prepare Lot Data
        const lotsData = newLotNumbers.map(lotNumber => ({
            lotNumber,
            fgName: null,
            shift: null,
            unit: currentUnit?.name,
            lotDate: lotDate,
            mrId: null,
            binsConsumed: [],
            status: 'UNASSIGNED'
        }));

        // Add to Context
        addLots(lotsData);

        setTimeout(() => {
            setGeneratedLots(newLotNumbers);
            showAlert(`Successfully generated ${quantity} Lot ID(s)! Ready for assignment.`);
            setIsSubmitting(false);
        }, 500);
    };

    return (
        <div className="max-w-4xl mx-auto space-y-6">
            {/* Header with Toggle */}
            <div className="flex items-center justify-between bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                    <Factory className="text-brand-600" /> Lot Generation
                </h2>
                <div className="flex bg-slate-100 p-1 rounded-lg">
                    <button
                        onClick={() => setViewMode('entry')}
                        className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${viewMode === 'entry'
                            ? 'bg-white text-brand-600 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        New Generation
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
                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                            <Factory size={24} />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold text-slate-800">Lot ID Generation</h2>
                            <p className="text-sm text-slate-500">Generate Lot IDs for {currentUnit?.name} (Assignment happens later)</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5 flex items-center gap-2">
                                <Calendar size={16} /> Lot Date
                            </label>
                            <input
                                type="date"
                                value={lotDate}
                                onChange={(e) => setLotDate(e.target.value)}
                                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20"
                            />
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-slate-700 mb-1.5">Quantity of Lots</label>
                            <div className="flex items-center gap-4">
                                <input
                                    type="number"
                                    min="1"
                                    max="50"
                                    value={quantity}
                                    onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                                    className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-slate-700 outline-none focus:ring-2 focus:ring-brand-500/20"
                                />
                            </div>
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-slate-100 flex justify-end">
                        <button
                            onClick={handleSubmit}
                            disabled={isSubmitting}
                            className={`
                                px-6 py-3 rounded-xl font-bold text-white flex items-center gap-2 shadow-lg transition-all
                                ${isSubmitting
                                    ? 'bg-slate-300 cursor-not-allowed shadow-none'
                                    : 'bg-purple-600 hover:bg-purple-700 shadow-purple-500/20'
                                }
                            `}
                        >
                            <Plus size={20} /> {isSubmitting ? 'Generating...' : 'Generate IDs'}
                        </button>
                    </div>

                    {/* Generated Lots Display */}
                    {generatedLots.length > 0 && (
                        <div className="mt-8 bg-slate-50 p-6 rounded-xl border border-slate-200 animate-fade-in">
                            <h3 className="font-bold text-slate-700 mb-4">Recently Generated IDs</h3>
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                                {generatedLots.map(lot => (
                                    <div key={lot} className="bg-white p-3 rounded-lg border border-slate-200 text-center font-mono font-bold text-purple-600 shadow-sm">
                                        {lot}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 font-semibold text-slate-700">Lot Number</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Date</th>
                                <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {historyLots.length === 0 ? (
                                <tr>
                                    <td colSpan="3" className="px-6 py-8 text-center text-slate-500">No lot history found.</td>
                                </tr>
                            ) : (
                                historyLots.map(lot => (
                                    <tr key={lot.lotNumber} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 font-mono font-medium text-slate-900">{lot.lotNumber}</td>
                                        <td className="px-6 py-4 text-slate-500">{new Date(lot.lotDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4">
                                            <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${lot.status === 'UNASSIGNED' ? 'bg-slate-100 text-slate-800' :
                                                lot.status === 'APPROVED' ? 'bg-green-100 text-green-800' :
                                                    'bg-blue-100 text-blue-800'
                                                }`}>
                                                {lot.status}
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

export default LotGeneration;
