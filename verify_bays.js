// Mock Data from WarehouseContext
const masterBins = [
    { name: 'RMFK1A11', unit: 'Unit-1' },
    { name: 'RMFK1A12', unit: 'Unit-1' },
    { name: 'RMFK1A13', unit: 'Unit-1' },
    { name: 'RMFK1A14', unit: 'Unit-1' },
    { name: 'RMFK1B11', unit: 'Unit-1' }
];

const bins = masterBins.map((b, index) => {
    // Seed some data for testing (Logic from WarehouseContext)
    if (index === 0) return { id: b.name, name: b.name, unit: b.unit, status: 'OCCUPIED', material: 'FISH MEAL', qty: 5000, uom: 'KGS', lastUpdated: new Date().toISOString() };
    if (index === 1) return { id: b.name, name: b.name, unit: b.unit, status: 'OCCUPIED', material: 'MANAMEI - 2', qty: 2000, uom: 'KGS', lastUpdated: new Date().toISOString() };
    if (index === 2) return { id: b.name, name: b.name, unit: b.unit, status: 'OCCUPIED', material: 'SOYA DOC', qty: 10000, uom: 'KGS', lastUpdated: new Date().toISOString() };

    return {
        id: b.name,
        name: b.name,
        unit: b.unit,
        status: 'EMPTY',
        material: null,
        qty: 0,
        uom: 'KGS',
        lastUpdated: new Date().toISOString()
    };
});

// Mock Item Request
const item = { name: 'FISH MEAL', qty: 100 };

// Logic from WarehouseBayAssignment.jsx
const getAvailableBays = (item) => {
    if (!item) return [];
    return bins.filter(b => {
        // Must match material and have stock
        return b.material === item.name && parseFloat(b.qty) > 0;
    });
};

// Run Verification
const availableBays = getAvailableBays(item);

console.log("Total Bins:", bins.length);
console.log("Seeded Bins:", bins.filter(b => b.status === 'OCCUPIED').map(b => `${b.name}: ${b.material} (${b.qty})`));
console.log("Searching for:", item.name);
console.log("Available Bays Found:", availableBays.length);
availableBays.forEach(b => {
    console.log(`- ${b.name}: ${b.qty} ${b.uom} (Status: ${b.status})`);
});

if (availableBays.length > 0 && availableBays[0].material === 'FISH MEAL') {
    console.log("SUCCESS: Bay selection logic is working correctly.");
} else {
    console.log("FAILURE: No bays found or incorrect material.");
}
