import React, { createContext, useContext, useState, useEffect, useRef, useMemo } from 'react';
import { MASTER_DATA } from '../data/masterData';
import { MASTER_BAYS } from '../data/masterBays';
import { INITIAL_STOCK_DATA } from '../data/initialStockData';
import { calculateBags } from '../utils/bagCalculator';
import { supabase } from '../lib/supabase';
import { warehouseDB } from '../lib/indexedDB';
import { syncManager as syncMgr } from '../lib/syncManager';

const WarehouseContext = createContext();

export const useWarehouse = () => {
    const context = useContext(WarehouseContext);
    if (!context) {
        throw new Error('useWarehouse must be used within a WarehouseProvider');
    }
    return context;
};

export const WarehouseProvider = ({ children }) => {
    // Refs to break infinite sync loops
    const updatingBaysFromCloud = useRef(false);
    const updatingBinsFromCloud = useRef(false);
    const updatingMrsFromCloud = useRef(false);

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
                // Data Consistency: Use Stock UOM if occupied, otherwise Master UOM
                uom: (stocksInBay.length > 0 && stocksInBay[0].uom) ? stocksInBay[0].uom : (b.uom || 'MT'),
                lastUpdated: b.lastUpdated || new Date().toISOString()
            };
        };

        return MASTER_BAYS.map(normalizeBay);
    });

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

    // 4. Cloud Sync (Load on Mount & Subscribe)
    useEffect(() => {
        const loadFromCloud = async () => {
            // Load Stock Items (Bays, Bins, MRs) from 'warehouse_stock'
            const { data: stockData, error: stockError } = await supabase.from('warehouse_stock').select('*').in('id', ['warehouse_bays_v5', 'production_bins_v2', 'production_mrs']);

            if (stockData && !stockError) {
                const cloudBays = stockData.find(d => d.id === 'warehouse_bays_v5')?.data;
                const cloudBins = stockData.find(d => d.id === 'production_bins_v2')?.data;
                const cloudMrs = stockData.find(d => d.id === 'production_mrs')?.data;

                if (cloudBays) {
                    setBays(cloudBays);
                    localStorage.setItem('warehouse_bays_v5', JSON.stringify(cloudBays));
                }
                if (cloudBins) {
                    setProductionBins(cloudBins);
                    localStorage.setItem('production_bins_v2', JSON.stringify(cloudBins));
                }
                if (cloudMrs) {
                    setMrs(cloudMrs);
                    localStorage.setItem('production_mrs', JSON.stringify(cloudMrs));
                }
            }

            // Load Inward Mock from 'master_data'
            const { data: masterData, error: masterError } = await supabase.from('master_data').select('value').eq('key', 'inward_vehicles_mock').single();
            if (masterData && !masterError && masterData.value) {
                setInwardVehicles(masterData.value);
                localStorage.setItem('inward_vehicles_mock', JSON.stringify(masterData.value));
            }
        };

        loadFromCloud();

        // Real-time Subscription
        const channel = supabase
            .channel('warehouse_stock_changes')
            .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'warehouse_stock' }, (payload) => {
                if (!payload.new) return;

                const { id, data } = payload.new;

                if (id === 'warehouse_bays_v5' && Array.isArray(data)) {
                    updatingBaysFromCloud.current = true;
                    setBays(data);
                    localStorage.setItem('warehouse_bays_v5', JSON.stringify(data));
                } else if (id === 'production_bins_v2' && Array.isArray(data)) {
                    updatingBinsFromCloud.current = true;
                    setProductionBins(data);
                    localStorage.setItem('production_bins_v2', JSON.stringify(data));
                } else if (id === 'production_mrs' && Array.isArray(data)) {
                    updatingMrsFromCloud.current = true;
                    setMrs(data);
                    localStorage.setItem('production_mrs', JSON.stringify(data));
                }
            })
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Persist Warehouse Bays


    // Self-Healing: Correct UOM Mismatches (MT -> KGS for RM Bays with large qty)
    useEffect(() => {
        let changed = false;
        const healedBays = bays.map(b => {
            // Heuristic: If Bay starts with RM, is Occupied, has > 50 qty, and shows MT -> likely corrupted UOM, force KGS
            if (b.id.startsWith('RM') && b.status === 'OCCUPIED' && b.qty > 50 && b.uom === 'MT') {
                changed = true;
                return { ...b, uom: 'KGS' };
            }
            return b;
        });

        if (changed) {
            console.log("🩹 Self-healed UOM mismatches in bays");
            setBays(healedBays);
        }
    }, [bays]);

    // Persist Warehouse Bays
    useEffect(() => {
        if (updatingBaysFromCloud.current) {
            updatingBaysFromCloud.current = false;
            return;
        }

        if (bays.length > 0) {
            localStorage.setItem('warehouse_bays_v5', JSON.stringify(bays));

            // Sync to cloud if online, otherwise queue
            if (navigator.onLine) {
                supabase.from('warehouse_stock').upsert({ id: 'warehouse_bays_v5', data: bays }).then();
                // Cache in IndexedDB
                warehouseDB.put({ id: 'warehouse_bays_v5', data: bays, synced: true }).catch(err =>
                    console.error('Failed to cache bays:', err)
                );
            } else {
                console.log('📴 Offline - queueing warehouse bays update');
                // Save to IndexedDB
                warehouseDB.put({ id: 'warehouse_bays_v5', data: bays, synced: false }).catch(err =>
                    console.error('Failed to cache bays offline:', err)
                );
                // Queue for sync
                syncMgr.queueOperation({
                    action: 'UPSERT',
                    table: 'warehouse_stock',
                    data: { id: 'warehouse_bays_v5', data: bays }
                });
            }
        }
    }, [bays]);

    useEffect(() => {
        if (updatingBinsFromCloud.current) {
            updatingBinsFromCloud.current = false;
        } else if (productionBins.length > 0) {
            localStorage.setItem('production_bins_v2', JSON.stringify(productionBins));

            if (navigator.onLine) {
                supabase.from('warehouse_stock').upsert({ id: 'production_bins_v2', data: productionBins }).then();
            } else {
                console.log('📴 Offline - queueing production bins update');
                syncMgr.queueOperation({
                    action: 'UPSERT',
                    table: 'warehouse_stock',
                    data: { id: 'production_bins_v2', data: productionBins }
                });
            }
        }

        if (updatingMrsFromCloud.current) {
            updatingMrsFromCloud.current = false;
        } else if (mrs.length > 0 || mrs.length === 0) {
            localStorage.setItem('production_mrs', JSON.stringify(mrs));

            if (navigator.onLine) {
                supabase.from('warehouse_stock').upsert({ id: 'production_mrs', data: mrs }).then();
            } else {
                console.log('📴 Offline - queueing MRS update');
                syncMgr.queueOperation({
                    action: 'UPSERT',
                    table: 'warehouse_stock',
                    data: { id: 'production_mrs', data: mrs }
                });
            }
        }

        if (inwardVehicles) {
            localStorage.setItem('inward_vehicles_mock', JSON.stringify(inwardVehicles));

            if (navigator.onLine) {
                supabase.from('master_data').upsert({ key: 'inward_vehicles_mock', value: inwardVehicles }).then();
            } else {
                console.log('📴 Offline - queueing inward vehicles update');
                syncMgr.queueOperation({
                    action: 'UPSERT',
                    table: 'master_data',
                    data: { key: 'inward_vehicles_mock', value: inwardVehicles }
                });
            }
        }
    }, [productionBins, mrs, inwardVehicles]);

    // Helper: Get current user's location for filtering
    const getCurrentUserLocation = () => {
        try {
            const currentUser = JSON.parse(localStorage.getItem('currentUser'));
            return currentUser?.assignedLocationId || null;
        } catch {
            return null;
        }
    };

    // Helper: Check if bay/bin belongs to user's location
    const belongsToUserLocation = (item) => {
        const userLocation = getCurrentUserLocation();
        if (!userLocation) return true; // Fallback: show all if no location
        if (userLocation === 'CORPORATE') return true; // Corporate sees all

        // Map location IDs to unit prefixes
        const locationUnitMap = {
            'LOC001': 'U1', // Kovvuru Unit-1, U2, U3
            'LOC002': 'P1', // Bandapuram Plant-1, P2, P3
            'LOC003': 'GUJ' // Gujarat (if exists)
        };

        const expectedPrefix = locationUnitMap[userLocation];
        if (!expectedPrefix) return true; // Unknown location, show all

        // Check if item's unit matches the location
        // For Kovvuru: U1, U2, U3
        // For Bandapuram: P1, P2, P3
        const itemUnit = (item.unit || '').toLowerCase();

        if (userLocation === 'LOC001') {
            // Kovvuru: Check for Unit-1, Unit-2, Unit-3 (or U1, U2, U3)
            return itemUnit.includes('unit-1') || itemUnit.includes('unit-2') || itemUnit.includes('unit-3') ||
                itemUnit.startsWith('u1') || itemUnit.startsWith('u2') || itemUnit.startsWith('u3');
        } else if (userLocation === 'LOC002') {
            // Bandapuram: Check for Plant-1, Plant-2, Plant-3 (or P1, P2, P3, FDB, Bandapuram)
            return itemUnit.includes('plant-1') || itemUnit.includes('plant-2') || itemUnit.includes('plant-3') ||
                itemUnit.startsWith('p1') || itemUnit.startsWith('p2') || itemUnit.startsWith('p3') ||
                itemUnit.includes('fdb') || itemUnit.includes('bandapuram');
        }

        return true;
    };

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

            // LOCATION FILTER: Only show items from user's location
            if (!belongsToUserLocation(b)) return false;

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

    const updateBinStock = (binId, qty, material, operation, grade = null, uom = null) => {
        const updateLogic = (prev) => prev.map(bin => {
            if (bin.id === binId) {
                let inputQty = parseFloat(qty);
                const currentUom = bin.uom || 'KGS';
                const inputUom = uom || currentUom; // Default to bin UOM if not provided

                // UOM Conversion
                if (currentUom !== inputUom) {
                    if (currentUom === 'MT' && (inputUom === 'KGS' || inputUom === 'KG')) {
                        inputQty = inputQty / 1000;
                    } else if ((currentUom === 'KGS' || currentUom === 'KG') && inputUom === 'MT') {
                        inputQty = inputQty * 1000;
                    }
                }

                let newQty = parseFloat(bin.qty || 0);

                if (operation === 'ADD') {
                    newQty += inputQty;
                    return {
                        ...bin,
                        status: 'OCCUPIED',
                        material,
                        grade: grade || bin.grade,
                        qty: parseFloat(newQty.toFixed(3)), // Precision
                        uom: currentUom, // Keep bin UOM
                        lastUpdated: new Date().toISOString()
                    };
                } else if (operation === 'REMOVE') {
                    newQty -= inputQty;
                    if (newQty <= 0) {
                        return { ...bin, status: 'EMPTY', material: null, grade: null, qty: 0, lastUpdated: new Date().toISOString() };
                    }
                    return { ...bin, qty: parseFloat(newQty.toFixed(3)), lastUpdated: new Date().toISOString() };
                } else if (operation === 'SET') {
                    newQty = inputQty;
                    // If SET, we might want to update UOM if bin is empty? 
                    // For now, respect existing UOM or if empty allow overwrite
                    const finalUom = (bin.status === 'EMPTY' && uom) ? uom : currentUom;

                    if (newQty <= 0) {
                        return { ...bin, status: 'EMPTY', material: null, grade: null, qty: 0, lastUpdated: new Date().toISOString() };
                    }
                    return {
                        ...bin,
                        qty: parseFloat(newQty.toFixed(3)),
                        status: 'OCCUPIED',
                        material,
                        grade: grade || bin.grade,
                        uom: finalUom,
                        lastUpdated: new Date().toISOString()
                    };
                }
            }
            return bin;
        });

        // Check if it's a Bay or Bin
        const isBay = bays.some(b => b.id === binId);
        if (isBay) {
            setBays(prev => updateLogic(prev));
        } else {
            setProductionBins(prev => updateLogic(prev));
        }
    };

    const updateMRStatus = (mrId, status, logs = null) => {
        setMrs(prev => prev.map(mr => {
            if (mr.id === mrId) {
                return {
                    ...mr,
                    status,
                    logs: logs ? [...(mr.logs || []), logs] : mr.logs,
                    updatedAt: new Date().toISOString()
                };
            }
            return mr;
        }));
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
        // Update stock immediately upon assignment
        const vehicle = inwardVehicles.find(v => v.id === vehicleId);
        if (vehicle) {
            updateBinStock(bayId, vehicle.netWeight, vehicle.materialName, 'ADD');
        }

        setInwardVehicles(prev => prev.map(v => {
            if (v.id === vehicleId) {
                return { ...v, status: 'BAY_ASSIGNED', assignedBay: bayId, updatedAt: new Date().toISOString() };
            }
            return v;
        }));
    };

    const seedBins = () => {
        // Seed some specific RM bays with material
        setBays(prev => prev.map(bin => {
            if (bin.id === 'RMFB1B5') return { ...bin, status: 'OCCUPIED', material: 'FISH MEAL IND', qty: 5000, uom: 'KGS', lastUpdated: new Date().toISOString() };
            if (bin.id === 'RMFB1B6') return { ...bin, status: 'OCCUPIED', material: 'SOYA DOC', qty: 10000, uom: 'KGS', lastUpdated: new Date().toISOString() };
            if (bin.id === 'RMFB1B7') return { ...bin, status: 'OCCUPIED', material: 'WHEAT FLOUR', qty: 8000, uom: 'KGS', lastUpdated: new Date().toISOString() };
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

    // Apply location filtering - re-filter whenever bays change OR when user logs in
    const [filteredBays, setFilteredBays] = useState([]);
    const [filteredProductionBins, setFilteredProductionBins] = useState([]);

    useEffect(() => {
        const filtered = bays.filter(bay => belongsToUserLocation(bay));
        setFilteredBays(filtered);
    }, [bays]); // Re-filter when bays change

    useEffect(() => {
        const filtered = productionBins.filter(bin => belongsToUserLocation(bin));
        setFilteredProductionBins(filtered);
    }, [productionBins]); // Re-filter when bins change

    // Also re-filter when user logs in (localStorage changes)
    useEffect(() => {
        const handleStorageChange = () => {
            setFilteredBays(bays.filter(bay => belongsToUserLocation(bay)));
            setFilteredProductionBins(productionBins.filter(bin => belongsToUserLocation(bin)));
        };

        window.addEventListener('storage', handleStorageChange);
        return () => window.removeEventListener('storage', handleStorageChange);
    }, [bays, productionBins]);

    const value = {
        bays: filteredBays, // Expose filtered bays instead of raw bays
        productionBins: filteredProductionBins, // Expose filtered bins
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
        updateMRStatus,
        seedBins
    };

    return (
        <WarehouseContext.Provider value={value}>
            {children}
        </WarehouseContext.Provider>
    );
};
