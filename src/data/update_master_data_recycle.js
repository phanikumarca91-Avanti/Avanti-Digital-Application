import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const masterDataPath = path.join(__dirname, 'masterData.js');

const newRecycleData = [
    { "id": "RC-001", "name": "REC - HIGH BOOST", "code": "REC - HIGH BOOST", "type": "RECYCLE", "category": "INDIGENOUS", "uom": "KGS" },
    { "id": "RC-002", "name": "REC - TITAN", "code": "REC - TITAN", "type": "RECYCLE", "category": "INDIGENOUS", "uom": "KGS" },
    { "id": "RC-003", "name": "REC-MANAMEI", "code": "REC-MANAMEI", "type": "RECYCLE", "category": "INDIGENOUS", "uom": "KGS" },
    { "id": "RC-004", "name": "REC-PROFEED", "code": "REC-PROFEED", "type": "RECYCLE", "category": "INDIGENOUS", "uom": "KGS" },
    { "id": "RC-005", "name": "REC-SCAMPRO", "code": "REC-SCAMPRO", "type": "RECYCLE", "category": "INDIGENOUS", "uom": "KGS" },
    { "id": "RC-006", "name": "REC-SWEEPING POWDER", "code": "REC-SWEEPING POWDER", "type": "RECYCLE", "category": "INDIGENOUS", "uom": "KGS" }
];

try {
    console.log("Reading masterData.js...");
    let masterDataContent = fs.readFileSync(masterDataPath, 'utf-8');

    const jsonString = JSON.stringify(newRecycleData, null, 4);

    // Regex to find "RECYCLE_MATERIALS": [...]
    const regex = /"RECYCLE_MATERIALS":\s*\[[\s\S]*?\]/;

    if (!regex.test(masterDataContent)) {
        throw new Error("Could not find RECYCLE_MATERIALS array in masterData.js");
    }

    console.log("Injecting Recycle Materials...");
    const newContent = masterDataContent.replace(regex, `"RECYCLE_MATERIALS": ${jsonString}`);

    fs.writeFileSync(masterDataPath, newContent, 'utf-8');

    console.log("Successfully updated Recycle Materials.");

} catch (error) {
    console.error("Error updating master data:", error);
}
