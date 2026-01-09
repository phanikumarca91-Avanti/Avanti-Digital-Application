import React, { createContext, useContext, useState, useEffect } from 'react';
import { INITIAL_STOCK_DATA } from '../data/initialStockData';

const ProductionContext = createContext();

export const useProduction = () => {
    const context = useContext(ProductionContext);
    if (!context) {
        throw new Error('useProduction must be used within a ProductionProvider');
    }
    return context;
};

// Unit Code Mapping
export const UNIT_CODES = {
    'Unit-1': 'K1',
    'Unit-2': 'K2',
    'Unit-3': 'K3',
    'FDB Plant-1': 'B4',
    'FDB Plant-2': 'B5',
    'FDB Plant-3': 'B6'
};

export const ORG_STRUCTURE = {
    AP_DIVISION: {
        id: 'AP',
        label: 'AP Division',
        regions: {
            KVR: {
                id: 'KVR',
                label: 'Kovvur Region',
                units: ['Unit-1', 'Unit-2', 'Unit-3']
            },
            BDP: {
                id: 'BDP',
                label: 'Bandapuram Region',
                units: ['FDB Plant-1', 'FDB Plant-2', 'FDB Plant-3']
            }
        }
    }
};



export const ProductionProvider = ({ children }) => {
    const [lots, setLots] = useState(() => {
        const saved = localStorage.getItem('production_lots');
        const savedLots = saved ? JSON.parse(saved) : [];

        // Merge initial stock data, avoiding duplicates
        const existingIds = new Set(savedLots.map(l => l.id));
        const newLots = INITIAL_STOCK_DATA.filter(l => !existingIds.has(l.id));

        return [...savedLots, ...newLots];
    });

    // Sequence Counters: { "2526-K1": 1000, "2526-K2": 1005 }
    const [sequences, setSequences] = useState(() => {
        const saved = localStorage.getItem('lot_sequences');
        return saved ? JSON.parse(saved) : {};
    });

    useEffect(() => {
        localStorage.setItem('production_lots', JSON.stringify(lots));
    }, [lots]);

    useEffect(() => {
        localStorage.setItem('lot_sequences', JSON.stringify(sequences));
    }, [sequences]);

    // Helper to get FY Prefix and Unit Code
    const getLotPrefixDetails = (unitName, dateObj) => {
        const year = dateObj.getFullYear();
        const month = dateObj.getMonth();
        let fyPrefix = "";

        if (month >= 3) { // April onwards
            const y1 = year.toString().slice(2);
            const y2 = (year + 1).toString().slice(2);
            fyPrefix = `${y1}${y2}`;
        } else {
            const y1 = (year - 1).toString().slice(2);
            const y2 = year.toString().slice(2);
            fyPrefix = `${y1}${y2}`;
        }

        let unitCode = "XX";
        const cleanUnitName = unitName.replace('Kovvur ', '').replace('Bandapuram ', '');
        if (UNIT_CODES[cleanUnitName]) {
            unitCode = UNIT_CODES[cleanUnitName];
        } else {
            const key = Object.keys(UNIT_CODES).find(k => unitName.includes(k));
            if (key) unitCode = UNIT_CODES[key];
        }

        return { fyPrefix, unitCode };
    };

    // Generate a single lot number (Atomic update needed if called multiple times, so prefer batch)
    const generateLotNumber = (unitName, dateObj = new Date()) => {
        const { fyPrefix, unitCode } = getLotPrefixDetails(unitName, dateObj);
        const seqKey = `${fyPrefix}-${unitCode}`;
        const currentSeq = sequences[seqKey] || 1000;
        const nextSeq = currentSeq + 1;
        const lotNumber = `${fyPrefix}${unitCode}${currentSeq}`;

        setSequences(prev => ({
            ...prev,
            [seqKey]: nextSeq
        }));

        return lotNumber;
    };

    // NEW: Generate Batch Lot Numbers to avoid async state issues
    const generateBatchLotNumbers = (unitName, dateObj = new Date(), count = 1) => {
        const { fyPrefix, unitCode } = getLotPrefixDetails(unitName, dateObj);
        const seqKey = `${fyPrefix}-${unitCode}`;
        let currentSeq = sequences[seqKey] || 1000;

        const newLotNumbers = [];
        for (let i = 0; i < count; i++) {
            newLotNumbers.push(`${fyPrefix}${unitCode}${currentSeq}`);
            currentSeq++;
        }

        // Update sequence state once with the final count
        setSequences(prev => ({
            ...prev,
            [seqKey]: currentSeq
        }));

        return newLotNumbers;
    };

    const addLot = (lotData) => {
        const newLot = {
            ...lotData,
            id: lotData.lotNumber,
            status: lotData.status || 'UNASSIGNED',
            createdAt: new Date().toISOString(),
            qcData: null
        };
        setLots(prev => [newLot, ...prev]);
    };

    // Batch add lots
    const addLots = (lotsData) => {
        const newLots = lotsData.map(data => ({
            ...data,
            id: data.lotNumber,
            status: data.status || 'UNASSIGNED',
            createdAt: new Date().toISOString(),
            qcData: null
        }));
        setLots(prev => [...newLots, ...prev]);
    };

    const updateLotDetails = (lotId, details) => {
        setLots(prev => prev.map(lot => {
            if (lot.id === lotId) {
                return {
                    ...lot,
                    ...details,
                    status: 'PENDING_QA',
                    updatedAt: new Date().toISOString()
                };
            }
            return lot;
        }));
    };

    const updateLotStatus = (lotId, status, qcData = null) => {
        setLots(prev => prev.map(lot => {
            if (lot.id === lotId) {
                return {
                    ...lot,
                    status,
                    qcData: qcData || lot.qcData,
                    updatedAt: new Date().toISOString()
                };
            }
            return lot;
        }));
    };

    const updateLotDocument = (lotId, docType, fileData) => {
        setLots(prev => prev.map(lot => {
            if (lot.id === lotId) {
                return {
                    ...lot,
                    documents: {
                        ...lot.documents,
                        [docType]: fileData
                    },
                    logs: [...(lot.logs || []), {
                        time: new Date().toLocaleString(),
                        action: `Uploaded document: ${fileData.name} (${docType})`,
                        stage: 'QC'
                    }]
                };
            }
            return lot;
        }));
    };

    const getLotsByStatus = (status) => {
        return lots.filter(lot => lot.status === status);
    };

    const value = {
        lots,
        addLot,
        addLots,
        updateLotDetails,
        updateLotStatus,
        updateLotDocument,
        getLotsByStatus,
        generateLotNumber,
        generateBatchLotNumbers,
        ORG_STRUCTURE
    };

    return (
        <ProductionContext.Provider value={value}>
            {children}
        </ProductionContext.Provider>
    );
};
