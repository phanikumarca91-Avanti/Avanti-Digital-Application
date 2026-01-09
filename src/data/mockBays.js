// Simulating 6760 Warehouse Bays
// 3640 Raw Material Bays (RMFK...)
// 3120 Finished Goods Bays (FGFK...)

const generateBays = () => {
    const bays = [];

    // 1. Raw Material Bays (RMFK...)
    // Structure: RMFK + Unit(1-3) + Row(A-Z) + Level(1-5) + Bin(1-10)
    // Let's generate a subset for demo, but structure it to look like 3640
    // For demo, we'll generate ~500 RM bays
    const units = ['1', '2', '3'];
    const rows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];
    const levels = ['1', '2', '3', '4'];
    const bins = ['1', '2', '3', '4', '5'];

    units.forEach(u => {
        rows.forEach(r => {
            levels.forEach(l => {
                bins.forEach(b => {
                    bays.push({
                        id: `RMFK${u}${r}${l}${b}`,
                        unit: `Unit-${u}`, // Explicit unit
                        type: 'Raw Material',
                        status: 'Empty',
                        material: null,
                        batchId: null
                    });
                });
            });
        });
    });

    // Add FDJ Bays (Gujarat)
    const fdjRows = ['A', 'B', 'C', 'D'];
    fdjRows.forEach(r => {
        levels.forEach(l => {
            bins.forEach(b => {
                bays.push({
                    id: `RMFKFDJ${r}${l}${b}`,
                    unit: 'FDJ', // Explicit unit for FDJ
                    type: 'Raw Material',
                    status: 'Empty', // Start empty for testing
                    material: null,
                    batchId: null
                });
            });
        });
    });

    // 2. Finished Goods Bays (FGFK...)
    // User requested ~3120 FG Bays.
    // Structure: FGFK + Unit(1-3) + Row(A-Z) + Level(1-5) + Bin(1-20)
    // Let's generate a larger set for FG to match request
    const fgRows = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J', 'K', 'L', 'M']; // 13 rows
    const fgLevels = ['1', '2', '3', '4', '5']; // 5 levels
    const fgBins = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12', '13', '14', '15', '16']; // 16 bins

    // 3 units * 13 rows * 5 levels * 16 bins = 3120 bays
    units.forEach(u => {
        fgRows.forEach(r => {
            fgLevels.forEach(l => {
                fgBins.forEach(b => {
                    bays.push({
                        id: `FGFK${u}${r}${l}${b}`,
                        unit: `Unit-${u}`,
                        type: 'Finished Goods',
                        status: 'Empty',
                        material: null,
                        batchId: null
                    });
                });
            });
        });
    });

    return bays;
};

export const MOCK_BAYS = generateBays();
