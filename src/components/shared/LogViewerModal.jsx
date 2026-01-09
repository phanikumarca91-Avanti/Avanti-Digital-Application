import React from 'react';
import { X, History, User, Clock, Activity } from 'lucide-react';

const LogViewerModal = ({ isOpen, onClose, logs = [], title = "Audit Logs" }) => {
    if (!isOpen) return null;

    // Sort logs by timestamp descending (newest first)
    const sortedLogs = [...logs].sort((a, b) => new Date(b.timestamp || b.time) - new Date(a.timestamp || a.time));

    return (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full overflow-hidden flex flex-col max-h-[80vh]">
                {/* Header */}
                <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                    <h3 className="font-bold text-lg text-slate-800 flex items-center gap-2">
                        <History className="text-brand-600" size={20} />
                        {title}
                    </h3>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-slate-200 rounded-full transition-colors text-slate-500"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="p-0 overflow-y-auto">
                    {sortedLogs.length === 0 ? (
                        <div className="p-12 text-center text-slate-400 flex flex-col items-center">
                            <History size={48} className="mb-4 opacity-20" />
                            <p>No audit logs found for this entry.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {sortedLogs.map((log, index) => (
                                <div key={index} className="p-4 hover:bg-slate-50 transition-colors flex gap-4">
                                    <div className="flex-shrink-0 mt-1">
                                        <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">
                                            <Activity size={14} />
                                        </div>
                                    </div>
                                    <div className="flex-1 space-y-1">
                                        <div className="flex justify-between items-start">
                                            <span className="font-bold text-slate-800 text-sm">
                                                {log.action}
                                            </span>
                                            <span className="text-[10px] uppercase font-bold tracking-wider text-slate-400 bg-slate-100 px-2 py-0.5 rounded-full">
                                                {log.stage || 'SYSTEM'}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-4 text-xs text-slate-500">
                                            <span className="flex items-center gap-1">
                                                <Clock size={12} />
                                                {new Date(log.timestamp || log.time).toLocaleString()}
                                            </span>
                                            <span className="flex items-center gap-1">
                                                <User size={12} />
                                                {log.user || 'System'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="bg-slate-50 px-6 py-3 border-t border-slate-200 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 bg-white border border-slate-300 shadow-sm text-slate-700 font-medium rounded-lg hover:bg-slate-50 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LogViewerModal;
