import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'src', 'data');

const files = [
    'Warehosue Bin Locations.xlsx',
    'Peroduction Mills _ Names Master.xlsx'
];

files.forEach(file => {
    const filePath = path.join(dataDir, file);
    if (fs.existsSync(filePath)) {
        console.log(`\n--- Inspecting ${file} ---`);
        const workbook = XLSX.readFile(filePath);
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];

        // Get range
        const range = XLSX.utils.decode_range(sheet['!ref']);
        console.log('Range:', sheet['!ref']);
        console.log('Start Row:', range.s.r);

        console.log('--- First 10 Rows ---');
        for (let R = range.s.r; R <= Math.min(range.e.r, range.s.r + 10); ++R) {
            const row = [];
            for (let C = range.s.c; C <= range.e.c; ++C) {
                const cell_address = { c: C, r: R };
                const cell_ref = XLSX.utils.encode_cell(cell_address);
                if (sheet[cell_ref]) row.push(sheet[cell_ref].v);
            }
            console.log(`Row ${R}:`, row);
        }
    } else {
        console.log(`File not found: ${file}`);
    }
});
