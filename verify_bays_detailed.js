// Mock Data from WarehouseContext (Seeded)
const bins = [
    { id: 'RMFK1A11', name: 'RMFK1A11', unit: 'Unit-1', status: 'OCCUPIED', material: 'FISH MEAL', qty: 5000, uom: 'KGS' },
    { id: 'RMFK1A12', name: 'RMFK1A12', unit: 'Unit-1', status: 'OCCUPIED', material: 'MANAMEI - 2', qty: 2000, uom: 'KGS' },
    { id: 'RMFK1A13', name: 'RMFK1A13', unit: 'Unit-1', status: 'OCCUPIED', material: 'SOYA DOC', qty: 10000, uom: 'KGS' }
];

// Mock Item Request (Simulating what the user sees)
const item = { name: 'FISH MEAL', qty: 1 };

console.log("--- DEBUGGING START ---");
console.log(`Looking for Material: '${item.name}'`);

// Replicating the exact filter logic from WarehouseBayAssignment.jsx
const availableBays = bins.filter(b => {
    const materialMatch = b.material === item.name;
    const qtyCheck = parseFloat(b.qty) > 0;

    console.log(`Checking Bin ${b.name}:`);
    console.log(`  - Bin Material: '${b.material}'`);
    console.log(`  - Match? ${materialMatch}`);
    console.log(`  - Qty: ${b.qty} (>0? ${qtyCheck})`);

    return materialMatch && qtyCheck;
});

console.log("--- RESULTS ---");
console.log(`Found ${availableBays.length} bays.`);
availableBays.forEach(b => console.log(`- ${b.name}`));

if (availableBays.length === 0) {
    console.log("\n--- FAILURE ANALYSIS ---");
    // Check for case mismatch
    const caseMatch = bins.filter(b => b.material && b.material.toLowerCase() === item.name.toLowerCase());
    if (caseMatch.length > 0) {
        console.log("POTENTIAL FIX: Case mismatch detected. Found bays if case ignored:");
        caseMatch.forEach(b => console.log(`- ${b.name} (${b.material})`));
    }

    // Check for whitespace
    const trimMatch = bins.filter(b => b.material && b.material.trim() === item.name.trim());
    if (trimMatch.length > 0) {
        console.log("POTENTIAL FIX: Whitespace mismatch detected. Found bays if trimmed:");
        trimMatch.forEach(b => console.log(`- ${b.name} (${b.material})`));
    }
}
console.log("--- DEBUGGING END ---");
