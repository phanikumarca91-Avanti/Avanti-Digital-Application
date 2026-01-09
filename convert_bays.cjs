const XLSX = require('xlsx');
const path = require('path');
const fs = require('fs');

const INPUT_FILE = path.join(__dirname, 'src/data/Warehosue master BAY List.xlsx');
const OUTPUT_FILE = path.join(__dirname, 'src/data/masterBays.js');

function convert() {
    try {
        const workbook = XLSX.readFile(INPUT_FILE);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

        // Find header row (starts with 'Catergory')
        let headerRowIndex = -1;
        for (let i = 0; i < data.length; i++) {
            if (data[i][0] && String(data[i][0]).toLowerCase().includes('catergory')) {
                headerRowIndex = i;
                break;
            }
        }

        if (headerRowIndex === -1) {
            throw new Error("Could not find header row starting with 'Catergory'");
        }

        const headers = data[headerRowIndex];
        console.log("Found headers:", headers);

        // Map columns to Unit Names
        // Col 0: Category
        // Col 1: Unit-1
        // ...
        const unitMap = {};
        for (let i = 1; i < headers.length; i++) {
            const h = headers[i];
            if (h) {
                // Normalize "Bandpauram Plant-1" -> "Unit-Bandapuram-1" or keep as is?
                // App uses "Unit-1", "Unit-2" generally.
                // Let's keep the header name for now, or normalize if pattern matches "Unit-X"
                unitMap[i] = String(h).trim();
            }
        }

        const masterBays = [];
        let currentCategory = 'RAW MATERIAL'; // Default

        for (let i = headerRowIndex + 1; i < data.length; i++) {
            const row = data[i];
            if (!row || row.length === 0) continue;

            // Check if Category changes in Col 0
            if (row[0]) {
                const cat = String(row[0]).trim().toUpperCase();
                if (cat.includes('RAW') || cat.includes('FINISHED')) {
                    currentCategory = cat;
                }
            }

            // Iterate Unit Columns
            Object.keys(unitMap).forEach(colIdx => {
                const bayId = row[colIdx];
                if (bayId) {
                    const normalizedId = String(bayId).trim();
                    if (normalizedId.length > 2) { // minimal valid length check

                        let type = 'Raw Material';
                        if (currentCategory.includes('FINISHED')) type = 'Finished Goods';

                        // Override type based on ID prefix if obvious?
                        if (normalizedId.startsWith('FGFK') || normalizedId.startsWith('FGFB')) type = 'Finished Goods';
                        if (normalizedId.startsWith('RMFK') || normalizedId.startsWith('RMFB')) type = 'Raw Material';

                        // Normalize Unit Name
                        let unitName = unitMap[colIdx];

                        // Kovvuru mapping
                        if (unitName.toLowerCase().includes('unit-1')) unitName = 'Unit-1';
                        else if (unitName.toLowerCase().includes('unit-2')) unitName = 'Unit-2';
                        else if (unitName.toLowerCase().includes('unit-3')) unitName = 'Unit-3';

                        // Bandapuram mapping
                        else if (unitName.toLowerCase().includes('plant-1')) unitName = 'Plant-1';
                        else if (unitName.toLowerCase().includes('plant-2')) unitName = 'Plant-2';
                        else if (unitName.toLowerCase().includes('plant-3')) unitName = 'Plant-3';

                        else if (unitName.toLowerCase().includes('band')) unitName = 'Plant-1'; // Fallback for general Bandapuram to Plant-1 or handle appropriately if needed

                        masterBays.push({
                            id: normalizedId,
                            name: normalizedId,
                            unit: unitName,
                            type: type,
                            status: 'Empty',
                            material: null,
                            qty: 0,
                            uom: 'MT', // Default to MT as per file hints (though stock file had KGS/MT mixed, Bays usually store MT capacity, but here we track stock)
                            lastUpdated: new Date().toISOString()
                        });
                    }
                }
            });
        }

        const fileContent = `export const MASTER_BAYS = ${JSON.stringify(masterBays, null, 4)};\n`;
        fs.writeFileSync(OUTPUT_FILE, fileContent);
        console.log(`Successfully generated ${masterBays.length} bays in ${OUTPUT_FILE}`);

    } catch (error) {
        console.error("Conversion failed:", error);
    }
}

convert();
