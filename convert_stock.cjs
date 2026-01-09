const fs = require('fs');
const path = require('path');

const csvPath = path.join(__dirname, 'src/data/fg_stock.csv');
const outputPath = path.join(__dirname, 'src/data/initialStockData.js');

try {
    const csvContent = fs.readFileSync(csvPath, 'utf8');
    const lines = csvContent.split('\n').filter(l => l.trim().length > 0);

    // Parse headers
    const headers = lines[0].split(',').map(h => h.trim());

    const mappedData = lines.slice(1).map(line => {
        // Handle CSV splitting
        // Note: Simple split by comma. If values contain commas, this breaks. 
        // Based on file inspection, no values contain commas.
        const values = line.split(',');
        const row = {};

        headers.forEach((header, index) => {
            if (values[index] !== undefined) {
                row[header] = values[index].trim();
            }
        });

        // Filter out bad rows
        if (!row['LOT Number']) return null;

        return {
            id: row['LOT Number'],
            lotNumber: row['LOT Number'],
            productName: row['Finished Goods Name'],
            qty: parseFloat(row['Qty']),
            assignedBay: row['BAY Number'],
            status: 'STORED',
            unit: row['Unit/Plant'],
            location: row['Location'], // Should be Kovvuru
            productionDate: row['LOT Date'],
            category: row['Category'],
            brand: row['Brand Name'],
            grade: row['Grade'],
            shift: row['SHIFT'],
            bags: parseInt(row['Bags']),
            bagWeight: parseFloat(row['Bags Wt in MKT']),
            uom: row['UOM'],
            qcRegion: row['QC Approved Regeion'],
            createdAt: new Date().toISOString(),
            logs: [{
                time: new Date().toISOString(),
                action: 'Imported from initial stock',
                stage: 'SYSTEM'
            }]
        };
    }).filter(item => item !== null && item.location === 'Kovvuru'); // Enforce Kovvuru constraint

    const fileContent = `export const INITIAL_STOCK_DATA = ${JSON.stringify(mappedData, null, 4)};`;

    fs.writeFileSync(outputPath, fileContent);
    console.log(`Successfully converted ${mappedData.length} rows to ${outputPath}`);

} catch (error) {
    console.error('Error converting CSV:', error);
    process.exit(1);
}
