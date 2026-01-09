// Mock Production Context Logic
let lots = [];

const addLot = (lotData) => {
    const newLot = {
        ...lotData,
        id: lotData.lotNumber,
        status: 'PENDING_QA',
        createdAt: new Date().toISOString(),
        qcData: null
    };
    lots.push(newLot);
    console.log(`Lot Added: ${newLot.id} | Status: ${newLot.status}`);
};

const updateLotStatus = (lotId, status, qcData = null) => {
    lots = lots.map(lot => {
        if (lot.id === lotId) {
            console.log(`Updating Lot ${lotId} -> ${status}`);
            return {
                ...lot,
                status,
                qcData,
                updatedAt: new Date().toISOString()
            };
        }
        return lot;
    });
};

// Test Execution
console.log('--- Step 1: Production ---');
addLot({
    lotNumber: '2511260001',
    fgName: 'Shrimp Feed Grade A',
    shift: 'Shift A',
    unit: 'Unit-1',
    binsConsumed: ['B1', 'B2']
});

console.log('\n--- Step 2: Inspection (Approve) ---');
const qcData = { protein: '45', moisture: '10', oil: '5', sand: '1' };
updateLotStatus('2511260001', 'APPROVED', qcData);

// Verify Final State
const lot = lots.find(l => l.id === '2511260001');
if (lot.status === 'APPROVED' && lot.qcData.protein === '45') {
    console.log('\nPASS: Lot successfully approved with QC data.');
} else {
    console.log('\nFAIL: Lot status or data incorrect.');
    console.log(lot);
}
