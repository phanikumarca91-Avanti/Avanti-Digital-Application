// Script to add missing FG bays to masterBays.js
const fs = require('fs');
const path = require('path');

const missingBays = ["FGFK1A21", "FGFK1B14W", "FGFK2A31", "FGFK2WAY", "FGFK3A21", "FGFK3A22", "FGFK3A23", "FGFK3A24", "FGFK3A25", "FGFK3A26", "FGFK3A27", "FGFK3A28", "FGFK3A29", "FGFK3A30", "FGFK3A31", "FGFK3A32", "FGFK3A33", "FGFK3A34", "FGFK3A35", "FGFK3A36", "FGFK3A37", "FGFK3A38", "FGFK3ASC1", "FGFK3ASC2", "FGFK3ASC3", "FGFK3ASC4", "FGFK3ASC5"];

// Determine unit from bay ID
const getUnit = (bayId) => {
    if (bayId.includes('FK1')) return 'Unit-1';
    if (bayId.includes('FK2')) return 'Unit-2';
    if (bayId.includes('FK3')) return 'Unit-3';
    if (bayId.includes('FB1')) return 'Plant-1';
    if (bayId.includes('FB2')) return 'Plant-2';
    return 'Kovvuru';
};

// Generate bay objects
const newBays = missingBays.map(id => ({
    id: id,
    name: id,
    unit: getUnit(id),
    type: "Finished Goods",
    status: "Empty",
    material: null,
    qty: 0,
    uom: "MT",
    lastUpdated: new Date().toISOString()
}));

console.log('Generated', newBays.length, 'new bays');
console.log('Sample bay:', JSON.stringify(newBays[0], null, 2));
console.log('\nAll new bays:\n', JSON.stringify(newBays, null, 4));
