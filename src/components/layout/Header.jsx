import React from 'react';
import { Bell, Search, Settings, MapPin, ChevronDown, Menu } from 'lucide-react';
import { useOrganization } from '../../contexts/OrganizationContext';
import BackupRestoreControl from '../shared/BackupRestoreControl';
import DataMigration from '../admin/DataMigration';
import { OfflineIndicator } from '../shared/OfflineIndicator';
import { SyncStatusPanel } from '../shared/SyncStatusPanel';

const Header = ({ activeTab, toggleSidebar }) => {
    const [showSyncPanel, setShowSyncPanel] = React.useState(false);
    const { currentLocation, currentUnit, changeLocation, changeUnit, locations } = useOrganization();

    const getTitle = () => {
        switch (activeTab) {
            case 'SECURITY': return { title: 'Security Gate', subtitle: 'Vehicle Entry & Exit Management' };
            case 'QC': return { title: 'Quality Control', subtitle: 'Material Inspection & Lab Testing' };
            case 'WEIGHBRIDGE': return { title: 'Weighbridge', subtitle: 'Gross & Tare Weight Recording' };
            case 'WAREHOUSE': return { title: 'Warehouse Operations', subtitle: 'Bay Allocation & Unloading' };
            case 'ERP': return { title: 'ERP Authorization', subtitle: 'Documentation & Final Approval' };
            case 'REPORTS': return { title: 'Reports & Logs', subtitle: 'Audit Trails & Vehicle Tracking' };
            default: return { title: 'Dashboard', subtitle: 'Overview' };
        }
    };

    const { title, subtitle } = getTitle();

    return (
        <header className="h-20 px-8 flex items-center justify-between bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-10 transition-all duration-300">
            <div className="flex items-center gap-4">
                <button
                    onClick={toggleSidebar}
                    className="p-2 -ml-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg lg:hidden transition-colors"
                >
                    <Menu size={24} />
                </button>
                <div>
                    <h2 className="text-2xl font-bold text-slate-800 tracking-tight">{title}</h2>
                    <p className="text-sm text-slate-500 font-medium">{subtitle}</p>
                </div>
            </div>

            <div className="flex items-center gap-6">
                {/* Location Selector */}
                <div className="flex items-center gap-3 bg-slate-100 rounded-lg p-1.5 pr-4 border border-slate-200">
                    <div className="bg-white p-2 rounded-md shadow-sm text-brand-600">
                        <MapPin size={18} />
                    </div>
                    <div className="flex flex-col">
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-bold">Current Location</span>
                        <div className="flex items-center gap-2">
                            <select
                                value={currentLocation.id}
                                onChange={(e) => changeLocation(e.target.value)}
                                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer hover:text-brand-600"
                            >
                                {locations.map(loc => (
                                    <option key={loc.id} value={loc.id}>{loc.name}</option>
                                ))}
                            </select>
                            <span className="text-slate-300">/</span>
                            <select
                                value={currentUnit.id}
                                onChange={(e) => changeUnit(e.target.value)}
                                className="bg-transparent text-sm font-bold text-slate-700 outline-none cursor-pointer hover:text-brand-600"
                            >
                                {currentLocation.units.map(unit => (
                                    <option key={unit.id} value={unit.id}>{unit.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>
                </div>

                {/* Offline Indicator */}
                <div onClick={() => setShowSyncPanel(true)} className="cursor-pointer hover:bg-slate-50 rounded-lg transition-colors p-1" title="Click to view sync status">
                    <OfflineIndicator />
                </div>

                <SyncStatusPanel isOpen={showSyncPanel} onClose={() => setShowSyncPanel(false)} />

                <div className="h-8 w-px bg-slate-200"></div>

                {/* Actions */}
                <div className="flex items-center gap-3">
                    <button className="p-2 text-slate-400 hover:text-brand-600 hover:bg-brand-50 rounded-full transition-colors relative">
                        <Bell size={20} />
                        <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                    </button>
                    <button className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-full transition-colors">
                        <Settings size={20} />
                    </button>
                    <BackupRestoreControl />
                    <DataMigration />
                    <div className="w-8 h-8 rounded-full bg-brand-100 flex items-center justify-center text-brand-700 font-bold text-sm border-2 border-white shadow-sm">
                        JD
                    </div>
                </div>
            </div>
        </header>
    );
};

export default Header;
