const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'Delivery location.csv');
const jsPath = path.join(__dirname, 'deliveryLocationData.js');

try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n');

    const data = [];
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Simple CSV parser handling quotes
        const parts = [];
        let current = '';
        let inQuote = false;
        for (let j = 0; j < line.length; j++) {
            const char = line[j];
            if (char === '"') {
                inQuote = !inQuote;
            } else if (char === ',' && !inQuote) {
                parts.push(current.trim());
                current = '';
            } else {
                current += char;
            }
        }
        parts.push(current.trim());

        if (parts.length >= 2) {
            data.push({
                Regeion: parts[0],
                "Delivery points": parts[1].replace(/^"|"$/g, '')
            });
        }
    }

    const jsContent = `export const DELIVERY_LOCATIONS = ${JSON.stringify(data, null, 2)};`;
    fs.writeFileSync(jsPath, jsContent);
    console.log('Converted ' + data.length + ' records.');
} catch (err) {
    console.error('Error converting CSV:', err);
    process.exit(1);
}
