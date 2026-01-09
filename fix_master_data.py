
import os

file_path = r"C:\Users\Avanti Feeds\.gemini\antigravity\scratch\material-inward-app\src\data\masterData.js"

with open(file_path, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# Line 41 (index 40) is "  ]," which closes the array prematurely.
# We want to remove it so the subsequent objects are included in the array.
# However, we also need to make sure there is a comma after the last item "RMFK2A5" (line 40).
# And we need to make sure the array is eventually closed at the end of the file.

# Let's check the content around the error
print("Line 39:", lines[39])
print("Line 40:", lines[40])
print("Line 41:", lines[41])
print("Line 42:", lines[42])

# Strategy:
# 1. Add a comma to line 40: `    { "name": "RMFK2A5", "unit": "Unit-2" }` -> `    { "name": "RMFK2A5", "unit": "Unit-2" },`
# 2. Remove line 41: `  ],`
# 3. Verify if the file ends correctly. The file is huge, so the end might be correct (closing the array and object).
# If the original file had the array content, and I just prepended the new items and closed it, then the rest of the file is the old items.
# I need to check if the old items are comma-separated correctly.
# Line 42 starts with `{`. It should be fine if the previous line has a comma.

lines[40] = lines[40].strip() + ",\n"
lines.pop(41) # Remove the closing bracket

with open(file_path, 'w', encoding='utf-8') as f:
    f.writelines(lines)

print("Fixed masterData.js")
