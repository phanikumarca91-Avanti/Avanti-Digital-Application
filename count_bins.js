import { MASTER_DATA } from './src/data/masterData.js';

console.log('WAREHOSUE_BIN_LOCATIONS count:', MASTER_DATA.WAREHOSUE_BIN_LOCATIONS ? MASTER_DATA.WAREHOSUE_BIN_LOCATIONS.length : 0);
console.log('BIN_NAME_MASTERS count:', MASTER_DATA.BIN_NAME_MASTERS ? MASTER_DATA.BIN_NAME_MASTERS.length : 0);

if (MASTER_DATA.WAREHOSUE_BIN_LOCATIONS) {
    const units = {};
    MASTER_DATA.WAREHOSUE_BIN_LOCATIONS.forEach(b => {
        units[b.unit] = (units[b.unit] || 0) + 1;
    });
    console.log('WAREHOSUE_BIN_LOCATIONS per unit:', units);
}

if (MASTER_DATA.BIN_NAME_MASTERS) {
    const units = {};
    MASTER_DATA.BIN_NAME_MASTERS.forEach(b => {
        units[b.unit] = (units[b.unit] || 0) + 1;
    });
    console.log('BIN_NAME_MASTERS per unit:', units);
}
