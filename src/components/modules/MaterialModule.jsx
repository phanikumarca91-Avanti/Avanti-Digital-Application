import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, Save, X, Package, Database, ShoppingCart, Recycle, Layers, Upload } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useMasterData } from '../../contexts/MasterDataContext';
import Input from '../shared/Input';

const MaterialModule = ({ showAlert, showConfirm }) => {
    const { masterData, addMaterial, updateMaterial, deleteMaterial } = useMasterData();
    const [activeTab, setActiveTab] = useState('RAW_MATERIALS');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [selectedItems, setSelectedItems] = useState(new Set());

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    const handleResetData = () => {
        if (confirm("This will reset all Master Data to the system defaults. Any custom changes will be lost. Continue?")) {
            localStorage.removeItem('master_data_changes_v1');
            window.location.reload();
        }
    };

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        code: '',
        hsnCode: '',
        type: '',
        category: '',
        uom: 'KGS'
    });

    const tabs = [
        { id: 'RAW_MATERIALS', label: 'Raw Materials', icon: Database, color: 'text-blue-600', bg: 'bg-blue-50' },
        { id: 'FINISHED_GOODS', label: 'Finished Goods', icon: Package, color: 'text-indigo-600', bg: 'bg-indigo-50' },
        { id: 'PACKING_MATERIALS', label: 'Packing Materials', icon: Package, color: 'text-orange-600', bg: 'bg-orange-50' },
        { id: 'STORES_SPARES', label: 'Stores & Spares', icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-50' },
        { id: 'RECYCLE_MATERIALS', label: 'Recycle Materials', icon: Recycle, color: 'text-green-600', bg: 'bg-green-50' },
        { id: 'OTHERS', label: 'Other Materials', icon: Layers, color: 'text-slate-600', bg: 'bg-slate-50' }
    ];

    const activeTabConfig = tabs.find(t => t.id === activeTab);

    const filteredItems = (masterData[activeTab] || []).filter(item =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.code && item.code.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    // Pagination Logic
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

    // Reset page when tab or search changes
    React.useEffect(() => {
        setCurrentPage(1);
        setSelectedItems(new Set());
    }, [activeTab, searchTerm]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedItems(new Set(paginatedItems.map(i => i.id)));
        } else {
            setSelectedItems(new Set());
        }
    };

    const handleSelectItem = (id) => {
        const newSelected = new Set(selectedItems);
        if (newSelected.has(id)) {
            newSelected.delete(id);
        } else {
            newSelected.add(id);
        }
        setSelectedItems(newSelected);
    };

    const handleBulkDelete = () => {
        showConfirm(`Are you sure you want to delete ${selectedItems.size} items?`, () => {
            selectedItems.forEach(id => deleteMaterial(activeTab, id));
            setSelectedItems(new Set());
            showAlert(`${selectedItems.size} materials deleted successfully`);
        });
    };

    const handleOpenModal = (item = null) => {
        if (item) {
            setEditingItem(item);
            setFormData(item);
        } else {
            setEditingItem(null);
            setFormData({
                name: '',
                code: '',
                hsnCode: '',
                type: activeTab === 'RAW_MATERIALS' ? 'RM' : activeTab === 'FINISHED_GOODS' ? 'FG' : 'OTHER', // Default type based on tab
                category: '',
                uom: 'KGS'
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (!formData.name) {
            showAlert("Material Name is required");
            return;
        }

        if (editingItem) {
            updateMaterial(activeTab, editingItem.id, formData);
            showAlert("Material updated successfully");
            addMaterial(activeTab, formData);
            showAlert("Material added successfully");
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id) => {
        showConfirm("Are you sure you want to delete this material?", () => {
            deleteMaterial(activeTab, id);
            showAlert("Material deleted successfully");
        });
    };

    const handleFileUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const bstr = evt.target.result;
                const wb = XLSX.read(bstr, { type: 'binary' });
                const wsname = wb.SheetNames[0];
                const ws = wb.Sheets[wsname];
                const data = XLSX.utils.sheet_to_json(ws);

                if (data.length === 0) {
                    showAlert("Excel file is empty");
                    return;
                }

                let addedCount = 0;
                data.forEach((row) => {
                    const name = row['Material Name'] || row['Name'] || row['Description'] || row['Item Name'];
                    if (!name) return;

                    const newItem = {
                        name: String(name).trim(),
                        code: String(row['Material Code'] || row['Code'] || '').trim(),
                        hsnCode: String(row['HSN Code'] || row['HSN'] || '').trim(),
                        type: activeTab === 'RAW_MATERIALS' ? 'RM' : activeTab === 'FINISHED_GOODS' ? 'FG' : 'OTHER',
                        category: String(row['Category'] || row['Item Category'] || 'General').trim(),
                        uom: String(row['UOM'] || row['Unit'] || 'KGS').trim()
                    };

                    addMaterial(activeTab, newItem);
                    addedCount++;
                });

                showAlert(`Successfully imported ${addedCount} items!`);
                e.target.value = null;
            } catch (error) {
                console.error("Error parsing Excel:", error);
                showAlert("Error parsing Excel file. Please check format.");
            }
        };
        reader.readAsBinaryString(file);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Material Master</h1>
                    <p className="text-sm text-slate-500">Manage Raw Materials, Packing, Stores, and more</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={handleResetData}
                        className="text-slate-500 hover:text-red-600 px-4 py-2 text-sm font-medium transition-colors"
                    >
                        Reset Data
                    </button>
                    {selectedItems.size > 0 && (
                        <button
                            onClick={handleBulkDelete}
                            className="bg-red-50 text-red-600 px-4 py-2 rounded-xl font-bold hover:bg-red-100 transition-all flex items-center gap-2"
                        >
                            <Trash2 size={20} /> Delete ({selectedItems.size})
                        </button>
                    )}

                    <label className="bg-emerald-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-emerald-500/20 hover:bg-emerald-700 transition-all flex items-center gap-2 cursor-pointer">
                        <Upload size={20} /> Import Excel
                        <input
                            type="file"
                            accept=".xlsx, .xls, .csv"
                            className="hidden"
                            onChange={handleFileUpload}
                        />
                    </label>

                    <button
                        onClick={() => handleOpenModal()}
                        className="bg-brand-600 text-white px-4 py-2 rounded-xl font-bold shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all flex items-center gap-2"
                    >
                        <Plus size={20} /> Add New Material
                    </button>
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-2xl shadow-sm border border-slate-100 p-2 overflow-x-auto">
                <div className="flex space-x-2 min-w-max">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 rounded-xl text-sm font-bold transition-all flex items-center gap-2 ${activeTab === tab.id
                                ? `${tab.bg} ${tab.color} ring-1 ring-inset ring-black/5`
                                : 'text-slate-500 hover:bg-slate-50 hover:text-slate-700'
                                }`}
                        >
                            <tab.icon size={18} />
                            {tab.label}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden">
                {/* Search Bar */}
                <div className="p-4 border-b border-slate-100 flex gap-4">
                    <div className="flex-1 relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={20} />
                        <input
                            type="text"
                            placeholder={`Search ${activeTabConfig.label}...`}
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
                        />
                    </div>
                    <div className="px-4 py-2.5 bg-slate-50 rounded-xl text-sm font-medium text-slate-500 border border-slate-200">
                        Total: {filteredItems.length}
                    </div>
                </div>

                {/* Table */}
                <div className="overflow-x-auto">
                    <table className="w-full text-left text-sm">
                        <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200">
                            <tr>
                                <th className="px-6 py-4 w-12">
                                    <input
                                        type="checkbox"
                                        checked={paginatedItems.length > 0 && selectedItems.size === paginatedItems.length}
                                        onChange={handleSelectAll}
                                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                    />
                                </th>
                                <th className="px-6 py-4">Material Name</th>
                                <th className="px-6 py-4">Code / HSN</th>
                                <th className="px-6 py-4">Category</th>
                                <th className="px-6 py-4">UOM</th>
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan="6" className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Package size={48} className="opacity-20" />
                                            <p>No materials found.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                paginatedItems.map((item) => (
                                    <tr key={item.id} className="hover:bg-slate-50 transition-colors group">
                                        <td className="px-6 py-4">
                                            <input
                                                type="checkbox"
                                                checked={selectedItems.has(item.id)}
                                                onChange={() => handleSelectItem(item.id)}
                                                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                            />
                                        </td>
                                        <td className="px-6 py-4 font-bold text-slate-700">{item.name}</td>
                                        <td className="px-6 py-4 text-slate-600">
                                            <div className="flex flex-col">
                                                <span className="font-mono text-xs">{item.code || '-'}</span>
                                                <span className="text-[10px] text-slate-400">HSN: {item.hsnCode || '-'}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4">
                                            <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium border border-slate-200">
                                                {item.category || item.type || 'General'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-slate-600 font-mono">{item.uom}</td>
                                        <td className="px-6 py-4 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleOpenModal(item)}
                                                    className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                                >
                                                    <Edit2 size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(item.id)}
                                                    className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination Controls */}
                {filteredItems.length > itemsPerPage && (
                    <div className="p-4 border-t border-slate-100 flex justify-between items-center bg-slate-50">
                        <div className="text-sm text-slate-500">
                            Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredItems.length)} of {filteredItems.length} entries
                        </div>
                        <div className="flex gap-2">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-medium disabled:opacity-50 hover:bg-slate-50"
                            >
                                Previous
                            </button>
                            <span className="px-3 py-1.5 text-sm font-medium text-slate-600">
                                Page {currentPage} of {totalPages}
                            </span>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="px-3 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-sm font-medium disabled:opacity-50 hover:bg-slate-50"
                            >
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>

            {/* Add/Edit Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-lg text-slate-800">
                                {editingItem ? 'Edit Material' : 'Add New Material'}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="p-6 space-y-4">
                            <Input
                                label="Material Name *"
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="e.g. Fish Meal"
                            />
                            <div className="grid grid-cols-2 gap-4">
                                <Input
                                    label="Material Code"
                                    value={formData.code}
                                    onChange={(e) => setFormData({ ...formData, code: e.target.value })}
                                    placeholder="e.g. RM-001"
                                />
                                <Input
                                    label="HSN Code"
                                    value={formData.hsnCode}
                                    onChange={(e) => setFormData({ ...formData, hsnCode: e.target.value })}
                                    placeholder="e.g. 230120"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">Category</label>
                                    <select
                                        value={formData.category}
                                        onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20"
                                    >
                                        <option value="">Select Category...</option>
                                        <option value="Imported">Imported</option>
                                        <option value="Indigenous">Indigenous</option>
                                        <option value="General">General</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-bold text-slate-700 mb-1.5">UOM</label>
                                    <select
                                        value={formData.uom}
                                        onChange={(e) => setFormData({ ...formData, uom: e.target.value })}
                                        className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20"
                                    >
                                        {masterData.UOM_MASTER.map(u => (
                                            <option key={u} value={u}>{u}</option>
                                        ))}
                                    </select>
                                </div>
                            </div>
                        </div>
                        <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setIsModalOpen(false)}
                                className="px-4 py-2 text-slate-600 font-medium hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleSave}
                                className="px-6 py-2 bg-brand-600 text-white font-bold rounded-lg shadow-lg shadow-brand-500/20 hover:bg-brand-700 transition-all"
                            >
                                Save Material
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MaterialModule;
