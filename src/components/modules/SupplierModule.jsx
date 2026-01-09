import React, { useState, useMemo } from 'react';
import {
    Users, ShoppingCart, Plus, Search, Edit2, Trash2, X,
    Save, Upload, FileText, CheckSquare, Square
} from 'lucide-react';
import { useMasterData } from '../../contexts/MasterDataContext';
import * as XLSX from 'xlsx';

const Input = ({ label, value, onChange, placeholder, type = "text", required = false }) => (
    <div>
        <label className="block text-sm font-bold text-slate-700 mb-1.5">
            {label} {required && <span className="text-red-500">*</span>}
        </label>
        <input
            type={type}
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20 transition-all"
        />
    </div>
);

const SupplierModule = ({ showAlert, showConfirm }) => {
    const { masterData, addMasterItem, updateMasterItem, deleteMasterItem } = useMasterData();
    const [activeTab, setActiveTab] = useState('SUPPLIERS');
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingItem, setEditingItem] = useState(null);
    const [selectedItems, setSelectedItems] = useState(new Set());

    // Pagination State
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 50;

    // Form State for Supplier
    const [supplierForm, setSupplierForm] = useState({
        entityName: '',
        entityCode: '',
        gstin: '',
        panNo: '',
        msmeNo: '',
        address1: '',
        address2: '',
        city: '',
        district: '',
        state: '',
        country: '',
        pinCode: '',
        contactPerson: '',
        mobile: '',
        phone: '',
        email: '',
        url: '',
        bankName: '',
        branch: '',
        accountNo: '',
        ifscCode: ''
    });

    // Form State for PO (Placeholder for now)
    const [poForm, setPoForm] = useState({
        poNumber: '',
        supplierId: '',
        date: new Date().toISOString().split('T')[0],
        status: 'Draft',
        items: []
    });

    const tabs = [
        { id: 'SUPPLIERS', label: 'Supplier Master', icon: Users, color: 'text-blue-600', bg: 'bg-blue-50' },
        { id: 'PURCHASE_ORDERS', label: 'Purchase Orders', icon: ShoppingCart, color: 'text-purple-600', bg: 'bg-purple-50' }
    ];

    const activeTabConfig = tabs.find(t => t.id === activeTab);

    // Filter Items
    const filteredItems = useMemo(() => {
        const data = masterData[activeTab] || [];
        if (!searchTerm) return data;
        const lowerTerm = searchTerm.toLowerCase();
        return data.filter(item =>
            Object.values(item).some(val =>
                String(val).toLowerCase().includes(lowerTerm)
            )
        );
    }, [masterData, activeTab, searchTerm]);

    // Pagination Logic
    const totalPages = Math.ceil(filteredItems.length / itemsPerPage);
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + itemsPerPage);

    // Reset pagination when tab or search changes
    React.useEffect(() => {
        setCurrentPage(1);
        setSelectedItems(new Set());
    }, [activeTab, searchTerm]);

    // Handlers
    const handleOpenModal = (item = null) => {
        setEditingItem(item);
        if (activeTab === 'SUPPLIERS') {
            setSupplierForm(item || {
                entityName: '',
                entityCode: '',
                gstin: '',
                panNo: '',
                msmeNo: '',
                address1: '',
                address2: '',
                city: '',
                district: '',
                state: '',
                country: '',
                pinCode: '',
                contactPerson: '',
                mobile: '',
                phone: '',
                email: '',
                url: '',
                bankName: '',
                branch: '',
                accountNo: '',
                ifscCode: ''
            });
        } else {
            // PO Logic later
            setPoForm(item || {
                poNumber: '',
                supplierId: '',
                date: new Date().toISOString().split('T')[0],
                status: 'Draft',
                items: []
            });
        }
        setIsModalOpen(true);
    };

    const handleSave = () => {
        if (activeTab === 'SUPPLIERS') {
            if (!supplierForm.entityName) {
                showAlert("Entity Name is required", "error");
                return;
            }
            if (editingItem) {
                updateMasterItem('SUPPLIERS', editingItem.id, supplierForm);
                showAlert("Supplier updated successfully");
            } else {
                addMasterItem('SUPPLIERS', supplierForm);
                showAlert("Supplier added successfully");
            }
        } else {
            // PO Save Logic
            if (!poForm.poNumber || !poForm.supplierId) {
                showAlert("PO Number and Supplier are required", "error");
                return;
            }
            if (editingItem) {
                updateMasterItem('PURCHASE_ORDERS', editingItem.id, poForm);
                showAlert("PO updated successfully");
            } else {
                addMasterItem('PURCHASE_ORDERS', poForm);
                showAlert("PO added successfully");
            }
        }
        setIsModalOpen(false);
    };

    const handleDelete = (id) => {
        showConfirm("Are you sure you want to delete this item?", () => {
            deleteMasterItem(activeTab, id);
            showAlert("Item deleted successfully");
        });
    };

    // Bulk Actions
    const handleSelectAll = (e) => {
        if (e.target.checked) {
            const newSelected = new Set(paginatedItems.map(item => item.id));
            setSelectedItems(newSelected);
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
            selectedItems.forEach(id => deleteMasterItem(activeTab, id));
            setSelectedItems(new Set());
            showAlert(`${selectedItems.size} items deleted successfully`);
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
                    showAlert("Excel file is empty", "error");
                    return;
                }

                let addedCount = 0;
                data.forEach(row => {
                    // Map columns based on Supplier Master .csv
                    if (activeTab === 'SUPPLIERS') {
                        const name = row['Entityname'] || row['Supplier Name'] || row['Name'];
                        if (name) {
                            addMasterItem('SUPPLIERS', {
                                entityName: name,
                                entityCode: row['Entitycode'] || row['Code'] || '',
                                gstin: row['GSTIN'] || '',
                                panNo: row['PAN No'] || '',
                                msmeNo: row['MSME No'] || '',
                                address1: row['Address1'] || '',
                                address2: row['Address2'] || '',
                                city: row['City'] || '',
                                district: row['District'] || '',
                                state: row['State'] || '',
                                country: row['Country'] || '',
                                pinCode: row['Pin Code'] || '',
                                contactPerson: row['Contact Person'] || '',
                                mobile: row['Mobile'] || '',
                                phone: row['Phone'] || '',
                                email: row['Email'] || '',
                                url: row['Url'] || '',
                                bankName: row['Bank Name'] || '',
                                branch: row['Branch'] || '',
                                accountNo: row['A/C No'] || '',
                                ifscCode: row['IFSC Code'] || ''
                            });
                            addedCount++;
                        }
                    }
                    // PO Upload logic could go here
                });

                showAlert(`Successfully imported ${addedCount} items`);
            } catch (error) {
                console.error("Upload Error:", error);
                showAlert("Failed to parse Excel file", "error");
            }
        };
        reader.readAsBinaryString(file);
        // Reset input
        e.target.value = null;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Supplier Management</h1>
                    <p className="text-sm text-slate-500">Manage Suppliers and Purchase Orders</p>
                </div>
                <div className="flex gap-2">
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
                        <Plus size={20} /> Add New {activeTab === 'SUPPLIERS' ? 'Supplier' : 'PO'}
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
                                {activeTab === 'SUPPLIERS' ? (
                                    <>
                                        <th className="px-6 py-4">Entity Name</th>
                                        <th className="px-6 py-4">Entity Code</th>
                                        <th className="px-6 py-4">GSTIN</th>
                                        <th className="px-6 py-4">City</th>
                                        <th className="px-6 py-4">Mobile</th>
                                    </>
                                ) : (
                                    <>
                                        <th className="px-6 py-4">PO Number</th>
                                        <th className="px-6 py-4">Supplier</th>
                                        <th className="px-6 py-4">Date</th>
                                        <th className="px-6 py-4">Status</th>
                                    </>
                                )}
                                <th className="px-6 py-4 text-right">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                            {filteredItems.length === 0 ? (
                                <tr>
                                    <td colSpan="7" className="px-6 py-12 text-center text-slate-400">
                                        <div className="flex flex-col items-center gap-2">
                                            <Users size={48} className="opacity-20" />
                                            <p>No items found.</p>
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
                                        {activeTab === 'SUPPLIERS' ? (
                                            <>
                                                <td className="px-6 py-4 font-bold text-slate-700">{item.entityName}</td>
                                                <td className="px-6 py-4 text-slate-600 font-mono text-xs">{item.entityCode || '-'}</td>
                                                <td className="px-6 py-4 text-slate-600 text-xs">{item.gstin || '-'}</td>
                                                <td className="px-6 py-4 text-slate-600">{item.city || '-'}</td>
                                                <td className="px-6 py-4 text-slate-600 font-mono text-xs">{item.mobile || '-'}</td>
                                            </>
                                        ) : (
                                            <>
                                                <td className="px-6 py-4 font-bold text-slate-700">{item.poNumber}</td>
                                                <td className="px-6 py-4 text-slate-600">
                                                    {masterData.SUPPLIERS?.find(s => s.id === item.supplierId)?.entityName || item.supplierId}
                                                </td>
                                                <td className="px-6 py-4 text-slate-600">{item.date}</td>
                                                <td className="px-6 py-4">
                                                    <span className={`px-2 py-1 rounded-md text-xs font-medium border ${item.status === 'Open' ? 'bg-green-50 text-green-700 border-green-200' :
                                                            item.status === 'Closed' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                                                                'bg-yellow-50 text-yellow-700 border-yellow-200'
                                                        }`}>
                                                        {item.status}
                                                    </span>
                                                </td>
                                            </>
                                        )}
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
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <h3 className="font-bold text-lg text-slate-800">
                                {editingItem ? `Edit ${activeTab === 'SUPPLIERS' ? 'Supplier' : 'PO'}` : `Add New ${activeTab === 'SUPPLIERS' ? 'Supplier' : 'PO'}`}
                            </h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            {activeTab === 'SUPPLIERS' ? (
                                <div className="space-y-6">
                                    {/* Basic Info */}
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-slate-800 border-b pb-2">Basic Information</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                label="Entity Name *"
                                                value={supplierForm.entityName}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, entityName: e.target.value })}
                                                placeholder="e.g. Avanti Feeds Ltd."
                                                required
                                            />
                                            <Input
                                                label="Entity Code"
                                                value={supplierForm.entityCode}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, entityCode: e.target.value })}
                                                placeholder="e.g. SUP-001"
                                            />
                                            <Input
                                                label="GSTIN"
                                                value={supplierForm.gstin}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, gstin: e.target.value })}
                                                placeholder="e.g. 37AAACA..."
                                            />
                                            <Input
                                                label="PAN No"
                                                value={supplierForm.panNo}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, panNo: e.target.value })}
                                                placeholder="e.g. ABCDE1234F"
                                            />
                                            <Input
                                                label="MSME No"
                                                value={supplierForm.msmeNo}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, msmeNo: e.target.value })}
                                                placeholder="e.g. UDYAM-..."
                                            />
                                        </div>
                                    </div>

                                    {/* Address */}
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-slate-800 border-b pb-2">Address Details</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="col-span-2">
                                                <Input
                                                    label="Address Line 1"
                                                    value={supplierForm.address1}
                                                    onChange={(e) => setSupplierForm({ ...supplierForm, address1: e.target.value })}
                                                    placeholder="Street / Building"
                                                />
                                            </div>
                                            <div className="col-span-2">
                                                <Input
                                                    label="Address Line 2"
                                                    value={supplierForm.address2}
                                                    onChange={(e) => setSupplierForm({ ...supplierForm, address2: e.target.value })}
                                                    placeholder="Area / Landmark"
                                                />
                                            </div>
                                            <Input
                                                label="City"
                                                value={supplierForm.city}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, city: e.target.value })}
                                                placeholder="City"
                                            />
                                            <Input
                                                label="District"
                                                value={supplierForm.district}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, district: e.target.value })}
                                                placeholder="District"
                                            />
                                            <Input
                                                label="State"
                                                value={supplierForm.state}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, state: e.target.value })}
                                                placeholder="State"
                                            />
                                            <Input
                                                label="Country"
                                                value={supplierForm.country}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, country: e.target.value })}
                                                placeholder="Country"
                                            />
                                            <Input
                                                label="Pin Code"
                                                value={supplierForm.pinCode}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, pinCode: e.target.value })}
                                                placeholder="Pin Code"
                                            />
                                        </div>
                                    </div>

                                    {/* Contact */}
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-slate-800 border-b pb-2">Contact Details</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                label="Contact Person"
                                                value={supplierForm.contactPerson}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, contactPerson: e.target.value })}
                                                placeholder="Name"
                                            />
                                            <Input
                                                label="Mobile"
                                                value={supplierForm.mobile}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, mobile: e.target.value })}
                                                placeholder="Mobile No"
                                            />
                                            <Input
                                                label="Phone"
                                                value={supplierForm.phone}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, phone: e.target.value })}
                                                placeholder="Phone No"
                                            />
                                            <Input
                                                label="Email"
                                                value={supplierForm.email}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, email: e.target.value })}
                                                placeholder="Email"
                                                type="email"
                                            />
                                            <div className="col-span-2">
                                                <Input
                                                    label="Website URL"
                                                    value={supplierForm.url}
                                                    onChange={(e) => setSupplierForm({ ...supplierForm, url: e.target.value })}
                                                    placeholder="https://..."
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Bank Details */}
                                    <div className="space-y-4">
                                        <h4 className="font-bold text-slate-800 border-b pb-2">Bank Details</h4>
                                        <div className="grid grid-cols-2 gap-4">
                                            <Input
                                                label="Bank Name"
                                                value={supplierForm.bankName}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, bankName: e.target.value })}
                                                placeholder="Bank Name"
                                            />
                                            <Input
                                                label="Branch"
                                                value={supplierForm.branch}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, branch: e.target.value })}
                                                placeholder="Branch"
                                            />
                                            <Input
                                                label="Account No"
                                                value={supplierForm.accountNo}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, accountNo: e.target.value })}
                                                placeholder="A/C No"
                                            />
                                            <Input
                                                label="IFSC Code"
                                                value={supplierForm.ifscCode}
                                                onChange={(e) => setSupplierForm({ ...supplierForm, ifscCode: e.target.value })}
                                                placeholder="IFSC"
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <div className="grid grid-cols-2 gap-4">
                                        <Input
                                            label="PO Number *"
                                            value={poForm.poNumber}
                                            onChange={(e) => setPoForm({ ...poForm, poNumber: e.target.value })}
                                            placeholder="e.g. PO-2024-001"
                                            required
                                        />
                                        <div>
                                            <label className="block text-sm font-bold text-slate-700 mb-1.5">Date</label>
                                            <input
                                                type="date"
                                                value={poForm.date}
                                                onChange={(e) => setPoForm({ ...poForm, date: e.target.value })}
                                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20"
                                            />
                                        </div>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Supplier *</label>
                                        <select
                                            value={poForm.supplierId}
                                            onChange={(e) => setPoForm({ ...poForm, supplierId: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20"
                                        >
                                            <option value="">Select Supplier...</option>
                                            {(masterData.SUPPLIERS || []).map(s => (
                                                <option key={s.id} value={s.id}>{s.entityName}</option>
                                            ))}
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-bold text-slate-700 mb-1.5">Status</label>
                                        <select
                                            value={poForm.status}
                                            onChange={(e) => setPoForm({ ...poForm, status: e.target.value })}
                                            className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl outline-none focus:ring-2 focus:ring-brand-500/20"
                                        >
                                            <option value="Draft">Draft</option>
                                            <option value="Open">Open</option>
                                            <option value="Closed">Closed</option>
                                        </select>
                                    </div>
                                    {/* PO Items Logic can be added here later */}
                                    <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-slate-500 text-sm">
                                        Item details section coming soon...
                                    </div>
                                </>
                            )}
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
                                Save {activeTab === 'SUPPLIERS' ? 'Supplier' : 'PO'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SupplierModule;
