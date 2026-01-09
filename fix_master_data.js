
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'masterData.js');

try {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n');

    console.log('Line 39:', lines[39]);
    console.log('Line 40:', lines[40]);
    console.log('Line 41:', lines[41]);
    console.log('Line 42:', lines[42]);

    // Check if line 41 is indeed the closing bracket we want to remove
    if (lines[41].trim() === '],') {
        console.log('Found premature closing bracket at line 41. Fixing...');

        // Add comma to line 40
        lines[40] = lines[40].trimEnd() + ',';

        // Remove line 41
        lines.splice(41, 1);

        const newContent = lines.join('\n');
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Successfully fixed masterData.js');
    } else {
        console.log('Line 41 is not "],". Aborting fix to avoid damage.');
    }

} catch (err) {
    console.error('Error fixing file:', err);
}
