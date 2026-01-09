
const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'src', 'data', 'masterData.js');

try {
    const data = fs.readFileSync(filePath, 'utf8');
    const lines = data.split('\n');

    console.log('Line 40 before fix:', lines[40]);

    // Check if line 40 starts with "name" and is missing "{"
    if (lines[40].trim().startsWith('"name":')) {
        console.log('Found object property without opening brace at line 40. Fixing...');

        // Prepend "    { " to line 40
        // But wait, line 40 already has indentation?
        // "  "name": "U3KVRB14","
        // We want "    { "name": "U3KVRB14","

        // Let's just replace the line with the correct content + indentation
        // But we want to preserve the rest of the line.

        lines[40] = '    { ' + lines[40].trim();

        const newContent = lines.join('\n');
        fs.writeFileSync(filePath, newContent, 'utf8');
        console.log('Successfully prepended "{" to line 40.');
    } else {
        console.log('Line 40 does not look like "name": ... Aborting.');
    }

} catch (err) {
    console.error('Error fixing file:', err);
}
