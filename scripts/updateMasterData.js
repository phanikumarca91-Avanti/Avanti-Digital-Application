import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const masterDataPath = path.resolve(__dirname, '../src/data/masterData.js');

console.log(`Reading ${masterDataPath}...`);
let content = fs.readFileSync(masterDataPath, 'utf8');

// 1. Add Imports
if (!content.includes("import { SUPPLIERS } from './supplierData';")) {
    content = "import { SUPPLIERS } from './supplierData';\n" + content;
}
if (!content.includes("import { CUSTOMERS } from './customerData';")) {
    content = "import { CUSTOMERS } from './customerData';\n" + content;
}

// 2. Inject Data
// We want to replace "export const MASTER_DATA = {" with the version that includes our keys
// But we need to be careful not to duplicate keys if they already exist.
// A safer regex approach:

if (!content.includes('"SUPPLIERS": SUPPLIERS')) {
    const search = 'export const MASTER_DATA = {';
    const replace = 'export const MASTER_DATA = {\n    "SUPPLIERS": SUPPLIERS,';
    content = content.replace(search, replace);
}

if (!content.includes('"CUSTOMERS": CUSTOMERS')) {
    const search = 'export const MASTER_DATA = {';
    const replace = 'export const MASTER_DATA = {\n    "CUSTOMERS": CUSTOMERS,';
    content = content.replace(search, replace);
}

fs.writeFileSync(masterDataPath, content);
console.log("Updated masterData.js");
