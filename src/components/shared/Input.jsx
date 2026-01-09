import React from 'react';

const Input = ({ label, type = "text", name, value, onChange, placeholder, className = "", readOnly = false }) => {
    // Prevent NaN warning for number inputs
    const displayValue = type === 'number' && (value === 0 || value === '0') ? '' : value;

    return (
        <div className={`flex flex-col gap-1.5 ${className}`}>
            {label && (
                <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider ml-1">
                    {label}
                </label>
            )}
            <input
                type={type}
                name={name}
                value={displayValue}
                onChange={(e) => {
                    let newValue = e.target.value;

                    // Force uppercase for text inputs
                    if (type === 'text' && newValue) {
                        newValue = newValue.toUpperCase();
                    }

                    // Validate Date Year (Max 4 digits)
                    if (type === 'date' && newValue) {
                        const year = newValue.split('-')[0];
                        if (year.length > 4) {
                            // If year is more than 4 digits, don't update (or truncate)
                            // Standard date inputs are tricky to control programmatically on typing, 
                            // but we can prevent setting state if it's invalid.
                            // However, browser implementation varies. 
                            // A better approach for date is usually max attribute, but let's try to slice.
                            const parts = newValue.split('-');
                            if (parts[0].length > 4) {
                                parts[0] = parts[0].slice(0, 4);
                                newValue = parts.join('-');
                            }
                        }
                    }

                    // Pass the modified event/value up
                    onChange({ ...e, target: { ...e.target, name, value: newValue } });
                }}
                placeholder={placeholder}
                readOnly={readOnly}
                max={type === 'date' ? "9999-12-31" : undefined}
                className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm text-slate-700 
                   placeholder-slate-400 transition-all duration-200
                   focus:outline-none focus:border-brand-500 focus:ring-4 focus:ring-brand-500/10
                   hover:border-slate-300 shadow-sm"
            />
        </div>
    );
};

export default Input;
