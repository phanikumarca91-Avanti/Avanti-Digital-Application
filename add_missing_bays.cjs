const fs = require('fs');
const path = require('path');

// Missing bay IDs
const missingBayIds = [
    "FGFK1A21", "FGFK1B14W", "FGFK2A31", "FGFK2WAY",
    "FGFK3A21", "FGFK3A22", "FGFK3A23", "FGFK3A24", "FGFK3A25",
    "FGFK3A26", "FGFK3A27", "FGFK3A28", "FGFK3A29", "FGFK3A30",
    "FGFK3A31", "FGFK3A32", "FGFK3A33", "FGFK3A34", "FGFK3A35",
    "FGFK3A36", "FGFK3A37", "FGFK3A38",
    "FGFK3ASC1", "FGFK3ASC2", "FGFK3ASC3", "FGFK3ASC4", "FGFK3ASC5"
];

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
const newBays = missingBayIds.map(id => ({
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

console.log(`Adding ${newBays.length} missing bays to masterBays.js...`);

// Read the existing masterBays.js
const masterBaysPath = path.join(__dirname, 'src', 'data', 'masterBays.js');
const { MASTER_BAYS } = require('./src/data/masterBays.js');

// Check which bays are actually missing
const existingIds = new Set(MASTER_BAYS.map(b => b.id));
const actuallyMissing = newBays.filter(b => !existingIds.has(b.id));

console.log(`Verified: ${actuallyMissing.length} bays are actually missing`);

if (actuallyMissing.length === 0) {
    console.log('No bays to add! All bays already exist.');
    process.exit(0);
}

// Add missing bays to the array
const updatedBays = [...MASTER_BAYS, ...actuallyMissing];

// Sort by ID to keep organized
updatedBays.sort((a, b) => a.id.localeCompare(b.id));

// Create the new file content
const fileContent = `export const MASTER_BAYS = ${JSON.stringify(updatedBays, null, 4)};\n`;

// Create backup
const backupPath = masterBaysPath + '.backup';
fs.copyFileSync(masterBaysPath, backupPath);
console.log(`Backup created: ${backupPath}`);

// Write the new file
fs.writeFileSync(masterBaysPath, fileContent, 'utf8');

console.log(`✅ Successfully added ${actuallyMissing.length} bays to masterBays.js`);
console.log(`Total bays now: ${updatedBays.length}`);
console.log('\nAdded bays:');
actuallyMissing.forEach(b => console.log(`  - ${b.id} (${b.unit})`));
