import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const csvPath = path.join(__dirname, 'Stores and Spares Master.csv');
const masterDataPath = path.join(__dirname, 'masterData.js');

try {
    console.log("Reading CSV file...");
    const workbook = XLSX.readFile(csvPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    console.log(`Parsed ${rawData.length} items. Formatting...`);

    // 2. Format Data
    // Assuming columns might be "Material Name", "Material Code", etc. based on previous files.
    // If not, we'll map whatever we find.
    const formattedData = rawData.map((item, index) => {
        const id = `ST-${String(index + 1).padStart(5, '0')}`;
        // Fallback to finding keys if exact names don't match
        const name = item["Material Name"] || item["Name"] || item["Description"] || Object.values(item)[0] || "Unknown";
        const code = item["Material Code"] || item["Code"] || "";
        const category = item["Item Category"] || item["Category"] || "General";
        const uom = item["UOM"] || item["Unit"] || "NOS";

        return {
            id: id,
            name: String(name).trim(),
            code: String(code).trim(),
            type: "STORE",
            category: String(category).trim(),
            uom: String(uom).trim()
        };
    });

    // 3. Read masterData.js
    let masterDataContent = fs.readFileSync(masterDataPath, 'utf-8');

    // 4. Create Replacement String
    const jsonString = JSON.stringify(formattedData, null, 4);

    // 5. Replace STORES_SPARES array
    const regex = /"STORES_SPARES":\s*\[[\s\S]*?\]/;

    if (!regex.test(masterDataContent)) {
        throw new Error("Could not find STORES_SPARES array in masterData.js");
    }

    console.log("Injecting into masterData.js...");
    const newContent = masterDataContent.replace(regex, `"STORES_SPARES": ${jsonString}`);

    // 6. Write back
    fs.writeFileSync(masterDataPath, newContent, 'utf-8');

    console.log(`Successfully updated masterData.js with ${formattedData.length} Stores & Spares.`);

} catch (error) {
    console.error("Error updating master data:", error);
}
