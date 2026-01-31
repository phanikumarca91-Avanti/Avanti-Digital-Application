import React, { useState, useMemo, useRef } from 'react';
import { Search, Plus, Filter, Calendar, Camera, Clock, CheckCircle, XCircle, FileText, Truck, MapPin, AlertTriangle, ChevronRight, MoreHorizontal, User, Save, Upload, History, Edit2, Trash2, LogIn, LogOut, HelpCircle, RotateCcw, Eye } from 'lucide-react';
import StatusBadge from '../shared/StatusBadge';
import SearchableSelect from '../shared/SearchableSelect';
import Input from '../shared/Input';
import { SECURITY_REGISTERS } from '../../config/securityRegisters';
import { useMasterData } from '../../contexts/MasterDataContext';
import { useSales } from '../../contexts/SalesContext';
import { useVehicles } from '../../contexts/VehicleContext';

import CameraCapture from '../shared/CameraCapture';
import PhotoGalleryModal from '../shared/PhotoGalleryModal';
import LogViewerModal from '../shared/LogViewerModal';
import UserManualModal from '../shared/UserManualModal';


const SecurityModule = ({ showAlert, showConfirm }) => {
    // Consume Contexts
    const { vehicles, addVehicle, updateVehicle, deleteVehicle, refreshVehicles } = useVehicles();
    const { masterData } = useMasterData();
    const { plannedVehicles } = useSales();

    // Refs
    const scrollContainerRef = useRef(null);
    const fileInputRef = useRef(null);

    // Default to first register
    const firstRegisterId = Object.values(SECURITY_REGISTERS)[0]?.id || 'lorry_yard';
    const [activeTab, setActiveTab] = useState(firstRegisterId);

    // Form State
    const [formData, setFormData] = useState({});
    const [isEditing, setIsEditing] = useState(false);
    const [editId, setEditId] = useState(null);
    const [showCamera, setShowCamera] = useState(false);
    const [viewPhotos, setViewPhotos] = useState(null);
    const [viewHistory, setViewHistory] = useState(false); // Toggle for History
    const [showLogModal, setShowLogModal] = useState(false);
    const [selectedLogs, setSelectedLogs] = useState([]);
    const [showReturnModal, setShowReturnModal] = useState(false);
    const [returnVehicleId, setReturnVehicleId] = useState(null);
    const [newReturnVehicleNo, setNewReturnVehicleNo] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Search & Filter
    const [searchTerm, setSearchTerm] = useState('');

    // Selection for Bulk Actions
    const [selectedIds, setSelectedIds] = useState([]);

    // Filter Expected Vehicles for Sales Dispatch
    // Note: vehicles is now coming from Context (Supabase)
    const expectedSalesVehicles = vehicles.filter(v => v.status === 'SALES_EXPECTED_AT_SECURITY');

    // Initialize defaults on mount
    React.useEffect(() => {
        if (Object.keys(formData).length === 0) {
            setFormData(getInitialFormData(activeTab));
        }
    }, [activeTab]);

    // Helper to get active register config
    const activeRegister = Object.values(SECURITY_REGISTERS).find(reg => reg.id === activeTab);

    // Derived Lists
    const historySecurity = useMemo(() =>
        vehicles.filter(v => v.status === 'COMPLETED' || v.status === 'RETURN_COMPLETED').sort((a, b) => b.id - a.id),
        [vehicles]);

    const returnsVehicles = useMemo(() =>
        vehicles.filter(v => v.status === 'REJECTED_RETURN_PENDING' || v.status === 'RETURN_VEHICLE_INSIDE').sort((a, b) => b.id - a.id),
        [vehicles]);

    // Register Specific List
    const registerEntries = useMemo(() => {
        if (!activeRegister) return [];
        let entries = vehicles.filter(v => v.registerId === activeRegister.id);

        if (activeTab === 'lorry_yard') {
            if (viewHistory) {
                // Showing history?
            } else {
                entries = entries.filter(v => v.status !== 'COMPLETED' && v.status !== 'RETURN_COMPLETED');
            }
        } else {
            if (!viewHistory) {
                entries = entries.filter(v => v.status !== 'COMPLETED' && v.status !== 'RETURN_COMPLETED');
            }
        }
        return entries.sort((a, b) => b.id - a.id);
    }, [vehicles, activeRegister, activeTab, viewHistory]);

    const handleChange = (e) => {
        const { name, value } = e.target;
        let newFormData = { ...formData, [name]: value };

        // Rate Calculation Logic for RM_INWARD
        if (activeTab === 'rm_inward') {
            if (name === 'invoiceAmount' || name === 'qtyMts') {
                const amount = parseFloat(name === 'invoiceAmount' ? value : formData.invoiceAmount) || 0;
                const qty = parseFloat(name === 'qtyMts' ? value : formData.qtyMts) || 0;
                if (qty > 0) {
                    newFormData.ratePerUOM = (amount / qty).toFixed(2);
                } else {
                    newFormData.ratePerUOM = '';
                }
            }
        }

        setFormData(newFormData);
    };

    const handlePhotoCapture = (imageData) => {
        // Append photo to attachments array
        const currentAttachments = formData.attachments || [];
        setFormData(prev => ({ ...prev, attachments: [...currentAttachments, imageData] }));
        showAlert("Photo captured successfully!");
    };

    const removeAttachment = (index) => {
        const currentAttachments = formData.attachments || [];
        const newAttachments = currentAttachments.filter((_, i) => i !== index);
        setFormData(prev => ({ ...prev, attachments: newAttachments }));
    };

    const handleBulkUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target.result;
            const lines = text.split('\n');
            if (lines.length < 2) return; // Header + 1 row minimum

            const headers = lines[0].split(',').map(h => h.trim());

            let uploadCount = 0;

            for (let i = 1; i < lines.length; i++) {
                if (!lines[i].trim()) continue;
                const values = lines[i].split(',').map(v => v.trim());
                const entry = {};

                headers.forEach((header, index) => {
                    // Simple mapping: header name matches field name or label
                    // We try to match header to field 'name'
                    const field = activeRegister.fields.find(f => f.name.toLowerCase() === header.toLowerCase() || f.label.toLowerCase() === header.toLowerCase());
                    if (field) {
                        entry[field.name] = values[index];
                    }
                });

                // Generate ID
                const dateVal = entry.date ? new Date(entry.date) : new Date();
                const dd = String(dateVal.getDate()).padStart(2, '0');
                const mm = String(dateVal.getMonth() + 1).padStart(2, '0');
                const yyyy = dateVal.getFullYear();

                const supplierPart = (entry.supplierName || 'XXXX').substring(0, 4).toUpperCase().padEnd(4, 'X');
                const vehicleVal = entry.vehicleNo || '0000';
                const vehiclePart = vehicleVal.substring(vehicleVal.length - 4).toUpperCase().padStart(4, '0');

                const finalID = `${dd}${mm}${yyyy}${supplierPart}${vehiclePart}`;

                const newVehicle = {
                    id: Date.now() + i,
                    ...entry,
                    status: 'AT_QC_1', // Default bulk status
                    entryTime: new Date().toISOString(),
                    registerId: activeTab,
                    uniqueID: finalID,
                    origin: activeTab // Track origin
                };

                await addVehicle(newVehicle);
                uploadCount++;
            }

            showAlert(`Successfully uploaded ${uploadCount} entries.`);
            if (fileInputRef.current) fileInputRef.current.value = '';
        };
        reader.readAsText(file);
    };

    const getInitialFormData = (registerId) => {
        const initialData = {};
        const register = Object.values(SECURITY_REGISTERS).find(r => r.id === registerId);
        if (register) {
            register.fields.forEach(field => {
                if (field.name === 'date') {
                    initialData.date = new Date().toISOString().split('T')[0];
                }
                if (field.name === 'inTime') {
                    const now = new Date();
                    initialData.inTime = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
                }
            });
        }
        return initialData;
    };

    const handleTabChange = (tabId) => {
        setActiveTab(tabId);
        // setFormData(getInitialFormData(tabId)); // useEffect handles this now on activeTab change
        setIsEditing(false);
        setEditId(null);
        setSelectedIds([]);
        setViewHistory(false); // Reset
    };

    const generateUniqueID = () => {
        // Format: DDMMYYYY + Supplier(4) + Vehicle(4)
        const dateStr = formData.date ? new Date(formData.date) : new Date();
        const dd = String(dateStr.getDate()).padStart(2, '0');
        const mm = String(dateStr.getMonth() + 1).padStart(2, '0');
        const yyyy = dateStr.getFullYear();

        const supplierPart = (formData.supplierName || 'XXXX').substring(0, 4).toUpperCase().padEnd(4, 'X');
        const vehicleVal = formData.vehicleNo || '0000';
        const vehiclePart = vehicleVal.substring(vehicleVal.length - 4).toUpperCase().padStart(4, '0');

        return `${dd}${mm}${yyyy}${supplierPart}${vehiclePart}`;
    };

    const handleSave = async (shouldSubmit = false) => {
        if (!activeRegister) return;
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            // ... (keep validation and logic same)
            // Sales Dispatch Validation & Data Copy
            let salesData = {};
            if (activeTab === 'feed_dispatch') {
                const plannedVehicle = plannedVehicles.find(pv => pv.vehicleNo === formData.vehicleNo);
                if (!plannedVehicle) {
                    showAlert("Vehicle not found in Dispatch Plan. Please verify with Sales.");
                    setIsSubmitting(false);
                    return;
                }
                salesData = {
                    assignedOrders: plannedVehicle.assignedOrders,
                    plannedWeight: plannedVehicle.orders?.reduce((sum, o) => sum + o.qty, 0) || 0
                };
            }

            // Logic to update EXISTING expected vehicle instead of creating new if it exists
            const expectedVehicle = activeTab === 'feed_dispatch' ? vehicles.find(v => v.vehicleNo === formData.vehicleNo && v.status === 'SALES_EXPECTED_AT_SECURITY') : null;

            if (isEditing) {
                // Update Existing
                const v = vehicles.find(v => v.id === editId);
                if (!v) {
                    setIsSubmitting(false);
                    return;
                }

                let newStatus = v.status;
                if (shouldSubmit) {
                    if (v.status === 'AT_SECURITY_GATE_ENTRY' || v.status === 'AT_SECURITY_GATE') {
                        newStatus = (v.qc1Status === 'ACCEPTED') ? 'AT_WEIGHBRIDGE_1' : 'AT_QC_1';
                    }
                }

                await updateVehicle(editId, { ...formData, status: newStatus }, {
                    stage: 'SECURITY',
                    action: shouldSubmit ? `Updated & Submitted (Status: ${newStatus})` : 'Updated Entry',
                    timestamp: new Date().toISOString(),
                    user: 'SecurityGuard'
                });

                if (shouldSubmit) {
                    showAlert("Entry submitted successfully.");
                } else {
                    showAlert("Entry updated successfully.");
                }

                setIsEditing(false);
                setEditId(null);

            } else if (expectedVehicle) {
                // UPDATE Existing Expected Vehicle
                await updateVehicle(expectedVehicle.id, {
                    ...formData,
                    ...salesData,
                    status: shouldSubmit ? 'SALES_AT_WEIGHBRIDGE_1' : 'SALES_AT_SECURITY',
                    entryTime: new Date().toISOString(),
                    registerId: activeTab,
                    uniqueID: generateUniqueID(),
                    origin: activeTab
                }, {
                    stage: 'SECURITY',
                    action: `Sales Vehicle Admitted: ${formData.vehicleNo}`,
                    timestamp: new Date().toISOString(),
                    user: 'SecurityGuard'
                });

                if (shouldSubmit) {
                    showAlert("Vehicle Allowed! Moved directly to Weighbridge for Empty Weight.");
                } else {
                    showAlert("Entry saved as Draft.");
                }
            } else {
                // Create New
                const uniqueID = generateUniqueID();

                // DOUBLE CHECK: Prevent duplicate active entries (Idempotency & Business Rule)
                const normalize = (val) => String(val || '').trim().toLowerCase();

                const existingActive = vehicles.find(v =>
                    (normalize(v.vehicleNo) === normalize(formData.vehicleNo) || normalize(v.vehicleNumber) === normalize(formData.vehicleNo)) &&
                    !['COMPLETED', 'RETURN_COMPLETED', 'PROVISIONAL_PENDING_HOD'].includes(v.status) &&
                    v.id !== editId // Ignore self if editing
                );

                if (existingActive) {
                    showAlert(`Vehicle ${formData.vehicleNo} is already inside or active (Status: ${existingActive.status}). Cannot create duplicate entry.`);
                    setIsSubmitting(false);
                    return;
                }

                const newVehicle = {
                    id: Date.now(),
                    ...formData,
                    ...salesData,
                    status: shouldSubmit ? (activeTab === 'feed_dispatch' ? 'SALES_AT_WEIGHBRIDGE_1' : 'AT_QC_1') : 'AT_SECURITY_GATE',
                    entryTime: new Date().toISOString(),
                    registerId: activeTab,
                    uniqueID: uniqueID,
                    origin: activeTab,
                    logs: [{
                        stage: 'SECURITY',
                        action: `Vehicle Entered: ${formData.vehicleNo}`,
                        timestamp: new Date().toISOString(),
                        user: 'SecurityGuard'
                    }]
                };

                await addVehicle(newVehicle);

                if (shouldSubmit) {
                    showAlert(`Entry submitted successfully. ID: ${uniqueID}`);
                } else {
                    showAlert(`Entry saved as draft. ID: ${uniqueID}`);
                }
            }
            setFormData(getInitialFormData(activeTab));
        } catch (error) {
            console.error("Save Error:", error);
            showAlert("Error saving entry");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleEdit = (vehicle) => {
        let initialData = { ...vehicle };
        // Map materialName (Lorry Yard) to materialDesc (RM Inward) if missing
        if (activeTab === 'rm_inward' && !initialData.materialDesc && initialData.materialName) {
            initialData.materialDesc = initialData.materialName;
        }

        setFormData(initialData);
        setIsEditing(true);
        setEditId(vehicle.id);
        if (vehicle.registerId) {
            setActiveTab(vehicle.registerId);
        }
        // Scroll to top to see form
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };

    const handleDelete = (id) => {
        showConfirm("Are you sure you want to delete this entry?", async () => {
            await deleteVehicle(id);
            showAlert("Entry deleted successfully.");
            if (editId === id) {
                setIsEditing(false);
                setFormData({});
                setEditId(null);
            }
        });
    };

    const handleBulkDelete = () => {
        if (selectedIds.length === 0) return;
        showConfirm(`Are you sure you want to delete ${selectedIds.length} entries?`, async () => {
            for (const id of selectedIds) {
                await deleteVehicle(id);
            }
            showAlert(`${selectedIds.length} entries deleted successfully.`);
            setSelectedIds([]);
        });
    };

    const toggleSelection = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const toggleSelectAll = () => {
        if (selectedIds.length === registerEntries.length) {
            setSelectedIds([]);
        } else {
            setSelectedIds(registerEntries.map(v => v.id));
        }
    };



    const handleExit = async (vehicleId) => {
        const vehicle = vehicles.find(v => v.id === vehicleId);
        if (!vehicle) return;

        let newStatus = 'COMPLETED';
        let msg = 'Vehicle Exit Approved. Transaction Completed.';

        if (vehicle.status === 'RETURN_VEHICLE_INSIDE') {
            newStatus = 'RETURN_COMPLETED';
            msg = "Return Material Vehicle Exited. Transaction Closed.";
        } else if (vehicle.isProvisional) {
            newStatus = 'PROVISIONAL_PENDING_HOD';
            msg = "Vehicle Exited (Provisional). Pending HOD Approval.";
        }

        await updateVehicle(vehicleId, { status: newStatus }, {
            stage: 'SECURITY',
            action: 'Gate Out',
            timestamp: new Date().toISOString(),
            user: 'SecurityGuard'
        });

        showAlert(msg);
    };

    const handleReturnEntryClick = (vehicleId) => {
        setReturnVehicleId(vehicleId);
        setNewReturnVehicleNo('');
        setShowReturnModal(true);
    };

    const confirmReturnEntry = (e) => {
        e.preventDefault();
        if (!newReturnVehicleNo.trim()) {
            showAlert("Please enter the vehicle number.");
            return;
        }

        updateVehicle(returnVehicleId, {
            status: 'RETURN_AT_WEIGHBRIDGE_1',
            returnEntryTime: new Date().toISOString(),
            returnVehicleNo: newReturnVehicleNo.toUpperCase(),
        }, {
            stage: 'SECURITY',
            action: `Return Vehicle Entered: ${newReturnVehicleNo.toUpperCase()}`,
            timestamp: new Date().toISOString(),
            user: 'SecurityGuard'
        });

        showAlert("Return Vehicle Entered. Proceed to Weighbridge for Empty Weight.");
        setShowReturnModal(false);
        setReturnVehicleId(null);
    };

    const [showManual, setShowManual] = useState(false);

    return (
        <div className="space-y-6">
            <UserManualModal
                isOpen={showManual}
                onClose={() => setShowManual(false)}
                module="SECURITY"
            />

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">Security Gate</h1>
                    <p className="text-slate-500">Manage Vehicle Entry/Exit and Visitor Logs</p>
                </div>
                <div className="flex gap-2">
                    <button
                        onClick={() => setShowManual(true)}
                        className="p-2 text-slate-600 hover:text-brand-600 hover:bg-slate-100 rounded-lg transition-colors"
                        title="Open User Manual"
                    >
                        <HelpCircle size={24} />
                    </button>
                    <button
                        onClick={() => setShowCamera(true)}
                        className="p-2 text-brand-600 bg-brand-50 hover:bg-brand-100 rounded-lg border border-brand-200 shadow-sm transition-colors flex items-center gap-2"
                        title="Capture Photo"
                    >
                        <Camera size={20} /> <span className="text-sm font-bold hidden md:inline">Camera</span>
                    </button>
                </div>
            </div>

            {/* Camera Capture Modal */}
            {showCamera && (
                <CameraCapture
                    onCapture={handlePhotoCapture}
                    onClose={() => setShowCamera(false)}
                />
            )}

            {/* Scrollable Tabs */}
            <div className="relative border-b border-slate-200">
                <div className="absolute left-0 top-0 bottom-0 w-8 bg-gradient-to-r from-slate-50 to-transparent z-10 pointer-events-none"></div>
                <div className="absolute right-0 top-0 bottom-0 w-8 bg-gradient-to-l from-slate-50 to-transparent z-10 pointer-events-none"></div>

                <div
                    ref={scrollContainerRef}
                    className="flex overflow-x-auto hide-scrollbar gap-1 pb-0.5 px-2 snap-x"
                    style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                >
                    {/* Removed Active Gate Tab */}

                    {Object.values(SECURITY_REGISTERS).map(reg => {
                        const count = vehicles.filter(v => v.registerId === reg.id && (v.status === 'AT_SECURITY_GATE_ENTRY' || v.status === 'AT_SECURITY_GATE')).length;
                        return (
                            <button
                                key={reg.id}
                                onClick={() => handleTabChange(reg.id)}
                                className={`flex-shrink-0 px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors snap-start ${activeTab === reg.id ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                            >
                                <FileText size={18} /> {reg.label}
                                {count > 0 && <span className="ml-1 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{count}</span>}
                            </button>
                        )
                    })}

                    <button
                        onClick={() => handleTabChange('HISTORY')}
                        className={`flex-shrink-0 px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors snap-start ${activeTab === 'HISTORY' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                    >
                        <History size={18} /> History
                    </button>
                    <button
                        onClick={() => handleTabChange('RETURNS')}
                        className={`flex-shrink-0 px-4 py-3 text-sm font-medium flex items-center gap-2 border-b-2 transition-colors snap-start ${activeTab === 'RETURNS' ? 'border-brand-600 text-brand-600' : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'}`}
                    >
                        <RotateCcw size={18} /> Returns ({returnsVehicles.length})
                    </button>
                </div>
            </div>

            {/* Removed Active Gate View */}

            {/* REGISTER FORMS & LIST */}
            {activeRegister && (
                <div className="space-y-6">
                    {/* Form Section */}
                    <div className="bg-white rounded-2xl shadow-card border border-slate-100 p-6 animate-fade-in">
                        <div className="flex justify-between items-center mb-6 border-b border-slate-100 pb-4">
                            <h2 className="text-xl font-bold text-slate-800 flex items-center gap-2">
                                {isEditing ? <Edit2 size={20} className="text-brand-600" /> : <Plus size={20} className="text-brand-600" />}
                                {isEditing ? 'Edit Entry' : 'New Entry'} : <span className="text-brand-600">{activeRegister.label}</span>
                            </h2>
                            <div className="flex gap-2">
                                <input
                                    type="file"
                                    ref={fileInputRef}
                                    onChange={handleBulkUpload}
                                    className="hidden"
                                    accept=".csv"
                                />
                                <button
                                    onClick={() => fileInputRef.current.click()}
                                    className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-lg flex items-center gap-2 transition-colors"
                                >
                                    <Upload size={16} /> Bulk Upload
                                </button>
                                <button
                                    onClick={() => setViewHistory(!viewHistory)}
                                    className={`px-3 py-1.5 text-sm font-medium rounded-lg flex items-center gap-2 transition-colors ${viewHistory ? 'bg-brand-100 text-brand-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                                >
                                    <History size={16} /> {viewHistory ? 'View Active' : 'View History'}
                                </button>
                                {isEditing && (
                                    <button
                                        onClick={() => { setIsEditing(false); setFormData({}); setEditId(null); }}
                                        className="text-sm text-red-500 hover:text-red-700 font-medium"
                                    >
                                        Cancel Edit
                                    </button>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            {activeRegister.fields.map(field => {
                                // Logic to disable fields if vehicle is ready for Gate Out OR Completed
                                const isReadyForGateOut = formData.status === 'AT_SECURITY_OUT' || formData.status === 'RETURN_AT_SECURITY_OUT';
                                const isCompleted = ['COMPLETED', 'RETURN_COMPLETED', 'PROVISIONAL_PENDING_HOD'].includes(formData.status);

                                const isExitField = ['outTime', 'vehicleOutDate', 'vehicleOutTime', 'remarks'].includes(field.name);
                                // If ready for gate out, disable all EXCEPT exit fields.
                                // If completed, disable ALL fields (View Only).
                                const shouldDisable = isCompleted || (isReadyForGateOut && !isExitField);

                                if (field.masterList) {
                                    return (
                                        <SearchableSelect
                                            key={field.name}
                                            label={field.label}
                                            name={field.name}
                                            options={masterData[field.masterList] || []}
                                            value={formData[field.name] || ''}
                                            onChange={handleChange}
                                            required={field.required}
                                            placeholder={`Select ${field.label}`}
                                            disabled={shouldDisable}
                                        />
                                    );
                                }
                                return (
                                    <Input
                                        key={field.name}
                                        label={field.label}
                                        name={field.name}
                                        type={field.type}
                                        value={formData[field.name] || ''}
                                        onChange={handleChange}
                                        required={field.required}
                                        readOnly={field.readOnly || shouldDisable}
                                        className={shouldDisable ? 'bg-slate-100 text-slate-500 cursor-not-allowed' : ''}
                                    />
                                );
                            })}
                        </div>

                        <div className="mt-8 flex justify-end gap-3">
                            <button
                                onClick={() => setFormData(getInitialFormData(activeTab))} // Reset to defaults
                                className="px-6 py-2 text-slate-600 hover:bg-slate-100 rounded-lg font-medium transition-colors"
                                disabled={isSubmitting || ['COMPLETED', 'RETURN_COMPLETED', 'PROVISIONAL_PENDING_HOD'].includes(formData.status)}
                            >
                                Clear
                            </button>
                            {/* Hide Save/Update button if completed (View Only) */}
                            {!['COMPLETED', 'RETURN_COMPLETED', 'PROVISIONAL_PENDING_HOD'].includes(formData.status) && (
                                <button
                                    onClick={() => handleSave(false)}
                                    disabled={isSubmitting}
                                    className={`px-6 py-2 border border-brand-600 text-brand-600 hover:bg-brand-50 rounded-lg font-bold transition-all active:scale-95 flex items-center gap-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Save size={18} />
                                    {isEditing ? 'Update' : 'Save Draft'}
                                </button>
                            )}
                            {!['COMPLETED', 'RETURN_COMPLETED', 'PROVISIONAL_PENDING_HOD'].includes(formData.status) && (
                                <button
                                    onClick={() => handleSave(true)}
                                    disabled={isSubmitting}
                                    className={`px-6 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold shadow-lg shadow-brand-500/20 transition-all active:scale-95 flex items-center gap-2 ${isSubmitting ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    {isEditing ? <CheckCircle size={18} /> : <LogIn size={18} />}
                                    {isSubmitting
                                        ? 'Procesing...'
                                        : (isEditing
                                            ? (activeTab === 'feed_dispatch' ? 'Update & Send to WB' : 'Update & Send to QC')
                                            : (activeTab === 'rm_inward' ? 'Gate In (Send to QC)' : 'Gate In')
                                        )
                                    }
                                </button>
                            )}
                        </div>

                        {/* Attachments Section */}
                        {formData.attachments && formData.attachments.length > 0 && (
                            <div className="mt-6 pt-6 border-t border-slate-100">
                                <h3 className="text-sm font-bold text-slate-700 mb-3 flex items-center gap-2">
                                    <Camera size={16} /> Attached Photos ({formData.attachments.length})
                                </h3>
                                <div className="flex gap-4 overflow-x-auto pb-2">
                                    {formData.attachments.map((img, idx) => (
                                        <div key={idx} className="relative group flex-shrink-0">
                                            <img
                                                src={img}
                                                alt={`Attachment ${idx + 1}`}
                                                className="w-24 h-24 object-cover rounded-lg border border-slate-200 shadow-sm"
                                            />
                                            <button
                                                onClick={() => removeAttachment(idx)}
                                                className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-md opacity-0 group-hover:opacity-100 transition-opacity"
                                                title="Remove Photo"
                                            >
                                                <XCircle size={14} />
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Recent Entries List */}
                    < div className="bg-white rounded-2xl shadow-card border border-slate-100 overflow-hidden animate-fade-in" >
                        <div className="p-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                            <div className="flex items-center gap-3">
                                <h3 className="font-bold text-slate-800">Recent Entries ({registerEntries.length})</h3>
                                {selectedIds.length > 0 && (
                                    <button
                                        onClick={handleBulkDelete}
                                        className="px-3 py-1 text-xs font-bold text-red-600 bg-red-100 hover:bg-red-200 rounded-lg flex items-center gap-1 transition-colors"
                                    >
                                        <Trash2 size={12} /> Delete Selected ({selectedIds.length})
                                    </button>
                                )}
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-4 py-3 w-10">
                                            <input
                                                type="checkbox"
                                                checked={selectedIds.length === registerEntries.length && registerEntries.length > 0}
                                                onChange={toggleSelectAll}
                                                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                            />
                                        </th>
                                        <th className="px-4 py-3 font-semibold text-slate-700">Date/Time</th>
                                        <th className="px-4 py-3 font-semibold text-slate-700">Vehicle No</th>
                                        <th className="px-4 py-3 font-semibold text-slate-700">Supplier/Party</th>
                                        <th className="px-4 py-3 font-semibold text-slate-700">Material</th>
                                        <th className="px-4 py-3 font-semibold text-slate-700 text-center">Status</th>
                                        <th className="px-4 py-3 font-semibold text-slate-700 text-right">Actions</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {registerEntries.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-slate-500">No entries found for this register.</td>
                                        </tr>
                                    ) : (
                                        registerEntries.map(v => (
                                            <tr key={v.id} className="hover:bg-slate-50 group">
                                                <td className="px-4 py-3">
                                                    <input
                                                        type="checkbox"
                                                        checked={selectedIds.includes(v.id)}
                                                        onChange={() => toggleSelection(v.id)}
                                                        className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                                    />
                                                </td>
                                                <td className="px-4 py-3 text-slate-500 text-sm">
                                                    <div>{new Date(v.date || v.entryTime).toLocaleDateString()}</div>
                                                    <div className="text-xs text-slate-400">{v.inTime || new Date(v.entryTime).toLocaleTimeString()}</div>
                                                </td>
                                                <td className="px-4 py-3 font-medium text-slate-900">{v.vehicleNo}</td>
                                                <td className="px-4 py-3 text-slate-600 text-sm">{v.supplierName || v.partyName || '-'}</td>
                                                <td className="px-4 py-3 text-slate-600 text-sm">{v.materialName || v.material || v.materialDesc || '-'}</td>
                                                <td className="px-4 py-3 text-center">
                                                    <StatusBadge status={v.status} />
                                                </td>
                                                <td className="px-4 py-3 text-right">
                                                    <div className="flex justify-end gap-2 items-center">
                                                        <button
                                                            onClick={() => { setSelectedLogs(v.logs || []); setShowLogModal(true); }}
                                                            className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                                            title="View Logs"
                                                        >
                                                            <History size={16} />
                                                        </button>
                                                        {(v.status === 'AT_SECURITY_OUT' || v.status === 'SALES_AT_SECURITY_EXIT') && (
                                                            <button
                                                                onClick={() => handleExit(v.id)}
                                                                className="px-2 py-1 bg-slate-800 text-white rounded text-xs font-bold hover:bg-slate-900 transition-colors flex items-center gap-1"
                                                            >
                                                                <LogOut size={12} /> Gate Out
                                                            </button>
                                                        )}

                                                        {['COMPLETED', 'RETURN_COMPLETED', 'PROVISIONAL_PENDING_HOD'].includes(v.status) ? (
                                                            <button
                                                                onClick={() => handleEdit(v)}
                                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                                title="View Details"
                                                            >
                                                                <Eye size={16} />
                                                            </button>
                                                        ) : (
                                                            <button
                                                                onClick={() => handleEdit(v)}
                                                                className="p-1.5 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg transition-colors"
                                                                title="Edit"
                                                            >
                                                                <Edit2 size={16} />
                                                            </button>
                                                        )}
                                                        {!['COMPLETED', 'RETURN_COMPLETED', 'PROVISIONAL_PENDING_HOD'].includes(v.status) && (
                                                            <button
                                                                onClick={() => handleDelete(v.id)}
                                                                className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                                                title="Delete"
                                                            >
                                                                <Trash2 size={16} />
                                                            </button>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div >
                </div >
            )}


            {/* View Photos Modal */}
            {/* View Photos Modal */}
            {
                viewPhotos && (
                    <PhotoGalleryModal
                        photos={viewPhotos}
                        onClose={() => setViewPhotos(null)}
                    />
                )
            }



            {/* RETURNS TAB */}
            {
                activeTab === 'RETURNS' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                        <div className="p-4 border-b border-slate-100 bg-red-50 text-red-800 flex items-center gap-2">
                            <AlertTriangle size={18} />
                            <span className="font-bold">Rejected / Return Material Vehicles</span>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Date/Time</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">ID / Vehicle</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Supplier</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Rejection Reason</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {returnsVehicles.length === 0 ? (
                                        <tr>
                                            <td colSpan="6" className="px-6 py-8 text-center text-slate-500">No return vehicles pending.</td>
                                        </tr>
                                    ) : (
                                        returnsVehicles.map(v => (
                                            <tr key={v.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 text-slate-500">
                                                    {v.hodDecisionTime ? new Date(v.hodDecisionTime).toLocaleDateString() : new Date(v.entryTime).toLocaleDateString()}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <div className="font-medium text-slate-900">{v.vehicleNo}</div>
                                                    <div className="text-xs text-slate-400 font-mono">{v.uniqueID}</div>
                                                </td>
                                                <td className="px-6 py-4 text-slate-500">{v.supplierName}</td>
                                                <td className="px-6 py-4 text-red-600 italic">
                                                    {v.hodRemarks || 'Rejected by QC/HOD'}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <StatusBadge status={v.status} />
                                                </td>
                                                <td className="px-6 py-4">
                                                    {v.status === 'REJECTED_RETURN_PENDING' && (
                                                        <button
                                                            onClick={() => handleReturnEntryClick(v.id)}
                                                            className="px-3 py-1.5 bg-brand-600 text-white rounded-lg text-sm font-bold hover:bg-brand-700 shadow-sm transition-colors flex items-center gap-2"
                                                        >
                                                            <LogIn size={16} /> Allow Entry
                                                        </button>
                                                    )}
                                                    {v.status === 'RETURN_AT_SECURITY_OUT' && (
                                                        <button
                                                            onClick={() => handleExit(v.id)}
                                                            className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-sm font-bold hover:bg-slate-900 shadow-sm transition-colors flex items-center gap-2"
                                                        >
                                                            <LogOut size={16} /> Gate Out (Close)
                                                        </button>
                                                    )}
                                                    <button
                                                        onClick={() => { setSelectedLogs(v.logs || []); setShowLogModal(true); }}
                                                        className="block mt-2 text-slate-400 hover:text-brand-600 font-medium text-xs flex items-center gap-1"
                                                    >
                                                        <History size={14} /> Logs
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }

            {/* HISTORY TAB */}
            {
                activeTab === 'HISTORY' && (
                    <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden animate-fade-in">
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-sm">
                                <thead className="bg-slate-50 border-b border-slate-200">
                                    <tr>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Date/Time</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Vehicle No</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Supplier</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Register</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Photos</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Status</th>
                                        <th className="px-6 py-4 font-semibold text-slate-700">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-100">
                                    {historySecurity.length === 0 ? (
                                        <tr>
                                            <td colSpan="7" className="px-6 py-8 text-center text-slate-500">No security history found.</td>
                                        </tr>
                                    ) : (
                                        historySecurity.map(v => (
                                            <tr key={v.id} className="hover:bg-slate-50">
                                                <td className="px-6 py-4 text-slate-500">{new Date(v.entryTime).toLocaleString()}</td>
                                                <td className="px-6 py-4 font-medium text-slate-900">{v.vehicleNo}</td>
                                                <td className="px-6 py-4 text-slate-500">{v.supplierName}</td>
                                                <td className="px-6 py-4 text-slate-500">{(Object.values(SECURITY_REGISTERS).find(r => r.id === v.registerId)?.label) || '-'}</td>
                                                <td className="px-6 py-4">
                                                    {v.attachments && v.attachments.length > 0 ? (
                                                        <button
                                                            onClick={() => setViewPhotos(v.attachments)}
                                                            className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 text-xs font-bold hover:bg-blue-200 transition-colors"
                                                        >
                                                            <Camera size={14} /> View ({v.attachments.length})
                                                        </button>
                                                    ) : (
                                                        <span className="text-slate-400 text-xs text-center block w-12">-</span>
                                                    )}
                                                </td>
                                                <td className="px-6 py-4">
                                                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-700">
                                                        Exited
                                                    </span>
                                                </td>
                                                <td className="px-6 py-4">
                                                    <button
                                                        onClick={() => { setSelectedLogs(v.logs || []); setShowLogModal(true); }}
                                                        className="text-brand-600 hover:text-brand-800 font-medium text-xs flex items-center gap-1"
                                                    >
                                                        <History size={14} /> Logs
                                                    </button>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                )
            }
            {/* Return Entry Modal */}
            {
                showReturnModal && (
                    <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
                        <div className="bg-white rounded-xl shadow-2xl max-w-sm w-full p-6">
                            <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                                <Truck className="text-brand-600" /> Return Vehicle Entry
                            </h3>
                            <form onSubmit={confirmReturnEntry}>
                                <label className="block text-sm font-medium text-slate-700 mb-2">
                                    New Vehicle Number (for Pickup)
                                </label>
                                <input
                                    type="text"
                                    required
                                    className="w-full p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-brand-500 outline-none uppercase font-bold"
                                    placeholder="AP00XX0000"
                                    value={newReturnVehicleNo}
                                    onChange={(e) => setNewReturnVehicleNo(e.target.value)}
                                />
                                <div className="flex gap-3 mt-6">
                                    <button
                                        type="button"
                                        onClick={() => setShowReturnModal(false)}
                                        className="flex-1 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        type="submit"
                                        className="flex-1 py-2 bg-brand-600 hover:bg-brand-700 text-white rounded-lg font-bold shadow-lg"
                                    >
                                        Confirm Entry
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }

            {/* Expected Vehicles Bubble (only for Feed Dispatch) */}
            {
                activeTab === 'feed_dispatch' && expectedSalesVehicles.length > 0 && !isEditing && (
                    <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-xl animate-fade-in">
                        <h4 className="flex items-center gap-2 font-bold text-blue-800 mb-3">
                            <Truck size={18} /> Sales Vehicles Expected (Called by Sales)
                        </h4>
                        <div className="flex flex-wrap gap-2">
                            {expectedSalesVehicles.map(v => (
                                <button
                                    key={v.id}
                                    onClick={() => {
                                        const invoice = v.generatedInvoices?.[0] || {};
                                        const order = v.assignedOrders?.[0] || {};

                                        // Calculate Bags
                                        const totalQtyMT = v.assignedOrders?.reduce((sum, o) => sum + Number(o.qty), 0) || 0;
                                        const totalBags = Math.ceil((totalQtyMT * 1000) / 25);

                                        setFormData({
                                            vehicleNo: v.vehicleNo,
                                            driverName: v.driverName,
                                            descriptionOfFeed: order.product || 'Feed',
                                            dcNo: invoice.id || '', // DC No is Invoice No
                                            invoiceDate: invoice.date || new Date().toISOString().split('T')[0],
                                            destinationAddress: order.customer ? `${order.customer}, ${order.region}` : '',
                                            noOfBags: totalBags,
                                            // vehicleArrivingDate and remarks remain empty as requested
                                        });
                                        // Also set reference to this expected vehicle so we update IT instead of identifying solely by string
                                        // Actually, we can just use the vehicleNo to match logic in handleSave
                                    }}
                                    className="px-3 py-1.5 bg-white border border-blue-200 shadow-sm rounded-lg text-sm font-medium text-blue-700 hover:bg-blue-100 hover:border-blue-300 transition-all active:scale-95"
                                >
                                    {v.vehicleNo}
                                </button>
                            ))}
                        </div>
                    </div>
                )
            }

            {/* Log Viewer Modal */}
            <LogViewerModal
                isOpen={showLogModal}
                onClose={() => setShowLogModal(false)}
                logs={selectedLogs}
                title="Vehicle Audit Logs"
            />
        </div >
    );
};

export default SecurityModule;
