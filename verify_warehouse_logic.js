// Mock Data
const MASTER_DATA = {
    BIN_NAME_MASTERS: [
        { name: 'U1KVRB4', unit: 'Unit-1' },
        { name: 'U1KVRB5', unit: 'Unit-1' },
        { name: 'RMFK1A1', unit: 'Banapuram Plant-1' }, // Note: Typo in master data 'Banapuram'
        { name: 'RMFK1A2', unit: 'Banapuram Plant-1' }
    ]
};

// Logic from WarehouseContext.jsx
const bins = MASTER_DATA.BIN_NAME_MASTERS.map(b => ({
    id: b.name,
    name: b.name,
    unit: b.unit,
    status: 'EMPTY'
}));

const getBinsByUnit = (unitName) => {
    if (!unitName) return [];

    // Normalize names for matching
    const normalizedInput = unitName.toLowerCase()
        .replace('fdb', 'bandapuram')
        .replace('banapuram', 'bandapuram')
        .replace('bandpauram', 'bandapuram');

    console.log(`Input: "${unitName}" -> Normalized: "${normalizedInput}"`);

    return bins.filter(b => {
        const normalizedBinUnit = b.unit.toLowerCase()
            .replace('fdb', 'bandapuram')
            .replace('banapuram', 'bandapuram')
            .replace('bandpauram', 'bandapuram');

        const match = normalizedBinUnit.includes(normalizedInput) || normalizedInput.includes(normalizedBinUnit);
        // console.log(`  Bin Unit: "${b.unit}" -> Normalized: "${normalizedBinUnit}" -> Match: ${match}`);
        return match;
    });
};

// Test Cases
console.log('--- Test Case 1: Unit-1 ---');
const unit1Bins = getBinsByUnit('Unit-1');
console.log(`Found ${unit1Bins.length} bins for Unit-1`);

console.log('\n--- Test Case 2: FDB Plant-1 (The Problematic One) ---');
const fdbBins = getBinsByUnit('FDB Plant-1');
console.log(`Found ${fdbBins.length} bins for FDB Plant-1`);

if (fdbBins.length > 0) {
    console.log('SUCCESS: Logic fix works for FDB Plant-1');
} else {
    console.log('FAILURE: Still cannot find bins for FDB Plant-1');
}
