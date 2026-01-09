import React from 'react';
import { AlertTriangle, CheckCircle, X, Info } from 'lucide-react';

const Dialog = ({ isOpen, type = 'alert', message, onConfirm, onCancel }) => {
    if (!isOpen) return null;

    const isConfirm = type === 'confirm';

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 animate-in fade-in duration-200">
            {/* Backdrop */}
            <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm transition-opacity" onClick={onCancel} />

            {/* Modal Content */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all scale-100 animate-in zoom-in-95 duration-200">
                <div className={`h-2 w-full ${isConfirm ? 'bg-brand-500' : 'bg-accent-500'}`} />

                <div className="p-6">
                    <div className="flex items-start gap-4">
                        <div className={`flex-shrink-0 w-12 h-12 rounded-full flex items-center justify-center ${isConfirm ? 'bg-brand-50 text-brand-600' : 'bg-accent-50 text-accent-600'}`}>
                            {isConfirm ? <Info size={24} /> : <CheckCircle size={24} />}
                        </div>

                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-slate-900 mb-2">
                                {isConfirm ? 'Confirmation Required' : 'Notification'}
                            </h3>
                            <p className="text-slate-600 text-sm leading-relaxed">
                                {message}
                            </p>
                        </div>
                    </div>

                    <div className="mt-8 flex gap-3 justify-end">
                        {isConfirm && (
                            <button
                                onClick={onCancel}
                                className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
                            >
                                Cancel
                            </button>
                        )}
                        <button
                            onClick={onConfirm || onCancel}
                            className={`px-6 py-2 text-sm font-medium text-white rounded-lg shadow-lg shadow-brand-500/20 transition-transform active:scale-95 ${isConfirm
                                    ? 'bg-brand-600 hover:bg-brand-700'
                                    : 'bg-accent-600 hover:bg-accent-700'
                                }`}
                        >
                            {isConfirm ? 'Confirm Action' : 'Okay, Got it'}
                        </button>
                    </div>
                </div>

                <button onClick={onCancel} className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 transition-colors">
                    <X size={20} />
                </button>
            </div>
        </div>
    );
};

export default Dialog;
