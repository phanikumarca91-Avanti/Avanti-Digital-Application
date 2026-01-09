import React, { useState } from 'react';
import { X, BookOpen, ChevronRight, HelpCircle } from 'lucide-react';
import { USER_MANUALS } from '../../data/userManuals';

const UserManualModal = ({ isOpen, onClose, module }) => {
    const manual = USER_MANUALS[module];
    const [activeSection, setActiveSection] = useState(0);

    if (!isOpen || !manual) return null;

    return (
        <div className="fixed inset-0 z-50 flex justify-end">
            {/* Backdrop */}
            <div
                className="absolute inset-0 bg-black/30 backdrop-blur-sm transition-opacity"
                onClick={onClose}
            ></div>

            {/* Slide-over Panel */}
            <div className="relative w-full max-w-md bg-white h-full shadow-2xl flex flex-col animate-slide-in-right">
                {/* Header */}
                <div className="p-6 bg-brand-600 text-white flex justify-between items-start">
                    <div>
                        <div className="flex items-center gap-2 opacity-90 mb-1">
                            <BookOpen size={16} />
                            <span className="text-xs font-bold uppercase tracking-wider">User Manual</span>
                        </div>
                        <h2 className="text-xl font-bold leading-tight">{manual.title}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1 hover:bg-white/20 rounded-full transition-colors"
                    >
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto">
                    <div className="p-6 space-y-8">
                        {manual.sections.map((section, index) => (
                            <div key={index} className="scroll-mt-6">
                                <h3 className="text-lg font-bold text-slate-800 mb-3 flex items-center gap-2">
                                    {section.title}
                                </h3>
                                <div
                                    className="prose prose-sm prose-slate bg-slate-50 p-4 rounded-xl border border-slate-100"
                                    dangerouslySetInnerHTML={{ __html: section.content }}
                                />
                            </div>
                        ))}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-slate-100 bg-slate-50 text-center text-xs text-slate-400">
                    Avanti Feeds Digital System • v1.0
                </div>
            </div>
        </div>
    );
};

export default UserManualModal;
