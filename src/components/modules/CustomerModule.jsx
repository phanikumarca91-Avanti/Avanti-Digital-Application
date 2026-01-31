import React, { useState, useMemo } from 'react';
import { Plus, Search, Trash2, Edit2, FileText, Users, DollarSign, Calendar, MapPin, Upload, X } from 'lucide-react';
import Input from '../shared/Input';
import SearchableSelect from '../shared/SearchableSelect';
import StatusBadge from '../shared/StatusBadge';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useSales } from '../../contexts/SalesContext';
import * as XLSX from 'xlsx';
import { numberToWords } from '../../utils/numberToWords';

const CustomerModule = ({ addLog, showAlert, showConfirm }) => {
    const { masterData } = useMasterData();
    const [activeTab, setActiveTab] = useState('masters');
    const [searchTerm, setSearchTerm] = useState('');

    // Masters State
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [formData, setFormData] = useState({});

    // Sales Orders State
    const { orders: salesOrders, setOrders: setSalesOrders, addOrder, updateOrderStatus } = useSales();
    const [soSubTab, setSoSubTab] = useState('PENDING'); // 'PENDING' or 'HISTORY'
    const [soSearchTerm, setSoSearchTerm] = useState('');
    const [isCreatingSo, setIsCreatingSo] = useState(false);
    const [selectedSoIds, setSelectedSoIds] = useState([]);
    const [soFormData, setSoFormData] = useState({
        soNo: '',
        soDate: new Date().toISOString().split('T')[0],
        paymentMode: 'Credit',
        deliveryLocation: '',
        mobileNo: '',
        customerId: '',
        customerName: '',
        tradeDiscountPercent: 10,
        cashDiscountPercent: 0
    });
    const [soItems, setSoItems] = useState([
        { id: 1, material: '', hsn: '23099031', bags: 0, bagWeight: 25, totalQty: 0, rate: 0, amount: 0 }
    ]);

    // Delivery Locations State
    const [deliveryLocations, setDeliveryLocations] = useState([]);
    const [dlSearchTerm, setDlSearchTerm] = useState('');
    const [dlIsEditing, setDlIsEditing] = useState(false);
    const [dlFormData, setDlFormData] = useState({});
    const [selectedDlIds, setSelectedDlIds] = useState([]);

    // Load initial data
    React.useEffect(() => {
        import('../../data/deliveryLocationData').then(module => {
            // Map CSV fields to internal fields if needed, or use as is
            // CSV has "Regeion" and "Delivery points"
            const mapped = (module.DELIVERY_LOCATIONS || []).map((item, index) => ({
                id: `DL-${index + 1}`,
                region: item.Regeion,
                deliveryPoint: item['Delivery points']
            }));
            setDeliveryLocations(mapped);
        }).catch(err => console.error("Failed to load delivery locations", err));
    }, []);

    const customers = masterData.CUSTOMERS || [];

    const filteredCustomers = useMemo(() => {
        if (!searchTerm) return customers;
        const lower = searchTerm.toLowerCase();
        return customers.filter(c =>
            (c.entityName && c.entityName.toLowerCase().includes(lower)) ||
            (c.entityCode && c.entityCode.toLowerCase().includes(lower)) ||
            (c.city && c.city.toLowerCase().includes(lower))
        );
    }, [customers, searchTerm]);

    const filteredLocations = useMemo(() => {
        if (!dlSearchTerm) return deliveryLocations;
        const lower = dlSearchTerm.toLowerCase();
        return deliveryLocations.filter(l =>
            (l.region && l.region.toLowerCase().includes(lower)) ||
            (l.deliveryPoint && l.deliveryPoint.toLowerCase().includes(lower))
        );
    }, [deliveryLocations, dlSearchTerm]);

    const filteredSalesOrders = useMemo(() => {
        let filtered = salesOrders;

        // 1. Filter by SubTab
        if (soSubTab === 'PENDING') {
            filtered = filtered.filter(so => ['Draft', 'PENDING', 'CONFIRMED'].includes(so.status));
        } else {
            filtered = filtered.filter(so => ['DISPATCHED', 'COMPLETED', 'CANCELLED'].includes(so.status));
        }

        // 2. Filter by Search
        if (soSearchTerm) {
            const lower = soSearchTerm.toLowerCase();
            filtered = filtered.filter(so =>
                so.soNo.toLowerCase().includes(lower) ||
                so.customerName.toLowerCase().includes(lower)
            );
        }
        return filtered;
    }, [salesOrders, soSearchTerm, soSubTab]);

    // Calculations
    const calculateSoTotals = () => {
        const subTotal = soItems.reduce((sum, item) => sum + (item.amount || 0), 0);
        const tradeDiscountAmount = (subTotal * (soFormData.tradeDiscountPercent || 0)) / 100;
        const taxableAmount = subTotal - tradeDiscountAmount;
        const cashDiscountAmount = (taxableAmount * (soFormData.cashDiscountPercent || 0)) / 100;
        const netAmount = taxableAmount - cashDiscountAmount;
        return { subTotal, tradeDiscountAmount, cashDiscountAmount, netAmount };
    };

    const { subTotal, tradeDiscountAmount, cashDiscountAmount, netAmount } = calculateSoTotals();

    const handleSoItemChange = (id, field, value) => {
        setSoItems(prev => prev.map(item => {
            if (item.id !== id) return item;
            const updates = { ...item, [field]: value };

            // Auto-calc
            if (field === 'bags' || field === 'bagWeight') {
                const bags = field === 'bags' ? parseFloat(value) || 0 : item.bags;
                const weight = field === 'bagWeight' ? parseFloat(value) || 0 : item.bagWeight;
                updates.totalQty = (bags * weight) / 1000; // MT
                updates.amount = updates.totalQty * (item.rate || 0);
            }
            if (field === 'rate') {
                const rate = parseFloat(value) || 0;
                updates.amount = (item.totalQty || 0) * rate;
            }

            return updates;
        }));
    };

    const handleAddSoItem = () => {
        setSoItems(prev => [...prev, {
            id: Date.now(),
            material: '',
            hsn: '23099031',
            bags: 0,
            bagWeight: 25,
            totalQty: 0,
            rate: 0,
            amount: 0
        }]);
    };

    const handleRemoveSoItem = (id) => {
        if (soItems.length > 1) {
            setSoItems(prev => prev.filter(item => item.id !== id));
        }
    };
    const handleSaveSo = async () => {
        if (!soFormData.customerId || !soFormData.deliveryLocation) {
            showAlert("Please select Customer and Delivery Location.");
            return;
        }

        const currentData = {
            ...soFormData,
            soNo: soFormData.soNo || `SO-${Date.now().toString().slice(-6)}`,
            items: soItems,
            totals: { subTotal, tradeDiscountAmount, cashDiscountAmount, netAmount },
            status: 'PENDING', // Default status for new orders to show in Pending tab
            date: new Date().toISOString().split('T')[0], // Ensure date field exists for SalesModule
            customer: soFormData.customerName, // Ensure customer field exists for SalesModule
            product: soItems.map(i => i.material).join(', '), // Ensure product field exists
            qty: soItems.reduce((sum, i) => sum + (i.totalQty || 0), 0).toFixed(3), // Ensure qty field exists
            region: soFormData.deliveryLocation // Map location to region for now or fetch actual region if available
        };

        try {
            if (soFormData.id) {
                // Update Existing (id is UUID)
                await updateOrderStatus(soFormData.id, currentData.status, currentData);
                showAlert("Sales Order updated successfully.");
            } else {
                // Create New - DB requires explicit ID (TEXT PK)
                const newId = crypto.randomUUID();
                await addOrder({ ...currentData, id: newId });
                showAlert("Sales Order saved successfully.");
            }

            setIsCreatingSo(false);
            // Reset form data after save
            setSoFormData({
                soNo: '',
                soDate: new Date().toISOString().split('T')[0],
                paymentMode: 'Credit',
                deliveryLocation: '',
                mobileNo: '',
                customerId: '',
                customerName: '',
                tradeDiscountPercent: 10,
                cashDiscountPercent: 0
            });
            setSoItems([{ id: 1, material: '', hsn: '23099031', bags: 0, bagWeight: 25, totalQty: 0, rate: 0, amount: 0 }]);

        } catch (error) {
            console.error('Save failed:', error);
            showAlert("Failed to save order. " + (error.message || 'Unknown error'));
        }
    };

    const handleEditSo = (so) => {
        setSoFormData({
            id: so.id,
            soNo: so.soNo,
            soDate: so.soDate,
            paymentMode: so.paymentMode,
            deliveryLocation: so.deliveryLocation,
            mobileNo: so.mobileNo,
            customerId: so.customerId,
            customerName: so.customerName,
            tradeDiscountPercent: so.tradeDiscountPercent || 0,
            cashDiscountPercent: so.cashDiscountPercent || 0
        });
        setSoItems(so.items);
        setIsCreatingSo(true);
    };

    const handleDeleteSo = (id) => {
        showConfirm("Are you sure you want to delete this Sales Order?", () => {
            setSalesOrders(prev => prev.filter(so => so.id !== id));
            showAlert("Sales Order deleted.");
        });
    };

    const handleBulkDeleteSo = () => {
        showConfirm(`Delete ${selectedSoIds.length} Sales Orders?`, () => {
            setSalesOrders(prev => prev.filter(so => !selectedSoIds.includes(so.id)));
            setSelectedSoIds([]);
            showAlert("Selected Sales Orders deleted.");
        });
    };

    const handleDownloadTemplate = () => {
        const templateData = [
            {
                "Customer Name": "Example Customer",
                "SO Date": "2023-10-27",
                "Payment Mode": "Credit",
                "Delivery Location": "Example Location",
                "Mobile No": "9876543210",
                "Item Name": "Example Item",
                "HSN": "1234",
                "Bags": 10,
                "Bag Weight": 25,
                "Rate": 1000,
                "Trade Discount %": 0,
                "Cash Discount %": 0
            }
        ];
        const ws = XLSX.utils.json_to_sheet(templateData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Template");
        XLSX.writeFile(wb, "SalesOrder_Template.xlsx");
    };

    const handleBulkUploadSo = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const data = new Uint8Array(event.target.result);
                const workbook = XLSX.read(data, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);

                const newOrders = jsonData.map((row, index) => {
                    const bags = parseFloat(row["Bags"]) || 0;
                    const bagWeight = parseFloat(row["Bag Weight"]) || 0;
                    const totalQty = (bags * bagWeight) / 1000;
                    const rate = parseFloat(row["Rate"]) || 0;
                    const amount = totalQty * rate;

                    // Calculate totals logic (simplified for import)
                    const tradeDisc = parseFloat(row["Trade Discount %"]) || 0;
                    const cashDisc = parseFloat(row["Cash Discount %"]) || 0;
                    const tradeDiscAmount = (amount * tradeDisc) / 100;
                    const taxable = amount - tradeDiscAmount;
                    const cashDiscAmount = (taxable * cashDisc) / 100;
                    const netAmount = taxable - cashDiscAmount;

                    return {
                        id: `SO-BULK-${Date.now()}-${index}`,
                        soNo: `SO-${Date.now()}-${index}`,
                        soDate: row["SO Date"] || new Date().toISOString().split('T')[0],
                        paymentMode: row["Payment Mode"] || 'Credit',
                        deliveryLocation: row["Delivery Location"] || '',
                        mobileNo: row["Mobile No"] || '',
                        customerId: 'BULK-CUST', // Placeholder
                        customerName: row["Customer Name"] || 'Unknown',
                        tradeDiscountPercent: tradeDisc,
                        cashDiscountPercent: cashDisc,
                        items: [{
                            id: 1,
                            material: row["Item Name"] || '',
                            hsn: row["HSN"] || '',
                            bags: bags,
                            bagWeight: bagWeight,
                            totalQty: totalQty,
                            rate: rate,
                            amount: amount
                        }],
                        totals: {
                            subTotal: amount,
                            tradeDiscountAmount: tradeDiscAmount,
                            cashDiscountAmount: cashDiscAmount,
                            netAmount: netAmount
                        },
                        status: 'PENDING'
                    };
                });

                setSalesOrders(prev => [...newOrders, ...prev]);
                showAlert(`${newOrders.length} Sales Orders imported successfully.`);
            } catch (error) {
                console.error("Upload Error:", error);
                showAlert("Failed to parse Excel file.");
            }
        };
        reader.readAsArrayBuffer(file);
    };

    const handleSaveCustomer = () => {
        if (!formData.entityName) {
            showAlert("Customer Name is required.");
            return;
        }
        if (isEditing) {
            setCustomers(prev => prev.map(c => c.id === editId ? { ...formData, id: editId } : c));
            showAlert("Customer updated.");
        } else {
            const newCustomer = {
                ...formData,
                id: `CUST-${Date.now()}`
            };
            setCustomers(prev => [newCustomer, ...prev]);
            showAlert("Customer added.");
        }
        setIsEditing(false);
        setFormData({});
        setEditId(null);
    };

    const handleEditCustomer = (customer) => {
        setFormData(customer);
        setIsEditing(true);
        setEditId(customer.id);
    };

    const handleDeleteCustomer = (id) => {
        showConfirm("Are you sure you want to delete this customer?", () => {
            showAlert("Customer deleted (In-memory only).");
        });
    };

    // DL Actions
    const handleSaveDl = () => {
        if (dlIsEditing) {
            setDeliveryLocations(prev => prev.map(l => l.id === dlFormData.id ? dlFormData : l));
            showAlert("Delivery Location updated.");
        } else {
            const newId = `DL-${Date.now()}`;
            setDeliveryLocations(prev => [{ ...dlFormData, id: newId }, ...prev]);
            showAlert("Delivery Location added.");
        }
        setDlIsEditing(false);
        setDlFormData({});
    };

    const handleDeleteDl = (id) => {
        showConfirm("Delete this location?", () => {
            setDeliveryLocations(prev => prev.filter(l => l.id !== id));
            showAlert("Location deleted.");
        });
    };

    const handleBulkDeleteDl = () => {
        showConfirm(`Delete ${selectedDlIds.length} locations?`, () => {
            setDeliveryLocations(prev => prev.filter(l => !selectedDlIds.includes(l.id)));
            setSelectedDlIds([]);
            showAlert("Selected locations deleted.");
        });
    };

    const handleBulkUploadDl = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split('\n');
            const newLocations = [];
            // Simple CSV parse (assuming Header: Regeion,Delivery points)
            for (let i = 1; i < lines.length; i++) {
                const line = lines[i].trim();
                if (!line) continue;
                // Handle quotes if present, simple split for now
                const parts = line.split(',');
                // A more robust parser would be needed for production
                if (parts.length >= 2) {
                    newLocations.push({
                        id: `DL-BULK-${Date.now()}-${i}`,
                        region: parts[0].trim(),
                        deliveryPoint: parts.slice(1).join(',').trim().replace(/^"|"$/g, '') // Handle potential quotes
                    });
                }
            }
            setDeliveryLocations(prev => [...newLocations, ...prev]);
            showAlert(`${newLocations.length} locations imported.`);
        };
        reader.readAsText(file);
    };

    return (
        <div className="space-y-6">
            {/* Module Tabs */}
            <div className="flex space-x-4 border-b border-slate-200 pb-1">
                <button
                    onClick={() => setActiveTab('masters')}
                    className={`pb-2 px-4 font-bold text-sm transition-colors ${activeTab === 'masters' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <Users size={16} /> Customer Masters
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('delivery_locations')}
                    className={`pb-2 px-4 font-bold text-sm transition-colors ${activeTab === 'delivery_locations' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <MapPin size={16} /> Delivery Locations
                    </div>
                </button>
                <button
                    onClick={() => setActiveTab('sales_orders')}
                    className={`pb-2 px-4 font-bold text-sm transition-colors ${activeTab === 'sales_orders' ? 'border-b-2 border-brand-600 text-brand-600' : 'text-slate-500 hover:text-slate-700'}`}
                >
                    <div className="flex items-center gap-2">
                        <FileText size={16} /> Sales Orders
                    </div>
                </button>
            </div>

            {activeTab === 'masters' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <div className="p-2 bg-brand-50 rounded-lg text-brand-600">
                                    <Plus size={20} />
                                </div>
                                {isEditing ? 'Edit Customer' : 'New Customer'}
                            </h2>
                            <div className="space-y-4">
                                <Input label="Customer Name *" name="entityName" value={formData.entityName || ''} onChange={(e) => setFormData({ ...formData, entityName: e.target.value })} placeholder="Enter Name" />
                                <Input label="Customer Code" name="entityCode" value={formData.entityCode || ''} onChange={(e) => setFormData({ ...formData, entityCode: e.target.value })} placeholder="Enter Code" />
                                <Input label="City" name="city" value={formData.city || ''} onChange={(e) => setFormData({ ...formData, city: e.target.value })} placeholder="City" />
                                <Input label="State" name="state" value={formData.state || ''} onChange={(e) => setFormData({ ...formData, state: e.target.value })} placeholder="State" />

                                <div className="grid grid-cols-2 gap-4">
                                    <Input label="Credit Limit (₹)" type="number" name="creditLimit" value={formData.creditLimit || ''} onChange={(e) => setFormData({ ...formData, creditLimit: e.target.value })} placeholder="0.00" />
                                    <Input label="Credit Days" type="number" name="creditDays" value={formData.creditDays || ''} onChange={(e) => setFormData({ ...formData, creditDays: e.target.value })} placeholder="0" />
                                </div>

                                <div className="pt-4 flex gap-3">
                                    {isEditing && (
                                        <button onClick={() => { setIsEditing(false); setFormData({}); }} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
                                    )}
                                    <button onClick={handleSaveCustomer} className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl font-semibold shadow-lg shadow-brand-500/25 hover:bg-brand-700">
                                        {isEditing ? 'Update' : 'Add Customer'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-card border border-slate-100 flex flex-col h-[600px]">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800">Customer List ({filteredCustomers.length})</h3>
                                <div className="relative w-64">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search customers..."
                                        value={searchTerm}
                                        onChange={(e) => setSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Name / Code</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Location</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Credit Limit</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Days</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredCustomers.slice(0, 100).map(customer => (
                                            <tr key={customer.id} className="hover:bg-slate-50 group">
                                                <td className="p-4">
                                                    <div className="font-bold text-slate-800">{customer.entityName}</div>
                                                    <div className="text-xs text-slate-400 font-mono">{customer.entityCode}</div>
                                                </td>
                                                <td className="p-4 text-sm text-slate-600">
                                                    {customer.city}, {customer.state}
                                                </td>
                                                <td className="p-4 text-sm text-slate-800 text-right font-mono">
                                                    {customer.creditLimit ? `₹${customer.creditLimit.toLocaleString()}` : '-'}
                                                </td>
                                                <td className="p-4 text-sm text-slate-800 text-right font-mono">
                                                    {customer.creditDays || '-'}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEditCustomer(customer)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"><Edit2 size={14} /></button>
                                                        <button onClick={() => handleDeleteCustomer(customer.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredCustomers.length > 100 && (
                                    <div className="p-4 text-center text-xs text-slate-400">
                                        Showing first 100 of {filteredCustomers.length} customers. Use search to find specific entries.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'delivery_locations' && (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Form */}
                    <div className="lg:col-span-1 space-y-6">
                        <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
                            <h2 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-2">
                                <div className="p-2 bg-brand-50 rounded-lg text-brand-600">
                                    <MapPin size={20} />
                                </div>
                                {dlIsEditing ? 'Edit Location' : 'New Location'}
                            </h2>
                            <div className="space-y-4">
                                <SearchableSelect
                                    label="Region *"
                                    options={[
                                        "ALL",
                                        "WEST COAST", "NELLORE", "WEST BENGAL", "ORISSA", "GUNTUR", "AMALAPURAM",
                                        "EAST-II", "WEST - 1", "HYDERABAD", "EAST-I", "ONGOLE", "EAST - I",
                                        "WEST- 1", "KRISHNA", "TAMILNADU", "WEST - II", "TAMIL NADU", "WEST- II",
                                        "KAKINADA", "WEST GODAVARI - 2", "WEST GODAVARI - 1", "KRISHNA AND GUNTUR",
                                        "BALASORE", "WEST ZONE", "MALKIPURAM",
                                        "VISAKHA / SRIKAKULAM", "EAST - III"
                                    ].filter(r => r !== "ALL")}
                                    value={dlFormData.region}
                                    onChange={(val) => setDlFormData({ ...dlFormData, region: val.value || val.target.value })}
                                    placeholder="Select Region"
                                />
                                <Input label="Delivery Point *" name="deliveryPoint" value={dlFormData.deliveryPoint || ''} onChange={(e) => setDlFormData({ ...dlFormData, deliveryPoint: e.target.value })} placeholder="Enter Delivery Point" />

                                <div className="pt-4 flex gap-3">
                                    {dlIsEditing && (
                                        <button onClick={() => { setDlIsEditing(false); setDlFormData({}); }} className="flex-1 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-semibold hover:bg-slate-50">Cancel</button>
                                    )}
                                    <button onClick={handleSaveDl} className="flex-1 py-2.5 bg-brand-600 text-white rounded-xl font-semibold shadow-lg shadow-brand-500/25 hover:bg-brand-700">
                                        {dlIsEditing ? 'Update' : 'Add Location'}
                                    </button>
                                </div>
                            </div>

                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <h3 className="text-sm font-bold text-slate-700 mb-3">Bulk Actions</h3>
                                <div className="space-y-3">
                                    <label className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-slate-300 rounded-xl text-slate-500 font-medium hover:border-brand-400 hover:text-brand-600 hover:bg-brand-50 cursor-pointer transition-all">
                                        <Upload size={18} /> Upload CSV
                                        <input type="file" accept=".csv" className="hidden" onChange={handleBulkUploadDl} />
                                    </label>
                                    {selectedDlIds.length > 0 && (
                                        <button onClick={handleBulkDeleteDl} className="flex items-center justify-center gap-2 w-full py-2.5 bg-red-50 text-red-600 rounded-xl font-medium hover:bg-red-100 transition-all">
                                            <Trash2 size={18} /> Delete Selected ({selectedDlIds.length})
                                        </button>
                                    )}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* List */}
                    <div className="lg:col-span-2 space-y-6">
                        <div className="bg-white rounded-2xl shadow-card border border-slate-100 flex flex-col h-[600px]">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center">
                                <h3 className="font-bold text-slate-800">Locations List ({filteredLocations.length})</h3>
                                <div className="relative w-64">
                                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                    <input
                                        type="text"
                                        placeholder="Search locations..."
                                        value={dlSearchTerm}
                                        onChange={(e) => setDlSearchTerm(e.target.value)}
                                        className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                    />
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-4 w-10">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                    checked={selectedDlIds.length === filteredLocations.length && filteredLocations.length > 0}
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedDlIds(filteredLocations.map(l => l.id));
                                                        } else {
                                                            setSelectedDlIds([]);
                                                        }
                                                    }}
                                                />
                                            </th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Region</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Delivery Point</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredLocations.slice(0, 100).map(loc => (
                                            <tr key={loc.id} className="hover:bg-slate-50 group">
                                                <td className="p-4">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                        checked={selectedDlIds.includes(loc.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedDlIds(prev => [...prev, loc.id]);
                                                            } else {
                                                                setSelectedDlIds(prev => prev.filter(id => id !== loc.id));
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-4 text-sm font-medium text-slate-700">
                                                    {loc.region}
                                                </td>
                                                <td className="p-4 text-sm text-slate-600">
                                                    {loc.deliveryPoint}
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => { setDlFormData(loc); setDlIsEditing(true); }} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"><Edit2 size={14} /></button>
                                                        <button onClick={() => handleDeleteDl(loc.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                {filteredLocations.length > 100 && (
                                    <div className="p-4 text-center text-xs text-slate-400">
                                        Showing first 100 of {filteredLocations.length} locations. Use search to find specific entries.
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {activeTab === 'sales_orders' && (
                <div className="space-y-6">
                    {!isCreatingSo ? (
                        <div className="bg-white rounded-2xl shadow-card border border-slate-100 flex flex-col h-[600px]">
                            <div className="p-4 border-b border-slate-100 flex justify-between items-center gap-4 flex-wrap">
                                <div className="flex items-center gap-4">
                                    <h3 className="font-bold text-slate-800">Sales Orders ({filteredSalesOrders.length})</h3>
                                    {selectedSoIds.length > 0 && (
                                        <button onClick={handleBulkDeleteSo} className="flex items-center gap-2 px-3 py-1.5 bg-red-50 text-red-600 rounded-lg text-sm font-bold hover:bg-red-100 transition-colors">
                                            <Trash2 size={16} /> Delete ({selectedSoIds.length})
                                        </button>
                                    )}
                                </div>
                                <div className="flex gap-3 items-center">
                                    <button onClick={handleDownloadTemplate} className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50">
                                        <FileText size={16} /> Template
                                    </button>
                                    <label className="flex items-center gap-2 px-3 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-bold hover:bg-slate-50 cursor-pointer">
                                        <Upload size={16} /> Upload
                                        <input type="file" accept=".xlsx, .xls" className="hidden" onChange={handleBulkUploadSo} />
                                    </label>
                                    <div className="relative w-64">
                                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                                        <input type="text" placeholder="Search SO No, Customer..." value={soSearchTerm} onChange={(e) => setSoSearchTerm(e.target.value)} className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20" />
                                    </div>
                                    <button onClick={() => { setIsCreatingSo(true); setSoFormData({ soNo: '', soDate: new Date().toISOString().split('T')[0], paymentMode: 'Credit', deliveryLocation: '', mobileNo: '', customerId: '', customerName: '', tradeDiscountPercent: 10, cashDiscountPercent: 0 }); setSoItems([{ id: 1, material: '', hsn: '23099031', bags: 0, bagWeight: 25, totalQty: 0, rate: 0, amount: 0 }]); }} className="flex items-center gap-2 px-4 py-2 bg-brand-600 text-white rounded-lg font-bold shadow-lg shadow-brand-500/25 hover:bg-brand-700">
                                        <Plus size={18} /> New Order
                                    </button>
                                </div>
                            </div>
                            <div className="flex-1 overflow-auto">
                                {/* Sub Tabs for Sales Orders */}
                                <div className="px-4 pt-2 flex gap-2 border-b border-slate-100 mb-2">
                                    <button
                                        onClick={() => setSoSubTab('PENDING')}
                                        className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${soSubTab === 'PENDING' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}
                                    >
                                        Pending Orders
                                    </button>
                                    <button
                                        onClick={() => setSoSubTab('HISTORY')}
                                        className={`px-4 py-2 text-sm font-bold border-b-2 transition-colors ${soSubTab === 'HISTORY' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500'}`}
                                    >
                                        Order History
                                    </button>
                                </div>
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-50 sticky top-0 z-10">
                                        <tr>
                                            <th className="p-4 w-10">
                                                <input
                                                    type="checkbox"
                                                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                    onChange={(e) => {
                                                        if (e.target.checked) {
                                                            setSelectedSoIds(filteredSalesOrders.map(so => so.id));
                                                        } else {
                                                            setSelectedSoIds([]);
                                                        }
                                                    }}
                                                    checked={selectedSoIds.length === filteredSalesOrders.length && filteredSalesOrders.length > 0}
                                                />
                                            </th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">SO No & Date</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Customer</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase">Location</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Net Amount</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Status</th>
                                            <th className="p-4 text-xs font-bold text-slate-500 uppercase text-center">Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {filteredSalesOrders.map(so => (
                                            <tr key={so.id} className="hover:bg-slate-50 group">
                                                <td className="p-4">
                                                    <input
                                                        type="checkbox"
                                                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                        checked={selectedSoIds.includes(so.id)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedSoIds(prev => [...prev, so.id]);
                                                            } else {
                                                                setSelectedSoIds(prev => prev.filter(id => id !== so.id));
                                                            }
                                                        }}
                                                    />
                                                </td>
                                                <td className="p-4">
                                                    <div className="font-bold text-slate-800">{so.soNo || so.id}</div>
                                                    <div className="text-xs text-slate-400 font-mono">{so.soDate || so.date}</div>
                                                </td>
                                                <td className="p-4 text-sm text-slate-600">{so.customerName || so.customer}</td>
                                                <td className="p-4 text-sm text-slate-600">{so.deliveryLocation || so.region}</td>
                                                <td className="p-4 text-sm text-slate-800 text-right font-mono">₹{(so.totals?.netAmount || 0).toLocaleString(undefined, { minimumFractionDigits: 2 })}</td>
                                                <td className="p-4 text-center">
                                                    <StatusBadge status={so.status} />
                                                </td>
                                                <td className="p-4 text-center">
                                                    <div className="flex justify-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                        <button onClick={() => handleEditSo(so)} className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg"><Edit2 size={14} /></button>
                                                        <button onClick={() => handleDeleteSo(so.id)} className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"><Trash2 size={14} /></button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {filteredSalesOrders.length === 0 && (
                                            <tr>
                                                <td colSpan="7" className="p-8 text-center text-slate-400">No sales orders found.</td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 space-y-8">
                            <div className="flex justify-between items-center border-b border-slate-100 pb-6">
                                <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                    <div className="p-2 bg-brand-50 rounded-lg text-brand-600">
                                        {soFormData.id ? <Edit2 size={20} /> : <Plus size={20} />}
                                    </div>
                                    {soFormData.id ? 'Edit Sales Order' : 'New Sales Order'}
                                </h2>
                                <button onClick={() => setIsCreatingSo(false)} className="text-slate-400 hover:text-slate-600">
                                    <X size={24} />
                                </button>
                            </div>

                            {/* Header Details */}
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                <SearchableSelect
                                    label="Customer *"
                                    placeholder="Select Customer"
                                    options={customers.map(c => ({ value: c.id, label: `${c.entityName} (${c.entityCode})` }))}
                                    value={soFormData.customerName || ''}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        const cust = customers.find(c => c.id === val);
                                        setSoFormData(prev => ({
                                            ...prev,
                                            customerId: val,
                                            customerName: cust ? cust.entityName : ''
                                        }));
                                    }}
                                />
                                <Input label="SO Number" value={soFormData.soNo} onChange={(e) => setSoFormData({ ...soFormData, soNo: e.target.value })} placeholder="Auto-generated" />
                                <Input label="SO Date" type="date" value={soFormData.soDate} onChange={(e) => setSoFormData({ ...soFormData, soDate: e.target.value })} />

                                <div className="space-y-1.5">
                                    <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider">Payment Mode</label>
                                    <select
                                        className="w-full px-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/20"
                                        value={soFormData.paymentMode}
                                        onChange={(e) => {
                                            const mode = e.target.value;
                                            setSoFormData(prev => ({
                                                ...prev,
                                                paymentMode: mode,
                                                cashDiscountPercent: mode === 'Cash' ? 5 : 0
                                            }));
                                        }}
                                    >
                                        <option>Credit</option>
                                        <option>Cash</option>
                                    </select>
                                </div>

                                <SearchableSelect
                                    label="Delivery Location *"
                                    placeholder="Select Location"
                                    options={deliveryLocations.map(l => ({ value: l.deliveryPoint, label: `${l.deliveryPoint} (${l.region})` }))}
                                    value={soFormData.deliveryLocation}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        setSoFormData(prev => ({ ...prev, deliveryLocation: val }));
                                    }}
                                />
                                <Input label="Mobile No" value={soFormData.mobileNo} onChange={(e) => setSoFormData({ ...soFormData, mobileNo: e.target.value })} placeholder="Enter Mobile No" />
                            </div>

                            {/* Line Items */}
                            <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                                <table className="w-full text-left border-collapse">
                                    <thead className="bg-slate-100 border-b border-slate-200">
                                        <tr>
                                            <th className="p-3 text-xs font-bold text-slate-500 uppercase w-1/3">Description of Goods</th>
                                            <th className="p-3 text-xs font-bold text-slate-500 uppercase w-24 text-center">HSN/SAC</th>
                                            <th className="p-3 text-xs font-bold text-slate-500 uppercase w-20 text-right">Bags</th>
                                            <th className="p-3 text-xs font-bold text-slate-500 uppercase w-24 text-right">Bag Wt</th>
                                            <th className="p-3 text-xs font-bold text-slate-500 uppercase w-24 text-right">Total Qty (MT)</th>
                                            <th className="p-3 text-xs font-bold text-slate-500 uppercase w-24 text-right">Rate/MT</th>
                                            <th className="p-3 text-xs font-bold text-slate-500 uppercase w-32 text-right">Amount</th>
                                            <th className="p-3 w-10"></th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-100">
                                        {soItems.map((item, index) => (
                                            <tr key={item.id}>
                                                <td className="p-2">
                                                    <SearchableSelect
                                                        placeholder="Select Item"
                                                        options={masterData.FINISHED_GOODS || []}
                                                        value={item.material}
                                                        onChange={(e) => handleSoItemChange(item.id, 'material', e.value || e.target.value)}
                                                    />
                                                </td>
                                                <td className="p-2"><input type="text" className="w-full p-2 bg-slate-50 rounded border border-transparent hover:border-slate-200 focus:border-brand-500 outline-none text-center" value={item.hsn} onChange={(e) => handleSoItemChange(item.id, 'hsn', e.target.value)} /></td>
                                                <td className="p-2"><input type="number" className="w-full p-2 bg-slate-50 rounded border border-transparent hover:border-slate-200 focus:border-brand-500 outline-none text-right" value={item.bags} onChange={(e) => handleSoItemChange(item.id, 'bags', e.target.value)} /></td>
                                                <td className="p-2"><input type="number" className="w-full p-2 bg-slate-50 rounded border border-transparent hover:border-slate-200 focus:border-brand-500 outline-none text-right" value={item.bagWeight} onChange={(e) => handleSoItemChange(item.id, 'bagWeight', e.target.value)} /></td>
                                                <td className="p-2 text-right font-mono text-slate-600">{item.totalQty.toFixed(3)}</td>
                                                <td className="p-2"><input type="number" className="w-full p-2 bg-slate-50 rounded border border-transparent hover:border-slate-200 focus:border-brand-500 outline-none text-right" value={item.rate} onChange={(e) => handleSoItemChange(item.id, 'rate', e.target.value)} /></td>
                                                <td className="p-2 text-right font-mono font-bold text-slate-800">{item.amount.toFixed(2)}</td>
                                                <td className="p-2 text-center"><button onClick={() => handleRemoveSoItem(item.id)} className="text-slate-400 hover:text-red-500"><Trash2 size={16} /></button></td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <div className="p-2 bg-slate-50 border-t border-slate-200">
                                    <button onClick={handleAddSoItem} className="flex items-center gap-2 text-sm font-bold text-brand-600 hover:text-brand-700 px-2 py-1">
                                        <Plus size={16} /> Add Item
                                    </button>
                                </div>
                            </div>

                            {/* Footer / Totals */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div>
                                    <label className="block text-sm font-bold text-slate-500 mb-2">Amount in Words</label>
                                    <div className="p-4 bg-slate-50 rounded-xl text-slate-700 italic border border-slate-200 min-h-[60px]">
                                        {numberToWords(Math.round(netAmount))} Rupees Only
                                    </div>
                                </div>
                                <div className="space-y-3">
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500">Basic Total</span>
                                        <span className="font-mono font-bold text-slate-800">₹{subTotal.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 flex items-center gap-2">
                                            Less: Trade Discount @
                                            <input type="number" className="w-12 p-1 border rounded text-center bg-slate-100 cursor-not-allowed" readOnly value={soFormData.tradeDiscountPercent} /> %
                                        </span>
                                        <span className="font-mono text-red-600">- ₹{tradeDiscountAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="flex justify-between items-center text-sm">
                                        <span className="text-slate-500 flex items-center gap-2">
                                            Less: Cash Discount @
                                            <input type="number" className="w-12 p-1 border rounded text-center bg-slate-100 cursor-not-allowed" readOnly value={soFormData.cashDiscountPercent} /> %
                                        </span>
                                        <span className="font-mono text-red-600">- ₹{cashDiscountAmount.toFixed(2)}</span>
                                    </div>
                                    <div className="pt-3 border-t border-slate-200 flex justify-between items-center text-lg font-bold">
                                        <span className="text-slate-800">Net Amount</span>
                                        <span className="font-mono text-brand-600">₹{netAmount.toLocaleString(undefined, { minimumFractionDigits: 2 })}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="flex justify-end gap-4 pt-4 border-t border-slate-100">
                                <button onClick={() => setIsCreatingSo(false)} className="px-6 py-2.5 border border-slate-200 text-slate-600 rounded-xl font-bold hover:bg-slate-50">Cancel</button>
                                <button onClick={handleSaveSo} className="px-6 py-2.5 bg-brand-600 text-white rounded-xl font-bold shadow-lg shadow-brand-500/25 hover:bg-brand-700">
                                    {soFormData.id ? 'Update Order' : 'Save Order'}
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default CustomerModule;
