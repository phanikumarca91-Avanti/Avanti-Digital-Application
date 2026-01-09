import XLSX from 'xlsx';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const excelPath = path.join(__dirname, 'Packing Material.xlsx');
const masterDataPath = path.join(__dirname, 'masterData.js');

try {
    // 1. Read Excel
    const workbook = XLSX.readFile(excelPath);
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawData = XLSX.utils.sheet_to_json(sheet);

    // 2. Format Data
    const formattedData = rawData.map((item, index) => {
        const id = `PM-${String(index + 1).padStart(3, '0')}`;
        return {
            id: id,
            name: item["Material Name"] || "Unknown",
            code: item["Material Code"] || "",
            type: "PM",
            category: item["Item Category"] || "General",
            uom: item["UOM"] || "NOS"
        };
    });

    // 3. Read masterData.js
    let masterDataContent = fs.readFileSync(masterDataPath, 'utf-8');

    // 4. Create Replacement String
    const jsonString = JSON.stringify(formattedData, null, 4);
    // Remove quotes around keys to match style (optional, but nice)
    // Actually, keeping quotes is valid JS. Let's just use valid JSON for the array content.

    // 5. Replace PACKING_MATERIALS array
    // Regex to find "PACKING_MATERIALS": [...]
    // We use dotall (s flag equivalent) by using [\s\S]
    const regex = /"PACKING_MATERIALS":\s*\[[\s\S]*?\]/;

    if (!regex.test(masterDataContent)) {
        throw new Error("Could not find PACKING_MATERIALS array in masterData.js");
    }

    const newContent = masterDataContent.replace(regex, `"PACKING_MATERIALS": ${jsonString}`);

    // 6. Write back
    fs.writeFileSync(masterDataPath, newContent, 'utf-8');

    console.log(`Successfully updated masterData.js with ${formattedData.length} Packing Materials.`);

} catch (error) {
    console.error("Error updating master data:", error);
}
