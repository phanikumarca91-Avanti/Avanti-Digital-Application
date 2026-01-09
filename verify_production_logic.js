// Mock Warehouse Context Logic
let bins = [
    { id: 'B1', name: 'Bin-1', status: 'OCCUPIED', material: 'Fish Meal', qty: 500 },
    { id: 'B2', name: 'Bin-2', status: 'OCCUPIED', material: 'Wheat Flour', qty: 200 },
    { id: 'B3', name: 'Bin-3', status: 'EMPTY', material: null, qty: 0 }
];

const consumeBins = (binIds) => {
    console.log(`Consuming bins: ${binIds.join(', ')}`);
    bins = bins.map(bin => {
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
    });
};

// Mock Production Entry Logic
const generateLotNumber = () => {
    const date = new Date();
    const yymmdd = date.toISOString().slice(2, 10).replace(/-/g, '');
    const sequence = '1234'; // Mock sequence
    return `${yymmdd}${sequence}`;
};

// Test Execution
console.log('--- Initial State ---');
console.log(bins);

console.log('\n--- Action: Produce Batch using Bin-1 and Bin-2 ---');
const selectedBins = ['B1', 'B2'];
const lotNumber = generateLotNumber();
console.log(`Generated Lot Number: ${lotNumber}`);

// Verify Lot Number Format (10 digits)
if (lotNumber.length === 10 && /^\d+$/.test(lotNumber)) {
    console.log('PASS: Lot Number format is valid (10 digits).');
} else {
    console.log(`FAIL: Invalid Lot Number format: ${lotNumber}`);
}

consumeBins(selectedBins);

console.log('\n--- Final State ---');
console.log(bins);

// Verify Bin Status
const b1 = bins.find(b => b.id === 'B1');
const b2 = bins.find(b => b.id === 'B2');

if (b1.status === 'EMPTY' && b2.status === 'EMPTY') {
    console.log('PASS: Bins B1 and B2 are now EMPTY.');
} else {
    console.log('FAIL: Bins were not correctly consumed.');
}
