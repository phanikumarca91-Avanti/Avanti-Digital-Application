// Mock Contexts
let mrs = [];
let bins = [{ id: 'B1', name: 'Bin-1', status: 'EMPTY', qty: 0, material: null }];
let lots = [];

// --- 1. Material Requisition (CPO) ---
const createMR = (mrData) => {
    const newMR = { ...mrData, status: 'PENDING_BAY_ASSIGNMENT' };
    mrs.push(newMR);
    console.log(`[MR] Created: ${newMR.id} | FGs: ${newMR.fgs.map(f => f.name).join(', ')}`);
    return newMR.id;
};

// --- 2. Bay Assignment (Supervisor) ---
const assignBayToMR = (mrId, itemsWithBays) => {
    const mr = mrs.find(m => m.id === mrId);
    if (mr) {
        mr.items = itemsWithBays;
        mr.status = 'PENDING_DUMPING';
        console.log(`[Bay Assign] Assigned Bays to MR ${mrId}. Status: ${mr.status}`);
    }
};

// --- 3. Dumping (Bin Manager) ---
const updateBinStock = (binId, qty, material, op) => {
    const bin = bins.find(b => b.id === binId);
    if (bin) {
        if (op === 'ADD') {
            bin.qty += parseFloat(qty);
            bin.material = material;
            bin.status = 'OCCUPIED';
            console.log(`[Dumping] Added ${qty}kg ${material} to ${binId}. New Qty: ${bin.qty}`);
        } else if (op === 'REMOVE') {
            bin.qty -= parseFloat(qty);
            if (bin.qty <= 0) { bin.qty = 0; bin.status = 'EMPTY'; bin.material = null; }
            console.log(`[Consumption] Removed ${qty}kg from ${binId}. Remaining: ${bin.qty}`);
        }
    }
};

// --- 4. Production (CPO) ---
const addLot = (lotData) => {
    lots.push({ ...lotData, status: 'PENDING_QA' });
    console.log(`[Production] Lot Generated: ${lotData.lotNumber} | FG: ${lotData.fgName}`);
};

// --- 5. FG Placement (FG Warehouse) ---
const placeLot = (lotId, bay) => {
    const lot = lots.find(l => l.lotNumber === lotId);
    if (lot) {
        lot.fgBay = bay;
        console.log(`[FG Placement] Lot ${lotId} placed in ${bay}`);
    }
};

// === TEST EXECUTION ===
console.log('--- STARTING SIMULATION ---');

// Step 1: Create MR
const mrId = createMR({
    id: 'MR-001',
    fgs: [{ name: 'Shrimp Feed A', qty: 10 }],
    items: [{ id: 1, name: 'Fish Meal', qty: 1000, uom: 'KGS' }]
});

// Step 2: Assign Bay
assignBayToMR(mrId, [{ id: 1, name: 'Fish Meal', qty: 1000, uom: 'KGS', sourceBay: 'RMFK1A11' }]);

// Step 3: Dump to Bin
updateBinStock('B1', 500, 'Fish Meal', 'ADD');

// Step 4: Production (Consume & Generate Lot)
updateBinStock('B1', 500, 'Fish Meal', 'REMOVE');
addLot({ lotNumber: '2511260001', fgName: 'Shrimp Feed A' });

// Step 5: FG Placement
placeLot('2511260001', 'FGFK1A1');

console.log('\n--- FINAL STATE ---');
console.log('Bin Status:', bins[0]);
console.log('Lot Status:', lots[0]);

if (bins[0].status === 'EMPTY' && lots[0].fgBay === 'FGFK1A1') {
    console.log('\nSUCCESS: Full flow verified.');
} else {
    console.log('\nFAILURE: State mismatch.');
}
