import fs from 'fs';
import path from 'path';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.join(__dirname, 'src', 'data');
const outputFile = path.join(dataDir, 'masterData.js');

const config = {
    'BIN Name Masters.xlsx': { headerRow: 3, map: { 'BIN Name': 'name', 'Unit name': 'unit' } },
    'Customer Master.xlsx': { headerRow: 2, map: { 'Customer Name': 'name', 'Customer Code': 'code', 'GSTIN': 'gst', 'Address1': 'address', 'City': 'city', 'State': 'state' } },
    'Finished Goods Master List.xlsx': { headerRow: 2, map: { 'Name': 'name', 'UOM': 'uom', 'Category': 'category' } },
    'Materials Master.xlsx': { headerRow: 2, map: { 'Material': 'name', 'Uom': 'uom', 'Material Category': 'category' } },
    'Vendor Master.xlsx': { headerRow: 3, map: { 'Entityname': 'name', 'Address1': 'address', 'GSTIN': 'gst', 'City': 'city', 'State': 'state' } },
    'Warehosue Bin Locations.xlsx': { headerRow: 5, type: 'matrix', categoryCol: 0 },
    'Peroduction Mills _ Names Master.xlsx': { headerRow: 2, type: 'matrix', categoryCol: 0 }
};

const masterData = {};

Object.entries(config).forEach(([file, settings]) => {
    const filePath = path.join(dataDir, file);
    if (fs.existsSync(filePath)) {
        console.log(`Processing ${file}...`);
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawData = XLSX.utils.sheet_to_json(sheet, { header: 1, range: 0 });

        // Find header row
        const headerRowIndex = settings.headerRow;
        const headers = rawData[headerRowIndex];

        if (!headers || headers.length === 0) {
            console.error(`No headers found for ${file} at row ${headerRowIndex}`);
            return;
        }

        const dataRows = rawData.slice(headerRowIndex + 1);
        let cleanData = [];

        if (settings.type === 'matrix') {
            // Matrix processing (Column headers are Units, Rows are Items)
            dataRows.forEach(row => {
                const category = row[settings.categoryCol];
                // Iterate through columns starting from 1 (assuming 0 is category)
                headers.forEach((header, index) => {
                    if (index > settings.categoryCol && row[index]) {
                        cleanData.push({
                            name: row[index],
                            unit: header,
                            category: category || 'General'
                        });
                    }
                });
            });
        } else {
            // Standard processing
            cleanData = dataRows.map(row => {
                const item = {};
                if (settings.map) {
                    Object.entries(settings.map).forEach(([csvKey, jsKey]) => {
                        const colIndex = headers.indexOf(csvKey);
                        if (colIndex !== -1 && row[colIndex] !== undefined) {
                            item[jsKey] = row[colIndex];
                        }
                    });
                } else {
                    headers.forEach((header, index) => {
                        item[header] = row[index];
                    });
                }
                return item;
            }).filter(item => item.name);
        }

        // Key for the masterData object
        const key = file.replace('.xlsx', '').replace(/ /g, '_').toUpperCase();
        masterData[key] = cleanData;
    }
});

const fileContent = `// Auto-generated master data
export const MASTER_DATA = ${JSON.stringify(masterData, null, 2)};
`;

fs.writeFileSync(outputFile, fileContent);
console.log(`Master data written to ${outputFile}`);
