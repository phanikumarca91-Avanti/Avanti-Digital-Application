import React, { useState, useEffect, useRef } from 'react';
import { Search, X, ChevronDown } from 'lucide-react';

const SearchableSelect = ({ label, value, onChange, options = [], placeholder, name, required }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filteredOptions, setFilteredOptions] = useState([]);
    const wrapperRef = useRef(null);

    const [visibleCount, setVisibleCount] = useState(50);

    const normalizedOptions = React.useMemo(() => {
        return options.map(opt => {
            if (typeof opt === 'string') return { name: opt };
            // Auto-map entityName to name for Suppliers
            if (opt.entityName && !opt.name) return { ...opt, name: opt.entityName };
            // Auto-map label to name for standard Select options
            if (opt.label && !opt.name) return { ...opt, name: opt.label };
            return opt;
        });
    }, [options]);

    useEffect(() => {
        // Initialize filtered options
        setFilteredOptions(normalizedOptions.slice(0, visibleCount));
    }, [normalizedOptions]);

    useEffect(() => {
        // Debounce the filtering logic to prevent UI freezing with large datasets
        const timer = setTimeout(() => {
            if (searchTerm) {
                const lower = searchTerm.toLowerCase();
                const filtered = normalizedOptions.filter(opt =>
                    opt.name && typeof opt.name === 'string' && opt.name.toLowerCase().includes(lower)
                );
                setFilteredOptions(filtered.slice(0, visibleCount));
            } else {
                setFilteredOptions(normalizedOptions.slice(0, visibleCount));
            }
        }, 300); // 300ms delay

        return () => clearTimeout(timer);
    }, [searchTerm, normalizedOptions, visibleCount]);

    const handleScroll = (e) => {
        const { scrollTop, scrollHeight, clientHeight } = e.target;
        if (scrollTop + clientHeight >= scrollHeight - 10) {
            setVisibleCount(prev => prev + 50);
        }
    };

    // Reset visible count when search changes
    useEffect(() => {
        setVisibleCount(50);
    }, [searchTerm]);

    useEffect(() => {
        // Click outside to close
        function handleClickOutside(event) {
            if (wrapperRef.current && !wrapperRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        }
        document.addEventListener("mousedown", handleClickOutside);
        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
        };
    }, [wrapperRef]);

    const handleSelect = (option) => {
        onChange({ target: { name, value: option.value || option.name } });
        setSearchTerm(''); // Reset search? Or keep it? Usually keep it or set to name.
        setIsOpen(false);
    };

    return (
        <div className="space-y-1.5" ref={wrapperRef}>
            <label className="block text-sm font-semibold text-slate-700">
                {label}
            </label>
            <div className="relative">
                <div
                    className="flex items-center w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl focus-within:ring-2 focus-within:ring-brand-500/20 focus-within:border-brand-500 transition-all cursor-text"
                    onClick={() => setIsOpen(true)}
                >
                    <Search size={18} className="text-slate-400 mr-2 flex-shrink-0" />
                    <input
                        type="text"
                        className="w-full bg-transparent outline-none text-slate-700 placeholder:text-slate-400"
                        placeholder={placeholder}
                        value={isOpen ? searchTerm : value}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            if (!isOpen) setIsOpen(true);
                        }}
                        onFocus={() => setIsOpen(true)}
                    />
                    {value && !isOpen && (
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onChange({ target: { name, value: '' } });
                            }}
                            className="text-slate-400 hover:text-slate-600 ml-2"
                        >
                            <X size={16} />
                        </button>
                    )}
                    <ChevronDown size={16} className={`text-slate-400 ml-2 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
                </div>

                {isOpen && (
                    <div
                        className="absolute z-50 w-full mt-2 bg-white rounded-xl shadow-xl border border-slate-100 max-h-96 overflow-y-auto"
                        onScroll={handleScroll}
                    >
                        {filteredOptions.length > 0 ? (
                            <>
                                {filteredOptions.map((opt, idx) => (
                                    <button
                                        key={idx}
                                        className="w-full text-left px-4 py-3 hover:bg-slate-50 text-sm text-slate-700 border-b border-slate-50 last:border-0 transition-colors flex flex-col min-h-[48px] justify-center"
                                        onClick={() => handleSelect(opt)}
                                    >
                                        <span className="font-medium">{opt.name}</span>
                                        {opt.code && <span className="text-xs text-slate-400">{opt.code}</span>}
                                        {opt.address && <span className="text-xs text-slate-400 truncate">{opt.address}</span>}
                                    </button>
                                ))}
                                {filteredOptions.length < (searchTerm ? normalizedOptions.filter(opt => opt.name && typeof opt.name === 'string' && opt.name.toLowerCase().includes(searchTerm.toLowerCase())).length : normalizedOptions.length) && (
                                    <div className="px-4 py-2 text-xs text-center text-slate-400">
                                        Loading more...
                                    </div>
                                )}
                            </>
                        ) : (
                            <div className="px-4 py-3 text-sm text-slate-400 text-center">
                                No results found
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div >
    );
};

export default SearchableSelect;
