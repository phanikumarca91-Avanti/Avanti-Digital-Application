import React, { useState, useEffect } from 'react';
import { Plus, Trash2, X, Save, Send } from 'lucide-react';
import SearchableSelect from '../shared/SearchableSelect';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useOrganization } from '../../contexts/OrganizationContext';

const MaterialRequisitionForm = ({
    initialData = null,
    readOnly = false,
    onSubmit,
    reqId: propReqId // ID passed from parent if creating new
}) => {
    const { currentLocation, currentUnit } = useOrganization();
    const { masterData } = useMasterData();

    // Form State
    const [reqId, setReqId] = useState(initialData?.id || propReqId || '');
    const [shift, setShift] = useState(initialData?.shift || 'A');

    // Multi-Select FG State
    const [selectedFGs, setSelectedFGs] = useState(initialData?.fgs || []);
    const [currentFG, setCurrentFG] = useState('');
    const [plannedQty, setPlannedQty] = useState('');

    // RM List State
    const [items, setItems] = useState(initialData?.items || []);
    const [currentItem, setCurrentItem] = useState({ name: '', qty: '', uom: 'KGS' });

    // Update ID if prop changes and not in readOnly/Edit mode
    useEffect(() => {
        if (!initialData && propReqId) {
            setReqId(propReqId);
        }
    }, [propReqId, initialData]);

    const handleAddFG = () => {
        if (readOnly) return;
        if (!currentFG || !plannedQty) {
            alert("Please select a FG and Planned Qty"); // Use simple alert or pass showAlert prop
            return;
        }
        setSelectedFGs([...selectedFGs, { name: currentFG, qty: plannedQty }]);
        setCurrentFG('');
        setPlannedQty('');
    };

    const handleRemoveFG = (index) => {
        if (readOnly) return;
        setSelectedFGs(selectedFGs.filter((_, i) => i !== index));
    };

    const handleAddItem = () => {
        if (readOnly) return;
        if (!currentItem.name || !currentItem.qty) {
            alert("Please select a material and quantity");
            return;
        }
        setItems([...items, { ...currentItem, id: Date.now() }]);
        setCurrentItem({ name: '', qty: '', uom: 'KGS' });
    };

    const handleDeleteItem = (id) => {
        if (readOnly) return;
        setItems(items.filter(item => item.id !== id));
    };

    const handleSubmitInternal = () => {
        if (readOnly) return;
        if (selectedFGs.length === 0) {
            alert("Please add at least one Target Finished Good");
            return;
        }
        if (items.length === 0) {
            alert("Please add at least one Raw Material");
            return;
        }

        const mrData = {
            id: reqId,
            shift,
            fgs: selectedFGs,
            items,
            unit: currentUnit?.name
        };

        if (onSubmit) {
            onSubmit(mrData);
            // Reset logic should be handled by parent or here if needed
            if (!initialData) {
                setItems([]);
                setSelectedFGs([]);
            }
        }
    };

    return (
        <div className={`space-y-6 ${readOnly ? 'opacity-90 pointer-events-none' : ''}`}>
            {/* Header Card */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <div className="flex justify-between items-start mb-6">
                    <div>
                        <h2 className="text-lg font-bold text-slate-800">
                            {readOnly ? 'Material Requisition Details' : 'New Material Requisition'}
                        </h2>
                        <p className="text-sm text-slate-500">
                            {readOnly ? 'View Requisition Information' : 'Request Raw Materials for Production'}
                        </p>
                    </div>
                    <div className="bg-slate-100 px-3 py-1 rounded-lg text-xs font-mono text-slate-600">
                        {reqId}
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Date</label>
                        <input
                            type="text"
                            value={initialData ? new Date(initialData.createdAt).toLocaleDateString() : new Date().toLocaleDateString()}
                            disabled
                            className="w-full bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 text-slate-700 font-medium"
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Shift</label>
                        <select
                            value={shift}
                            onChange={(e) => setShift(e.target.value)}
                            disabled={readOnly}
                            className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-brand-500/20 outline-none disabled:bg-slate-50"
                        >
                            <option value="A">Shift A (6 AM - 2 PM)</option>
                            <option value="B">Shift B (2 PM - 10 PM)</option>
                            <option value="C">Shift C (10 PM - 6 AM)</option>
                        </select>
                    </div>
                </div>

                {/* Multi-Select FG Section */}
                <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 mb-6">
                    <h3 className="text-sm font-bold text-slate-700 mb-3">Target Finished Goods</h3>
                    {!readOnly && (
                        <div className="flex flex-col md:flex-row gap-4 items-end mb-4">
                            <div className="flex-1 w-full">
                                <SearchableSelect
                                    label="Finished Good"
                                    placeholder="Select FG..."
                                    options={masterData.FINISHED_GOODS || []}
                                    value={currentFG}
                                    onChange={(e) => setCurrentFG(e.target.value)}
                                />
                            </div>
                            <div className="w-32">
                                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Planned (MT)</label>
                                <input
                                    type="number"
                                    value={plannedQty}
                                    onChange={(e) => setPlannedQty(e.target.value)}
                                    className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none"
                                />
                            </div>
                            <button onClick={handleAddFG} className="bg-brand-600 text-white px-4 py-2 rounded-lg font-medium h-[42px]">
                                <Plus size={18} />
                            </button>
                        </div>
                    )}

                    {/* Selected FGs List */}
                    <div className="flex flex-wrap gap-2">
                        {selectedFGs.map((fg, index) => (
                            <div key={index} className="flex items-center gap-2 bg-white border border-slate-200 px-3 py-1.5 rounded-lg shadow-sm">
                                <span className="text-sm font-medium text-slate-700">{fg.name}</span>
                                <span className="text-xs text-slate-500 bg-slate-100 px-1.5 rounded">{fg.qty} MT</span>
                                {!readOnly && (
                                    <button onClick={() => handleRemoveFG(index)} className="text-slate-400 hover:text-red-500">
                                        <X size={14} />
                                    </button>
                                )}
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Ingredients Section */}
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6">
                <h3 className="text-sm font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <span className="w-1 h-4 bg-brand-500 rounded-full"></span>
                    Raw Material List
                </h3>

                {/* Add Item Row */}
                {!readOnly && (
                    <div className="flex flex-col md:flex-row gap-4 items-end mb-6 bg-slate-50 p-4 rounded-xl border border-slate-100">
                        <div className="flex-1 w-full">
                            <SearchableSelect
                                label="Raw Material"
                                placeholder="Search material..."
                                options={masterData.RAW_MATERIALS || []}
                                value={currentItem.name}
                                onChange={(e) => setCurrentItem({ ...currentItem, name: e.target.value })}
                            />
                        </div>
                        <div className="w-32">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">Qty</label>
                            <input
                                type="number"
                                placeholder="0.00"
                                value={currentItem.qty}
                                onChange={(e) => setCurrentItem({ ...currentItem, qty: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 focus:ring-2 focus:ring-brand-500/20 outline-none"
                            />
                        </div>
                        <div className="w-24">
                            <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-1">UOM</label>
                            <select
                                value={currentItem.uom}
                                onChange={(e) => setCurrentItem({ ...currentItem, uom: e.target.value })}
                                className="w-full bg-white border border-slate-200 rounded-lg px-3 py-2 text-slate-700 outline-none"
                            >
                                <option>KGS</option>
                                <option>MTS</option>
                                <option>LTR</option>
                            </select>
                        </div>
                        <button
                            onClick={handleAddItem}
                            className="bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors h-[42px]"
                        >
                            <Plus size={18} /> Add
                        </button>
                    </div>
                )}

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-slate-50 text-slate-500 font-medium border-b border-slate-200">
                            <tr>
                                <th className="px-4 py-3">Material Name</th>
                                <th className="px-4 py-3 w-32">Required Qty</th>
                                <th className="px-4 py-3 w-24">UOM</th>
                                {!readOnly && <th className="px-4 py-3 w-16">Action</th>}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {items.length === 0 ? (
                                <tr>
                                    <td colSpan={readOnly ? 3 : 4} className="px-4 py-8 text-center text-slate-400 italic">
                                        No materials added.
                                    </td>
                                </tr>
                            ) : (
                                items.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 group transition-colors">
                                        <td className="px-4 py-3 font-medium text-slate-700">{item.name}</td>
                                        <td className="px-4 py-3">{item.qty}</td>
                                        <td className="px-4 py-3 text-slate-500">{item.uom}</td>
                                        {!readOnly && (
                                            <td className="px-4 py-3">
                                                <button
                                                    onClick={() => handleDeleteItem(item.id)}
                                                    className="text-slate-400 hover:text-red-500 transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </td>
                                        )}
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Footer Actions */}
            {!readOnly && (
                <div className="flex justify-end gap-4 pt-4">
                    <button className="px-6 py-2.5 text-slate-600 font-medium hover:bg-slate-100 rounded-xl transition-colors flex items-center gap-2">
                        <Save size={18} /> Save Draft
                    </button>
                    <button
                        onClick={handleSubmitInternal}
                        className="px-6 py-2.5 bg-brand-600 hover:bg-brand-700 text-white font-medium rounded-xl shadow-lg shadow-brand-500/20 transition-all flex items-center gap-2"
                    >
                        <Send size={18} /> Submit Requisition
                    </button>
                </div>
            )}
        </div>
    );
};

export default MaterialRequisitionForm;
