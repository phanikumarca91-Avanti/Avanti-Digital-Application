import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const csvPath = path.resolve(__dirname, '../src/data/Supplier Master .csv');
const outputPath = path.resolve(__dirname, '../src/data/supplierData.js');

console.log(`Reading from: ${csvPath}`);

try {
    const workbook = XLSX.readFile(csvPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];

    // The CSV seems to have headers on line 4 (index 3).
    // Let's read with range option.
    const data = XLSX.utils.sheet_to_json(sheet, { range: 3 });

    console.log(`Found ${data.length} rows.`);

    const suppliers = data.map((row, index) => {
        // Map fields
        // Entitycode,Entityname,MSME No,Address1,Address2,City,District,State,Country,Pin Code,Bank Name,Branch,A/C No,IFSC Code,GSTIN,GST State Code,PAN No,Contact Person,Url,Email,Phone,Mobile

        // Helper to get value safely
        const getVal = (key) => row[key] ? String(row[key]).trim() : '';

        // Determine Name (Entityname or Supplier Name or Name)
        const name = getVal('Entityname') || getVal('Supplier Name') || getVal('Name');

        if (!name) return null;

        return {
            id: `SUP-${String(index + 1).padStart(4, '0')}`, // Generate a stable ID
            entityName: name,
            entityCode: getVal('Entitycode') || getVal('Code'),
            gstin: getVal('GSTIN'),
            panNo: getVal('PAN No'),
            msmeNo: getVal('MSME No'),
            address1: getVal('Address1'),
            address2: getVal('Address2'),
            city: getVal('City'),
            district: getVal('District'),
            state: getVal('State'),
            country: getVal('Country'),
            pinCode: getVal('Pin Code'),
            contactPerson: getVal('Contact Person'),
            mobile: getVal('Mobile'),
            phone: getVal('Phone'),
            email: getVal('Email'),
            url: getVal('Url'),
            bankName: getVal('Bank Name'),
            branch: getVal('Branch'),
            accountNo: getVal('A/C No'),
            ifscCode: getVal('IFSC Code')
        };
    }).filter(item => item !== null);

    const fileContent = `// Auto-generated from Supplier Master .csv
export const SUPPLIERS = ${JSON.stringify(suppliers, null, 4)};
`;

    fs.writeFileSync(outputPath, fileContent);
    console.log(`Wrote ${suppliers.length} suppliers to ${outputPath}`);

} catch (error) {
    console.error("Error processing CSV:", error);
}
