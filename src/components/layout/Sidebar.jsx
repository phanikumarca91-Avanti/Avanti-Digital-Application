import React from 'react';
import { ShieldCheck, ClipboardCheck, Scale, Warehouse, Factory, FileText, Settings, LogOut, Database, Users, Truck, ShoppingBag, UserCheck } from 'lucide-react';
import { useWarehouse } from '../../contexts/WarehouseContext';
import { useProduction } from '../../contexts/ProductionContext';
import ClearDataButton from '../shared/ClearDataButton';

const Sidebar = ({ activeTab, setActiveTab, user, counts }) => {
    const { getOpenMRs, getPendingInwardVehicles } = useWarehouse();
    const { getLotsByStatus } = useProduction();

    // Calculate Badge Counts using props from App.jsx (Sync Source) or Context where appropriate

    // Security: Vehicles waiting for Exit or Rejected Entry
    const securityBadge = counts?.security || 0;

    // QC: QC1, QC2
    const qcBadge = counts?.qc || 0;

    // Weighbridge: WB1 (Gross) or WB2 (Tare)
    const weighbridgeBadge = counts?.weigh || 0;

    // ERP: Pending Documentation
    const erpBadge = counts?.erp || 0;

    // Material HOD: Pending Approval
    const hodBadge = counts?.hod || 0;

    // Warehouse: Pending Bay Assign (Inward - from App.jsx) + Pending Dumping (Production - from Context) + Pending FG Placement (Production - from Context)
    const openMRs = getOpenMRs();
    const pendingBayAssign = openMRs.filter(mr => mr.status === 'PENDING_BAY_ASSIGNMENT').length;
    const pendingInward = counts?.warehouse || 0; // Use App.jsx count for consistency
    const pendingFGPlacement = getLotsByStatus('PENDING_QA').length;
    const warehouseBadgeCount = pendingBayAssign + pendingInward + pendingFGPlacement;

    // Production: Pending Dumping + Unassigned Lots
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
    ];

    return (
        <div className="w-64 bg-slate-900 text-white flex flex-col h-screen fixed left-0 top-0 shadow-xl z-50">
            {/* Logo Area */}
            <div className="p-6 border-b border-slate-800 flex items-center gap-3">
                <div className="w-10 h-10 bg-brand-500 rounded-lg flex items-center justify-center font-bold text-xl shadow-lg shadow-brand-500/20">
                    A
                </div>
                <div>
                    <h1 className="font-bold text-lg tracking-tight">AVANTI Digitalisation</h1>
                    <p className="text-xs text-slate-400 font-medium">application (ADA)</p>
                </div>
            </div>

            {/* Navigation */}
            <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 px-2">
                    Main Menu
                </div>
                {menuItems.map((item) => (
                    <button
                        key={item.id}
                        onClick={() => setActiveTab(item.id)}
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
                            <span className="font-medium">{item.label}</span>
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
                        {user?.name?.charAt(0) || 'U'}
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-bold truncate">{user?.name || 'User'}</p>
                        <p className="text-xs text-slate-400 truncate">{user?.role || 'Operator'}</p>
                    </div>
                </div>
                <button className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
                    <LogOut size={14} /> Sign Out
                </button>
                <ClearDataButton />
            </div>
        </div>
    );
};

export default Sidebar;
