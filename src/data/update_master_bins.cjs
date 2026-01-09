const fs = require('fs');
const path = './masterData.js';

try {
    const content = fs.readFileSync(path, 'utf8');
    const toReplace = '{ "name": "BP1B2", "unit": "Bandapuram" }';
    const replacement = `{ "name": "BP1B2", "unit": "Bandapuram" },
        { "name": "FDJ-B1", "unit": "FDJ" },
        { "name": "FDJ-B2", "unit": "FDJ" },
        { "name": "FDJ-B3", "unit": "FDJ" },
        { "name": "FDJ-B4", "unit": "FDJ" },
        { "name": "FDJ-B5", "unit": "FDJ" }`;

    if (content.includes(toReplace)) {
        // Check if already updated to avoid duplication
        if (content.includes('FDJ-B1')) {
            console.log('FDJ bins already exist.');
        } else {
            const newContent = content.replace(toReplace, replacement);
            fs.writeFileSync(path, newContent);
            console.log('Successfully updated masterData.js');
        }
    } else {
        console.log('Target string not found');
    }
} catch (err) {
    console.error('Error:', err);
}
