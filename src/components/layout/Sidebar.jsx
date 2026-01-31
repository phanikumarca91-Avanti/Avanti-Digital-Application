import React, { useMemo } from 'react';
import { ShieldCheck, ClipboardCheck, Scale, Warehouse, Factory, FileText, Settings, LogOut, Database, Users, Truck, ShoppingBag, UserCheck, Key } from 'lucide-react';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { useProduction } from '../../contexts/ProductionContext';
import { useAuth } from '../../contexts/AuthContext';
import ClearDataButton from '../shared/ClearDataButton';

const ROLE_ACCESS = {
    ADMIN: 'ALL',
    SECURITY: ['SECURITY'],
    WEIGHBRIDGE: ['WEIGHBRIDGE'],
    QC: ['QC'],
    STORE: ['WAREHOUSE', 'MATERIALS', 'SUPPLIERS'],
    PRODUCTION: ['PRODUCTION', 'MATERIAL_HOD'],
    SALES: ['SALES', 'CUSTOMERS'], // REPORTS removed as per previous step
    ERP: ['ERP']
};

const Sidebar = ({ activeTab, setActiveTab, counts, onChangePassword }) => {
    const { user, logout } = useAuth();
    const { getOpenMRs, getPendingInwardVehicles } = useWarehouse();
    const { getLotsByStatus } = useProduction();

    // QC: QC1, QC2
    const qcBadge = counts?.qc || 0;

    // Weighbridge: WB1 (Gross) or WB2 (Tare)
    const weighbridgeBadge = counts?.weigh || 0;

    // ERP: Pending Documentation
    const erpBadge = counts?.erp || 0;

    // Material HOD: Pending Approval
    const hodBadge = counts?.hod || 0;

    // Security: Vehicles waiting for Exit or Rejected Entry
    const securityBadge = counts?.security || 0;

    // Warehouse Logic
    const openMRs = getOpenMRs();
    const pendingBayAssign = openMRs.filter(mr => mr.status === 'PENDING_BAY_ASSIGNMENT').length;
    const pendingInward = counts?.warehouse || 0;
    const pendingFGPlacement = getLotsByStatus('PENDING_QA').length;
    const warehouseBadgeCount = pendingBayAssign + pendingInward + pendingFGPlacement;

    // Production Logic
    const pendingDumping = openMRs.filter(mr => mr.status === 'PENDING_DUMPING').length;
    const unassignedLots = getLotsByStatus('UNASSIGNED').length;
    const productionBadgeCount = pendingDumping + unassignedLots;

    const menuItems = [
        {
            id: 'SECURITY',
            label: 'Security Gate',
            icon: ShieldCheck,
            badge: securityBadge > 0 ? securityBadge : null
        },
        {
            id: 'QC',
            label: 'Quality Control',
            icon: ClipboardCheck,
            badge: qcBadge > 0 ? qcBadge : null
        },
        {
            id: 'WEIGHBRIDGE',
            label: 'Weighbridge',
            icon: Scale,
            badge: weighbridgeBadge > 0 ? weighbridgeBadge : null
        },
        {
            id: 'WAREHOUSE',
            label: 'Warehouse',
            icon: Warehouse,
            badge: warehouseBadgeCount > 0 ? warehouseBadgeCount : null
        },
        {
            id: 'ERP',
            label: 'ERP Docs',
            icon: FileText,
            badge: erpBadge > 0 ? erpBadge : null
        },
        {
            id: 'PRODUCTION',
            label: 'Production',
            icon: Factory,
            badge: productionBadgeCount > 0 ? productionBadgeCount : null
        },
        {
            id: 'MATERIAL_HOD',
            label: 'Material HOD',
            icon: UserCheck,
            badge: hodBadge > 0 ? hodBadge : null
        },
        { id: 'CUSTOMERS', label: 'Customer Module', icon: Users },
        { id: 'SALES', label: 'Sales & Dispatch', icon: ShoppingBag },
        { id: 'MATERIALS', label: 'Material Master', icon: Database },
        { id: 'SUPPLIERS', label: 'Supplier Master', icon: Truck },
        { id: 'REPORTS', label: 'Reports & Logs', icon: FileText },
        { id: 'USERS', label: 'User Management', icon: Settings }, // Admin Only managed by ROLE_ACCESS or filter
    ];

    // Filter Menu Items based on Role or Custom Access
    const visibleMenuItems = menuItems.filter(item => {
        if (!user) return false;

        // Custom Access Override (DB Column allowed_modules)
        if (user.allowed_modules && user.allowed_modules.length > 0) {
            // Support explicit 'ALL' or specific IDs
            if (user.allowed_modules.includes('ALL')) return true;
            return user.allowed_modules.includes(item.id);
        }

        // Fallback to Default Role Access
        if (user.role === 'ADMIN') return true;
        const allowed = ROLE_ACCESS[user.role] || [];
        return allowed.includes(item.id);
    });

    return (
        <>
            {/* Mobile Overlay */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm transition-opacity"
                    onClick={toggleSidebar}
                />
            )}

            {/* Sidebar Container */}
            <aside
                className={`w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 shadow-xl z-50 transition-transform duration-300 ease-in-out 
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} lg:translate-x-0`}
            >
                {/* Logo Area */}
                <div className="p-6 border-b border-slate-800 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-500 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-brand-500/20">
                            A
                        </div>
                        <div>
                            <h1 className="font-bold text-lg tracking-tight">AVANTI</h1>
                            <p className="text-xs text-slate-400 font-medium">Digitalisation App</p>
                        </div>
                    </div>
                </div>

                {/* Navigation */}
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto custom-scrollbar">
                    <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">
                        Main Menu ({user?.role || 'User'})
                    </div>
                    {visibleMenuItems.map((item) => (
                        <button
                            key={item.id}
                            onClick={() => {
                                setActiveTab(item.id);
                                if (window.innerWidth < 1024) toggleSidebar(); // Close on mobile click
                            }}
                            className={`w-full flex items-center justify-between px-4 py-3.5 rounded-xl transition-all duration-200 group relative ${activeTab === item.id
                                ? 'bg-brand-600 text-white shadow-lg shadow-brand-900/20'
                                : 'text-slate-400 hover:bg-slate-800 hover:text-white'
                                }`}
                        >
                            <div className="flex items-center gap-3">
                                <item.icon
                                    size={20}
                                    className={`transition-transform duration-200 ${activeTab === item.id ? 'scale-110' : 'group-hover:scale-110'
                                        }`}
                                />
                                <span className="font-medium text-sm">{item.label}</span>
                            </div>

                            {/* Badge */}
                            {item.badge && (
                                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white shadow-sm">
                                    {item.badge > 9 ? '9+' : item.badge}
                                </span>
                            )}

                            {activeTab === item.id && (
                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-white rounded-r-full" />
                            )}
                        </button>
                    ))}
                </nav>

                {/* User Profile */}
                <div className="p-4 border-t border-slate-800 bg-slate-900/50">
                    <div className="flex items-center gap-3 px-2 mb-3">
                        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-brand-600 flex items-center justify-center text-sm font-bold shadow-lg">
                            {user?.fullName?.charAt(0) || user?.username?.charAt(0) || 'U'}
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold truncate">{user?.fullName || user?.username || 'User'}</p>
                            <p className="text-xs text-slate-400 truncate">{user?.role || 'Operator'}</p>
                        </div>
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={onChangePassword}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors border border-slate-700 hover:border-slate-600"
                            title="Change Password"
                        >
                            <Key size={14} /> Password
                        </button>
                        <button
                            onClick={logout}
                            className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-medium text-red-400 hover:text-white hover:bg-red-600/20 rounded-lg transition-colors border border-slate-700 hover:border-red-900/50"
                            title="Sign Out"
                        >
                            Sign Out
                        </button>
                    </div>

                    {user?.role === 'ADMIN' && <ClearDataButton />}
                </div>
            </aside>
        </>
    );
};

export default Sidebar;
