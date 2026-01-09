export const SECURITY_REGISTERS = {
    LORRY_YARD: {
        id: 'lorry_yard',
        label: 'Lorry Yard',
        fields: [
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'inTime', label: 'In Time', type: 'time', required: true },
            { name: 'vehicleNo', label: 'Vehicle No', type: 'text', required: true },
            { name: 'supplierName', label: 'Supplier Name', type: 'text', required: true, masterList: 'SUPPLIERS' },
            { name: 'invoiceNumber', label: 'Invoice Number', type: 'text', required: true },
            { name: 'invoiceDate', label: 'Invoice Date', type: 'date', required: true },
            { name: 'materialName', label: 'Description of Material', type: 'text', required: true, masterList: 'RAW_MATERIALS' },
            { name: 'remarks', label: 'Remarks', type: 'text' }
        ]
    },
    MATERIAL_INWARD: {
        id: 'material_inward',
        label: 'Material Inward',
        fields: [
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'inTime', label: 'In Time', type: 'time', required: true },
            { name: 'vehicleNo', label: 'Vehicle No', type: 'text', required: true },
            { name: 'supplierName', label: 'Supplier Name', type: 'text', required: true, masterList: 'SUPPLIERS' },
            { name: 'materialName', label: 'Material Name', type: 'text', required: true, masterList: 'RAW_MATERIALS' },
            { name: 'poNumber', label: 'PO Number', type: 'text' },
            { name: 'driverName', label: 'Driver Name', type: 'text' },
            { name: 'driverLicense', label: 'Driver License', type: 'text' },
            { name: 'remarks', label: 'Remarks', type: 'text' }
        ]
    },
    FEED_DISPATCH: {
        id: 'feed_dispatch',
        label: 'Feed Dispatch',
        fields: [
            { name: 'invoiceDate', label: 'Invoice Date', type: 'date', required: true },
            { name: 'vehicleArrivingDate', label: 'Vehicle Arriving Date', type: 'datetime-local', required: true },
            { name: 'dcNo', label: 'Invoice Number', type: 'text', required: true },
            { name: 'vehicleNo', label: 'Vehicle No', type: 'text', required: true },
            { name: 'descriptionOfFeed', label: 'Description of Feed', type: 'text', required: true, masterList: 'FINISHED_GOODS' },
            { name: 'noOfBags', label: 'No of Bags', type: 'number', required: true },
            { name: 'destinationAddress', label: 'Destination Address', type: 'text', required: true },
            { name: 'remarks', label: 'Remarks', type: 'text' }
        ]
    },
    RM_INWARD: {
        id: 'rm_inward',
        label: 'RM Inward',
        fields: [
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'inTime', label: 'In Time', type: 'time', required: true },
            { name: 'outTime', label: 'Out Time', type: 'time' },
            { name: 'vehicleNo', label: 'Vehicle No', type: 'text', required: true },
            { name: 'unit', label: 'Unit', type: 'text', required: true },
            { name: 'supplierName', label: 'Supplier Name', type: 'text', required: true, masterList: 'SUPPLIERS' },
            { name: 'invoiceNumber', label: 'Invoice Number', type: 'text', required: true },
            { name: 'invoiceDate', label: 'Invoice Date', type: 'date', required: true },
            { name: 'materialDesc', label: 'Description of Material', type: 'text', required: true, masterList: 'RAW_MATERIALS' },
            { name: 'uom', label: 'UOM', type: 'text', required: true, masterList: 'UOM_MASTER' },
            { name: 'invoiceAmount', label: 'Invoice Amount', type: 'number', required: true },
            { name: 'qtyBags', label: 'Quantity (Bags)', type: 'number', required: true },
            { name: 'qtyMts', label: 'Quantity', type: 'number', required: true },
            { name: 'ratePerUOM', label: 'Rate per UOM', type: 'number', readOnly: true },
            { name: 'remarks', label: 'Remarks', type: 'text' }
        ]
    },
    STORES_INWARD: {
        id: 'stores_inward',
        label: 'Stores Inward',
        fields: [
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'inTime', label: 'In Time', type: 'time', required: true },
            { name: 'outTime', label: 'Out Time', type: 'time' },
            { name: 'vehicleNo', label: 'Vehicle No', type: 'text', required: true },
            { name: 'supplierName', label: 'Supplier Name', type: 'text', required: true, masterList: 'SUPPLIERS' },
            { name: 'invoiceNumber', label: 'Invoice Number', type: 'text', required: true },
            { name: 'invoiceDate', label: 'Invoice Date', type: 'date', required: true },
            { name: 'materialDesc', label: 'Description of Material', type: 'text', required: true, masterList: 'STORES_SPARES' },
            { name: 'qtyBags', label: 'Quantity (Bags)', type: 'number', required: true },
            { name: 'qtyMts', label: 'Quantity (MTS)', type: 'number', required: true },
            { name: 'remarks', label: 'Remarks', type: 'text' }
        ]
    },
    RETURNABLE: {
        id: 'returnable',
        label: 'Returnable',
        fields: [
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'inTime', label: 'In Time', type: 'time', required: true },
            { name: 'outTime', label: 'Out Time', type: 'time' },
            { name: 'gpNo', label: 'GP No', type: 'text', required: true },
            { name: 'vehicleNo', label: 'Vehicle No', type: 'text', required: true },
            { name: 'qty', label: 'Quantity', type: 'text', required: true },
            { name: 'material', label: 'Material', type: 'text', required: true },
            { name: 'address', label: 'Address', type: 'text', required: true },
            { name: 'authority', label: 'Authority', type: 'text', required: true }
        ]
    },
    INTER_UNIT_IN: {
        id: 'inter_unit_in',
        label: 'Material Inter Unit In',
        fields: [
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'inTime', label: 'In Time', type: 'time', required: true },
            { name: 'miutNo', label: 'MIUT No', type: 'text', required: true },
            { name: 'vehicleNo', label: 'Vehicle No', type: 'text', required: true },
            { name: 'fromUnit', label: 'From Unit', type: 'text', required: true },
            { name: 'materialType', label: 'Type of Material', type: 'text', required: true },
            { name: 'materialDesc', label: 'Description of Material', type: 'text', required: true },
            { name: 'qtyBags', label: 'Quantity (Bags)', type: 'number', required: true },
            { name: 'qtyMts', label: 'Quantity (MTS)', type: 'number', required: true },
            { name: 'authorizedBy', label: 'Transfer Authorised By', type: 'text', required: true }
        ]
    },
    INTER_UNIT_OUT: {
        id: 'inter_unit_out',
        label: 'Material Inter Unit Out',
        fields: [
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'outTime', label: 'Out Time', type: 'time', required: true },
            { name: 'miutNo', label: 'MIUT No', type: 'text', required: true },
            { name: 'vehicleNo', label: 'Vehicle No', type: 'text', required: true },
            { name: 'toUnit', label: 'To Unit', type: 'text', required: true },
            { name: 'materialType', label: 'Type of Material', type: 'text', required: true },
            { name: 'materialDesc', label: 'Description of Material', type: 'text', required: true },
            { name: 'qtyBags', label: 'Quantity (Bags)', type: 'number', required: true },
            { name: 'qtyMts', label: 'Quantity (MTS)', type: 'number', required: true },
            { name: 'authorizedBy', label: 'Transfer Authorised By', type: 'text', required: true }
        ]
    },
    BRAN_SALES: {
        id: 'bran_sales',
        label: 'Bran Sales',
        fields: [
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'outTime', label: 'Out Time', type: 'time', required: true },
            { name: 'gpNo', label: 'GP No', type: 'text', required: true },
            { name: 'vehicleNo', label: 'Vehicle No', type: 'text', required: true },
            { name: 'address', label: 'Address', type: 'text', required: true },
            { name: 'partyName', label: 'Party Name', type: 'text', required: true, masterList: 'CUSTOMER_MASTER' },
            { name: 'material', label: 'Material', type: 'text', required: true },
            { name: 'noOfBags', label: 'No of Bags', type: 'number', required: true },
            { name: 'quantity', label: 'Quantity', type: 'text', required: true },
            { name: 'authorizedBy', label: 'Authorised By', type: 'text', required: true }
        ]
    },
    SCRAP_SALES: {
        id: 'scrap_sales',
        label: 'Scrap Sales',
        fields: [
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'outTime', label: 'Out Time', type: 'time', required: true },
            { name: 'gpNo', label: 'GP No', type: 'text', required: true },
            { name: 'vehicleNo', label: 'Vehicle No', type: 'text', required: true },
            { name: 'material', label: 'Material', type: 'text', required: true },
            { name: 'quantity', label: 'Quantity', type: 'text', required: true },
            { name: 'address', label: 'Address', type: 'text', required: true },
            { name: 'authorizedBy', label: 'Authorised By', type: 'text', required: true }
        ]
    },
    NON_RETURNABLE: {
        id: 'non_returnable',
        label: 'Non Returnable',
        fields: [
            { name: 'date', label: 'Date', type: 'date', required: true },
            { name: 'inTime', label: 'In Time', type: 'time', required: true },
            { name: 'outTime', label: 'Out Time', type: 'time' },
            { name: 'gpNo', label: 'GP No', type: 'text', required: true },
            { name: 'vehicleNo', label: 'Vehicle No', type: 'text', required: true },
            { name: 'quantity', label: 'Quantity', type: 'text', required: true },
            { name: 'material', label: 'Material', type: 'text', required: true },
            { name: 'address', label: 'Address', type: 'text', required: true },
            { name: 'authorizedBy', label: 'Authorised By', type: 'text', required: true }
        ]
    },
    FISH_FEED_DISPATCH: {
        id: 'fish_feed_dispatch',
        label: 'Fish Feed Dispatch',
        fields: [
            { name: 'invoiceDate', label: 'Invoice Date', type: 'date', required: true },
            { name: 'vehicleArrivingDate', label: 'Vehicle Arriving Date', type: 'datetime-local', required: true },
            { name: 'outTime', label: 'Out Time', type: 'time' },
            { name: 'dcNo', label: 'DC No', type: 'text', required: true },
            { name: 'vehicleNo', label: 'Vehicle No', type: 'text', required: true },
            { name: 'descriptionOfFeed', label: 'Description of Feed', type: 'text', required: true, masterList: 'FINISHED_GOODS' },
            { name: 'noOfBags', label: 'No of Bags', type: 'number', required: true },
            { name: 'destinationAddress', label: 'Destination Address', type: 'text', required: true },
            { name: 'remarks', label: 'Remarks', type: 'text' }
        ]
    }
};
