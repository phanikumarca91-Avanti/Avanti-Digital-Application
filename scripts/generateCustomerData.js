import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.resolve(__dirname, '../src/data/Customer Master.csv');
const outputPath = path.resolve(__dirname, '../src/data/customerData.js');

try {
    console.log(`Reading ${csvPath}...`);
    const workbook = XLSX.readFile(csvPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // Parse with header: 2 (0-indexed, so row 3 is header) based on file view
    // Row 1: "CUSTOMER MASTER LIST..."
    // Row 2: Empty
    // Row 3: Headers (Entitycode, Entityname...)
    const data = XLSX.utils.sheet_to_json(sheet, { range: 2 });

    console.log(`Found ${data.length} rows.`);

    const customers = data.map((row, index) => {
        const getVal = (key) => row[key] ? String(row[key]).trim() : '';
        const getNum = (key) => {
            const val = row[key];
            if (typeof val === 'number') return val;
            if (!val) return 0;
            return parseFloat(String(val).replace(/,/g, '')) || 0;
        };

        const name = getVal('Entityname') || getVal('Customer Name') || getVal('Name');

        if (!name) return null;

        return {
            id: `CUST-${String(index + 1).padStart(4, '0')}`,
            entityName: name,
            entityCode: getVal('Entitycode') || getVal('Code'),
            address: getVal('Address1') + (getVal('Address2') ? `, ${getVal('Address2')}` : ''),
            city: getVal('City'),
            state: getVal('State'),
            gstin: getVal('GSTIN'),
            pan: getVal('PAN No'),
            email: getVal('Email'),
            phone: getVal('Mobile') || getVal('Office Phone'),

            // Commercial Limits
            creditLimit: getNum('Credit Limit'),
            creditDays: getNum('Credit Days'),
            standardCreditLimit: getNum('Standard Credit limit'),
            standardCreditDays: getNum('Standard Cr Days'),
            enhancedCreditLimit: getNum('Enhanced Credit Limit'),
            enhancedCreditDays: getNum('Enhanced Credit  Days'),

            // Status/Type
            priceGroup: getVal('Price Group'),
            zone: getVal('Zone'),

            // Metadata
            source: 'CSV Import'
        };
    }).filter(item => item !== null);

    console.log(`Processed ${customers.length} valid customers.`);

    const fileContent = `// Auto-generated from Customer Master.csv
export const CUSTOMERS = ${JSON.stringify(customers, null, 4)};
`;

    fs.writeFileSync(outputPath, fileContent);
    console.log(`Successfully wrote to ${outputPath}`);

} catch (error) {
    console.error("Error processing customer data:", error);
}
