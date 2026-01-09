import { MASTER_DATA } from './src/data/masterData.js';

console.log('Keys:', Object.keys(MASTER_DATA));

if (MASTER_DATA.WAREHOSUE_BIN_LOCATIONS) {
    console.log('Sample WAREHOSUE_BIN_LOCATIONS:', MASTER_DATA.WAREHOSUE_BIN_LOCATIONS.slice(0, 2));
} else {
    console.log('WAREHOSUE_BIN_LOCATIONS not found');
}

if (MASTER_DATA.BIN_NAME_MASTERS) {
    console.log('Sample BIN_NAME_MASTERS:', MASTER_DATA.BIN_NAME_MASTERS.slice(0, 2));
}
