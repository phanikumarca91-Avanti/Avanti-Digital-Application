import React, { createContext, useContext, useState, useEffect } from 'react';
import { MASTER_DATA } from '../data/masterData';
import { MASTER_BAYS } from '../data/masterBays';
import { INITIAL_STOCK_DATA } from '../data/initialStockData';
import { calculateBags } from '../utils/bagCalculator';

const WarehouseContext = createContext();

export const useWarehouse = () => {
    const context = useContext(WarehouseContext);
    if (!context) {
        throw new Error('useWarehouse must be used within a WarehouseProvider');
    }
    return context;
};

export const WarehouseProvider = ({ children }) => {
    // 1. Warehouse Bays (Storage) - Large Capacity (~6760)
    const [bays, setBays] = useState(() => {
        try {
            const saved = localStorage.getItem('warehouse_bays_v5');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Check if saved data looks migrated (has new ID format)
                // If saved data is from Mock (old IDs), we should probably discard it
                // But user just cleared data, so likely empty or safe.
                return parsed.map(b => ({
                    ...b,
                    status: (b.status || 'EMPTY').toUpperCase()
                }));
            }
        } catch (e) {
            console.error("Failed to parse warehouse_bays", e);
        }

        // Initialize from MASTER_BAYS (Real Data)
        const stockMap = new Map();
        INITIAL_STOCK_DATA.forEach(stock => {
            if (stock.bayIds) {
                // If the stock has specific bays assigned (from CSV or otherwise)
                // Note: The CSV had 'BAY Number' which mapped to bayId
                // We need to check if the mocked bay matches the stock's bay
                // For now, let's look for exact matches or derived matches
                // In ProductionContext we merged this, but here we need to mirror it.
            }
        });

        const normalizeBay = (b) => {
            // Check if this bay has multiple lots from INITIAL_STOCK_DATA
            // A bay can store multiple lots simultaneously (no capacity limit currently)
            const stocksInBay = INITIAL_STOCK_DATA.filter(s => s.assignedBay === b.id);

            let status = (b.status || 'EMPTY').toUpperCase();
            let material = b.material || null;
            let qty = b.qty || 0;
            let batchId = null;
            let grade = null;
            let shift = null;
            let totalBags = 0;

            if (stocksInBay.length > 0) {
                status = 'OCCUPIED';

                // Aggregate quantities from all lots in this bay and round to 3 decimals
                qty = parseFloat(
                    stocksInBay.reduce((sum, stock) => sum + parseFloat(stock.qty || 0), 0).toFixed(3)
                );

                // Aggregate bags: Calculate bags for EACH lot and sum them up
                // This is critical for bays with mixed bag weights (e.g. 1kg and 25kg)
                totalBags = stocksInBay.reduce((sum, stock) => {
                    const lotQty = parseFloat(stock.qty || 0);
                    const lotBags = calculateBags(lotQty, stock.productName, stock.grade);
                    return sum + lotBags;
                }, 0);

                // For material/grade, prioritize first lot or combine
                // If multiple different products, combine names
                const uniqueProducts = [...new Set(stocksInBay.map(s => s.productName))];
                material = uniqueProducts.length === 1
                    ? uniqueProducts[0]
                    : uniqueProducts.join(' + ');

                // For grade, use first lot's grade (or combine if needed)
                const uniqueGrades = [...new Set(stocksInBay.map(s => s.grade).filter(Boolean))];
                grade = uniqueGrades.length === 1
                    ? uniqueGrades[0]
                    : uniqueGrades.join(' + ');

                // For batch ID, deduplicate lot numbers
                const lotNumbers = [...new Set(stocksInBay.map(s => s.lotNumber).filter(Boolean))];
                batchId = lotNumbers.join(', ');

                // For shift, deduplicate and combine all shifts
                const shifts = [...new Set(stocksInBay.map(s => s.shift).filter(Boolean))];
                shift = shifts.join(', ');
            }

            return {
                id: b.id,
                name: b.name || b.id,
                unit: b.unit,
                type: 'BAY', // Force system type to BAY for storage
                originalType: b.type, // Keep original type for reference if needed
                status: status,
                material: material,
                grade: grade, // Add grade field for bag calculation
                shift: shift, // Add shift field from production
                qty: qty,
                totalBags: totalBags, // Return aggregated bags
                lots: stocksInBay, // Keep individual lots for detailed reporting
                batchId: batchId,
                uom: b.uom || 'MT',
                lastUpdated: b.lastUpdated || new Date().toISOString()
            };
        };

        return MASTER_BAYS.map(normalizeBay);
    });

    // 2. Production Bins (Staging) - Limited (~81)
    // 2. Production Bins (Staging) - Limited (~81)
    const [productionBins, setProductionBins] = useState(() => {
        let savedBins = [];
        try {
            const saved = localStorage.getItem('production_bins_v2');
            if (saved) {
                const parsed = JSON.parse(saved);
                // Self-healing: Remove any RMFK/FGFK items that might have polluted this state
                savedBins = parsed.filter(b => !b.id.startsWith('RMFK') && !b.id.startsWith('FGFK'));
            }
        } catch (e) {
            console.error("Failed to parse production_bins", e);
        }

        // Initialize from MASTER_DATA (U1KVRB...)
        // Merge Logic: Always use MASTER_DATA as the source of truth for *which* bins exist.
        // If a bin from MASTER_DATA exists in savedBins, use its status/qty.
        // If not, it defaults to EMPTY.
        const masterBins = MASTER_DATA.BIN_NAME_MASTERS || [];

        return masterBins.map(masterBin => {
            const savedBin = savedBins.find(sb => sb.id === masterBin.name);

            if (savedBin) {
                // Return saved state (with updated static props from master just in case)
                return {
                    ...savedBin,
                    name: masterBin.name, // Ensure name is correct
                    unit: masterBin.unit, // Ensure unit is correct
                    type: 'BIN' // Ensure type is correct
                };
            }

            // Default new bin
            return {
                id: masterBin.name,
                name: masterBin.name,
                unit: masterBin.unit,
                type: 'BIN',
                status: 'EMPTY',
                material: null,
                qty: 0,
                uom: 'KGS',
                lastUpdated: new Date().toISOString()
            };
        });
    });

    const [mrs, setMrs] = useState(() => {
        try {
            const saved = localStorage.getItem('production_mrs');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse production_mrs", e);
            return [];
        }
    });

    // Mock Inward Vehicles for "Inward Bay Assignment"
    const [inwardVehicles, setInwardVehicles] = useState(() => {
        try {
            const saved = localStorage.getItem('inward_vehicles_mock');
            return saved ? JSON.parse(saved) : [];
        } catch (e) {
            console.error("Failed to parse inward_vehicles_mock", e);
            return [];
        }
    });

    // Persist Warehouse Bays
    useEffect(() => {
        localStorage.setItem('warehouse_bays_v5', JSON.stringify(bays));
    }, [bays]);

    useEffect(() => {
        localStorage.setItem('production_bins_v2', JSON.stringify(productionBins));
        localStorage.setItem('production_mrs', JSON.stringify(mrs));
        localStorage.setItem('inward_vehicles_mock', JSON.stringify(inwardVehicles));
    }, [productionBins, mrs, inwardVehicles]);

    const getBinsByUnit = (unitName, type = 'ALL') => {
        if (!unitName) return [];
        const normalizedInput = unitName.toLowerCase().replace('fdb', 'bandapuram').replace('banapuram', 'bandapuram').replace('bandpauram', 'bandapuram');

        let source = [];
        if (type === 'BAY') source = bays;
        else if (type === 'BIN') source = productionBins;
        else source = [...bays, ...productionBins];

        return source.filter(b => {
            // Strict type check if specific type requested (Double safety against pollution)
            if (type !== 'ALL' && b.type && b.type !== type) return false;

            const normalizedBinUnit = (b.unit || '').toLowerCase().replace('fdb', 'bandapuram').replace('banapuram', 'bandapuram').replace('bandpauram', 'bandapuram');
            return normalizedBinUnit.includes(normalizedInput) || normalizedInput.includes(normalizedBinUnit);
        });
    };

    const updateBinStatus = (binId, status, material = null, qty = 0, uom = 'KGS') => {
        // Try to update in Bays first
        let foundInBays = false;
        const newBays = bays.map(bin => {
            if (bin.id === binId) {
                foundInBays = true;
                return { ...bin, status, material, qty, uom, lastUpdated: new Date().toISOString() };
            }
            return bin;
        });

        if (foundInBays) {
            setBays(newBays);
            return;
        }

        // If not in Bays, update in Production Bins
        setProductionBins(prev => prev.map(bin => {
            if (bin.id === binId) {
                return { ...bin, status, material, qty, uom, lastUpdated: new Date().toISOString() };
            }
            return bin;
        }));
    };

    const createMR = (mrData) => {
        const newMR = { ...mrData, status: 'PENDING_BAY_ASSIGNMENT', createdAt: new Date().toISOString() };
        setMrs(prev => [newMR, ...prev]);
        return newMR.id;
    };

    const assignBayToMR = (mrId, itemsWithBays) => {
        setMrs(prev => prev.map(mr => {
            if (mr.id === mrId) {
                return { ...mr, items: itemsWithBays, status: 'PENDING_DUMPING' };
            }
            return mr;
        }));
    };

    const updateBinStock = (binId, qty, material, operation, grade = null) => {
        const updateLogic = (prev) => prev.map(bin => {
            if (bin.id === binId) {
                let newQty = parseFloat(bin.qty || 0);
                if (operation === 'ADD') {
                    newQty += parseFloat(qty);
                    return {
                        ...bin,
                        status: 'OCCUPIED',
                        material,
                        grade: grade || bin.grade, // Preserve grade if provided
                        qty: newQty,
                        lastUpdated: new Date().toISOString()
                    };
                } else if (operation === 'REMOVE') {
                    newQty -= parseFloat(qty);
                    if (newQty <= 0) {
                        return { ...bin, status: 'EMPTY', material: null, grade: null, qty: 0, lastUpdated: new Date().toISOString() };
                    }
                    return { ...bin, qty: newQty, lastUpdated: new Date().toISOString() };
                } else if (operation === 'SET') {
                    newQty = parseFloat(qty);
                    if (newQty <= 0) {
                        return { ...bin, status: 'EMPTY', material: null, grade: null, qty: 0, lastUpdated: new Date().toISOString() };
                    }
                    return {
                        ...bin,
                        qty: newQty,
                        status: 'OCCUPIED',
                        grade: grade || bin.grade, // Preserve grade if provided
                        lastUpdated: new Date().toISOString()
                    };
                }
            }
            return bin;
        });

        // Check if it's a Bay or Bin (optimization: check ID pattern or just try both)
        // RMFK is Bay, U1KVRB is Bin usually. But safer to try both or pass type.
        // For now, we'll try to find it in Bays first.
        const isBay = bays.some(b => b.id === binId);
        if (isBay) {
            setBays(prev => updateLogic(prev));
        } else {
            setProductionBins(prev => updateLogic(prev));
        }
    };

    const closeMR = (mrId, receivedItems) => {
        setMrs(prev => prev.map(mr => {
            if (mr.id === mrId) {
                return { ...mr, status: 'CLOSED', receivedItems, closedAt: new Date().toISOString() };
            }
            return mr;
        }));
    };

    const getOpenMRs = () => mrs.filter(mr => mr.status !== 'CLOSED');

    const getAllMRs = () => mrs;

    const consumeBins = (binIds) => {
        // Production usually consumes from Bins
        setProductionBins(prev => prev.map(bin => {
            if (binIds.includes(bin.id)) {
                return {
                    ...bin,
                    status: 'EMPTY',
                    material: null,
                    qty: 0,
                    uom: 'KGS',
                    lastUpdated: new Date().toISOString()
                };
            }
            return bin;
        }));
    };

    const getPendingInwardVehicles = () => {
        return inwardVehicles.filter(v => v.status === 'AT_WAREHOUSE' || v.status === 'QC_APPROVED');
    };

    const getAllVehicles = () => inwardVehicles;

    const assignInwardBay = (vehicleId, bayId) => {
        setInwardVehicles(prev => prev.map(v => {
            if (v.id === vehicleId) {
                return { ...v, status: 'BAY_ASSIGNED', assignedBay: bayId, updatedAt: new Date().toISOString() };
            }
            return v;
        }));
    };

    const seedBins = () => {
        // Seed some RMFK bays with material
        setBays(prev => prev.map((bin, index) => {
            if (index === 0) return { ...bin, status: 'OCCUPIED', material: 'FISH MEAL IND', qty: 5000, uom: 'KGS', lastUpdated: new Date().toISOString() };
            if (index === 1) return { ...bin, status: 'OCCUPIED', material: 'MANAMEI - 2', qty: 2000, uom: 'KGS', lastUpdated: new Date().toISOString() };
            if (index === 2) return { ...bin, status: 'OCCUPIED', material: 'SOYA DOC', qty: 10000, uom: 'KGS', lastUpdated: new Date().toISOString() };
            return bin;
        }));

        // Reset Production Bins to EMPTY
        setProductionBins(prev => prev.map(bin => ({
            ...bin,
            status: 'EMPTY',
            material: null,
            qty: 0,
            uom: 'KGS',
            lastUpdated: new Date().toISOString()
        })));
    };

    const value = {
        bays,
        productionBins,
        mrs,
        getBinsByUnit,
        updateBinStatus,
        createMR,
        assignBayToMR,
        updateBinStock,
        closeMR,
        getOpenMRs,
        getAllMRs,
        consumeBins,
        getPendingInwardVehicles,
        getAllVehicles,
        assignInwardBay,
        seedBins
    };

    return (
        <WarehouseContext.Provider value={value}>
            {children}
        </WarehouseContext.Provider>
    );
};
