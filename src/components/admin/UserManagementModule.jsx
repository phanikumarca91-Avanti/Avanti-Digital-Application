import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Plus, Edit2, Trash2, Save, X, RefreshCw, Key, Shield, User } from 'lucide-react';

const UserManagementModule = ({ showAlert }) => {
    const { user: currentUser } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);

    // Form State
    const [formData, setFormData] = useState({
        id: null,
        username: '',
        password: '',
        full_name: '',
        role: 'SECURITY',
        allowed_modules: [],
        assigned_location_id: 'LOC001'
    });

    const ROLES = ['ADMIN', 'SECURITY', 'WEIGHBRIDGE', 'QC', 'STORE', 'PRODUCTION', 'SALES', 'ERP'];

    const LOCATIONS = [
        { id: 'LOC001', name: 'Kovvuru', code: 'KVR' },
        { id: 'LOC002', name: 'Bandapuram', code: 'BDP' },
        { id: 'LOC003', name: 'Gujarat', code: 'GUJ' },
        { id: 'CORPORATE', name: 'Corporate Office', code: 'CORP' }
    ];

    const ALL_MODULES = [
        { id: 'SECURITY', label: 'Security Gate' },
        { id: 'QC', label: 'Quality Control' },
        { id: 'WEIGHBRIDGE', label: 'Weighbridge' },
        { id: 'WAREHOUSE', label: 'Warehouse' },
        { id: 'ERP', label: 'ERP Docs' },
        { id: 'PRODUCTION', label: 'Production' },
        { id: 'MATERIAL_HOD', label: 'Material HOD' },
        { id: 'CUSTOMERS', label: 'Customer Module' },
        { id: 'SALES', label: 'Sales & Dispatch' },
        { id: 'MATERIALS', label: 'Material Master' },
        { id: 'SUPPLIERS', label: 'Supplier Master' },
        { id: 'REPORTS', label: 'Reports & Logs' },
        { id: 'USERS', label: 'User Management' }
    ];

    const ROLE_DEFAULTS = {
        ADMIN: ['ALL'],
        SECURITY: ['SECURITY'],
        WEIGHBRIDGE: ['WEIGHBRIDGE'],
        QC: ['QC'],
        STORE: ['WAREHOUSE', 'MATERIALS', 'SUPPLIERS'],
        PRODUCTION: ['PRODUCTION', 'MATERIAL_HOD'],
        SALES: ['SALES', 'CUSTOMERS'],
        ERP: ['ERP']
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('users').select('*').order('username');
        if (error) {
            showAlert(`Error fetching users: ${error.message}`);
        } else {
            setUsers(data);
        }
        setLoading(false);
    };

    const handleEdit = (u) => {
        // Determine current modules: explicit DB column OR default for role
        let currentModules = u.allowed_modules;
        if (!currentModules || currentModules.length === 0) {
            currentModules = ROLE_DEFAULTS[u.role] || [];
        }

        setFormData({
            id: u.id,
            username: u.username,
            password: u.password,
            full_name: u.full_name || '',
            role: u.role,
            allowed_modules: currentModules,
            assigned_location_id: u.assigned_location_id || 'LOC001'
        });
        setIsEditing(true);
    };

    const handleDelete = async (id) => {
        if (!window.confirm("Are you sure you want to delete this user?")) return;

        const { error } = await supabase.from('users').delete().eq('id', id);
        if (error) showAlert(`Error deleting: ${error.message}`);
        else {
            showAlert("User deleted successfully.");
            fetchUsers();
        }
    };

    const handleRoleChange = (newRole) => {
        const defaults = ROLE_DEFAULTS[newRole] || [];
        setFormData({
            ...formData,
            role: newRole,
            allowed_modules: defaults
        });
    };

    const toggleModule = (moduleId) => {
        let newModules;
        // Logic: if current is 'ALL' (Admin default), and they click something else, we assume they want Custom list.
        // But 'ALL' isn't in the checkbox list usually.
        // If they act on form, we remove 'ALL' implies we need to rebuild list? 
        // Simpler: If 'ALL' is present, treat as all modules checked visually? 
        // Let's just deal with the array.

        if (formData.allowed_modules.includes(moduleId)) {
            newModules = formData.allowed_modules.filter(m => m !== moduleId);
        } else {
            newModules = [...formData.allowed_modules, moduleId];
        }

        // Remove 'ALL' if we are customizing specific modules to avoid ambiguity
        if (newModules.includes('ALL') && newModules.length > 1) {
            newModules = newModules.filter(m => m !== 'ALL');
        }

        setFormData({ ...formData, allowed_modules: newModules });
    };

    const handleSave = async (e) => {
        e.preventDefault();

        if (!formData.username || !formData.password || !formData.role) {
            showAlert("Please fill in all required fields.");
            return;
        }

        const payload = {
            username: formData.username,
            password: formData.password,
            full_name: formData.full_name,
            role: formData.role,
            allowed_modules: formData.allowed_modules,
            assigned_location_id: formData.assigned_location_id
        };

        if (formData.id) {
            const { error } = await supabase.from('users').update(payload).eq('id', formData.id);
            if (error) showAlert(`Error updating: ${error.message}`);
            else {
                showAlert("User updated successfully.");
                resetForm();
                fetchUsers();
            }
        } else {
            const { error } = await supabase.from('users').insert([payload]);
            if (error) showAlert(`Error adding: ${error.message}`);
            else {
                showAlert("User added successfully.");
                resetForm();
                fetchUsers();
            }
        }
    };

    const resetForm = () => {
        setFormData({
            id: null,
            username: '',
            password: '',
            full_name: '',
            role: 'SECURITY',
            allowed_modules: ['SECURITY'],
            assigned_location_id: 'LOC001'
        });
        setIsEditing(false);
    };

    // Security Check
    if (currentUser?.role !== 'ADMIN') {
        return (
            <div className="flex flex-col items-center justify-center h-full text-red-500">
                <Shield size={48} className="mb-4" />
                <h2 className="text-xl font-bold">Access Denied</h2>
                <p>Only Administrators can manage users.</p>
            </div>
        );
    }

    return (
        <div className="h-full flex flex-col gap-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-slate-800">User Management</h1>
                    <p className="text-sm text-slate-500">Add, Edit, or Remove System Users</p>
                </div>
                <button
                    onClick={() => { resetForm(); setIsEditing(true); }}
                    className="bg-brand-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-brand-700 font-medium"
                >
                    <Plus size={18} /> Add New User
                </button>
            </div>

            <div className="flex gap-6 h-full overflow-hidden">
                {/* User List */}
                <div className="flex-1 bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden flex flex-col">
                    <div className="overflow-y-auto flex-1">
                        <table className="w-full text-left">
                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                <tr>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">User</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Location</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Role</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Modules</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase">Password</th>
                                    <th className="p-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {users.map(u => (
                                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                                        <div className="p-4 flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-bold text-xs border border-slate-200">
                                                {u.username.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="font-bold text-slate-800">{u.username}</div>
                                                <div className="text-xs text-slate-400">{u.full_name}</div>
                                            </div>
                                        </div>
                                        <td className="p-4">
                                            <span className="px-2 py-1 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                                                {LOCATIONS.find(l => l.id === u.assigned_location_id)?.code || 'KVR'}
                                            </span>
                                        </td>
                                        <td className="p-4">
                                            <span className={`px-2 py-1 rounded-md text-xs font-bold border ${u.role === 'ADMIN' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                                                u.role === 'SECURITY' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                                    'bg-slate-100 text-slate-600 border-slate-200'
                                                }`}>
                                                {u.role}
                                            </span>
                                        </td>
                                        <td className="p-4 text-xs text-slate-500 max-w-[200px] truncate">
                                            {u.allowed_modules ? u.allowed_modules.join(', ') : (ROLE_DEFAULTS[u.role] || []).join(', ')}
                                        </td>
                                        <td className="p-4 font-mono text-sm text-slate-400">
                                            {u.password}
                                        </td>
                                        <td className="p-4 text-right">
                                            <div className="flex items-center justify-end gap-2">
                                                <button onClick={() => handleEdit(u)} className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-lg">
                                                    <Edit2 size={16} />
                                                </button>
                                                {u.username !== 'admin' && ( // Prevent deleting main admin
                                                    <button onClick={() => handleDelete(u.id)} className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg">
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Edit/Create Form Sidebar */}
                {isEditing && (
                    <div className="w-96 bg-white rounded-xl shadow-xl border border-slate-200 p-6 flex flex-col animate-fade-in-right overflow-y-auto">
                        <div className="flex items-center justify-between mb-6">
                            <h3 className="font-bold text-lg text-slate-800">
                                {formData.id ? 'Edit User' : 'New User'}
                            </h3>
                            <button onClick={() => setIsEditing(false)} className="text-slate-400 hover:text-slate-600">
                                <X size={20} />
                            </button>
                        </div>

                        <form onSubmit={handleSave} className="flex-1 flex flex-col gap-4">
                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Username</label>
                                <input
                                    type="text"
                                    required
                                    value={formData.username}
                                    onChange={e => setFormData({ ...formData, username: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500"
                                    placeholder="e.g. guard1"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Full Name</label>
                                <input
                                    type="text"
                                    value={formData.full_name}
                                    onChange={e => setFormData({ ...formData, full_name: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500"
                                    placeholder="e.g. John Doe"
                                />
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Assigned Location</label>
                                <select
                                    value={formData.assigned_location_id}
                                    onChange={e => setFormData({ ...formData, assigned_location_id: e.target.value })}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 bg-white"
                                >
                                    {LOCATIONS.map(loc => <option key={loc.id} value={loc.id}>{loc.name} ({loc.code})</option>)}
                                </select>
                            </div>

                            <div>
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-1">Role</label>
                                <select
                                    value={formData.role}
                                    onChange={e => handleRoleChange(e.target.value)}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:outline-none focus:border-brand-500 bg-white"
                                >
                                    {ROLES.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>

                            {/* Module Selection */}
                            <div className="border border-slate-100 rounded-lg p-3 bg-slate-50 max-h-48 overflow-y-auto">
                                <label className="text-xs font-bold text-slate-500 uppercase block mb-2">Access Modules</label>
                                <div className="space-y-2">
                                    {ALL_MODULES.map(module => (
                                        <label key={module.id} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer hover:bg-slate-100 p-1 rounded">
                                            <input
                                                type="checkbox"
                                                checked={formData.allowed_modules.includes(module.id) || (formData.role === 'ADMIN' && formData.allowed_modules.includes('ALL'))}
                                                onChange={() => toggleModule(module.id)}
                                                className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                                            />
                                            <span>{module.label}</span>
                                        </label>
                                    ))}
                                </div>
                                {formData.role === 'ADMIN' && <p className="text-xs text-brand-500 mt-2 italic">Admins typically have 'ALL' access.</p>}
                            </div>

                            <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-100">
                                <label className="text-xs font-bold text-yellow-700 uppercase block mb-1 flex items-center gap-2">
                                    <Key size={12} /> Password
                                </label>
                                <input
                                    type="text"
                                    required
                                    value={formData.password}
                                    onChange={e => setFormData({ ...formData, password: e.target.value })}
                                    className="w-full px-3 py-2 border border-yellow-200 rounded-lg focus:outline-none focus:border-yellow-500 bg-white font-mono"
                                    placeholder="Enter password"
                                />
                                <p className="text-[10px] text-yellow-600 mt-1">
                                    Visible to Admin. Used for login.
                                </p>
                            </div>

                            <div className="mt-auto pt-4 border-t border-slate-100 flex gap-2">
                                <button
                                    type="button"
                                    onClick={() => setIsEditing(false)}
                                    className="flex-1 py-2 text-sm font-bold text-slate-500 hover:bg-slate-100 rounded-lg"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 py-2 text-sm font-bold text-white bg-brand-600 hover:bg-brand-700 rounded-lg shadow-md shadow-brand-500/20"
                                >
                                    Save User
                                </button>
                            </div>
                        </form>
                    </div>
                )}
            </div>
        </div>
    );
};

export default UserManagementModule;
