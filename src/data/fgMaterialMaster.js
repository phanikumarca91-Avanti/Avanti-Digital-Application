/**
 * FG Material Master Data
 * Single source of truth for Finished Goods product specifications
 * 
 * Key: Grade name (as it appears in production/warehouse)
 * Value: Product specifications including bag weight
 */

export const FG_MATERIAL_MASTER = {
    // TITAN Series - 10 KG
    "TITAN NO.1 - 10 KG": {
        productName: "TITAN NO.1",
        brand: "TITAN NO",
        grade: "TITAN NO.1 - 10 KG",
        bagWeight: 10,
        category: "SHRIMP FEED",
        uom: "MT"
    },

    // TITAN Series - 25 KG
    "TITAN NO.1 - 25 KG": {
        productName: "TITAN NO.1",
        brand: "TITAN NO",
        grade: "TITAN NO.1 - 25 KG",
        bagWeight: 25,
        category: "SHRIMP FEED",
        uom: "MT"
    },
    "TITAN NO.2 - 25 KG": {
        productName: "TITAN NO.2",
        brand: "TITAN NO",
        grade: "TITAN NO.2 - 25 KG",
        bagWeight: 25,
        category: "SHRIMP FEED",
        uom: "MT"
    },
    "TITAN NO.3SP - 25 KG": {
        productName: "TITAN NO.3SP",
        brand: "TITAN NO",
        grade: "TITAN NO.3SP - 25 KG",
        bagWeight: 25,
        category: "SHRIMP FEED",
        uom: "MT"
    },
    "TITAN NO.3S - 25 KG": {
        productName: "TITAN NO.3S",
        brand: "TITAN NO",
        grade: "TITAN NO.3S - 25 KG",
        bagWeight: 25,
        category: "SHRIMP FEED",
        uom: "MT"
    },
    "TITAN NO.3A - 25 KG": {
        productName: "TITAN NO.3A",
        brand: "TITAN NO",
        grade: "TITAN NO.3A - 25 KG",
        bagWeight: 25,
        category: "SHRIMP FEED",
        uom: "MT"
    },
    "TITAN NO.3B - 25 KG": {
        productName: "TITAN NO.3B",
        brand: "TITAN NO",
        grade: "TITAN NO.3B - 25 KG",
        bagWeight: 25,
        category: "SHRIMP FEED",
        uom: "MT"
    },
    "TITAN NO.4 - 25 KG": {
        productName: "TITAN NO.4",
        brand: "TITAN NO",
        grade: "TITAN NO.4 - 25 KG",
        bagWeight: 25,
        category: "SHRIMP FEED",
        uom: "MT"
    },

    // MANAMEI Series - 25 KG
    "MANAMEI - 3SP 25KG": {
        productName: "MANAMEI",
        brand: "MANAMEI",
        grade: "MANAMEI - 3SP 25KG",
        bagWeight: 25,
        category: "SHRIMP FEED",
        uom: "MT"
    },
    "MANAMEI - 3P 25KG": {
        productName: "MANAMEI",
        brand: "MANAMEI",
        grade: "MANAMEI - 3P 25KG",
        bagWeight: 25,
        category: "SHRIMP FEED",
        uom: "MT"
    },
    "MANAMEI - 3S 25KG": {
        productName: "MANAMEI",
        brand: "MANAMEI",
        grade: "MANAMEI - 3S 25KG",
        bagWeight: 25,
        category: "SHRIMP FEED",
        uom: "MT"
    },
    "MANAMEI - 3M 25KG": {
        productName: "MANAMEI",
        brand: "MANAMEI",
        grade: "MANAMEI - 3M 25KG",
        bagWeight: 25,
        category: "SHRIMP FEED",
        uom: "MT"
    },
    "MANAMEI - 1 25KG": {
        productName: "MANAMEI",
        brand: "MANAMEI",
        grade: "MANAMEI - 1 25KG",
        bagWeight: 25,
        category: "SHRIMP FEED",
        uom: "MT"
    },

    // HIGH BOOST Series - 1 KG
    "HIGH BOOST-1 - 1KG": {
        productName: "HIGH BOOST-1",
        brand: "HIGH BOOST",
        grade: "HIGH BOOST-1 - 1KG",
        bagWeight: 1,
        category: "SHRIMP FEED",
        uom: "MT"
    },
    // Alias for variation without space
    "HIGH BOOST-1 -1KG": {
        productName: "HIGH BOOST-1",
        brand: "HIGH BOOST",
        grade: "HIGH BOOST-1 -1KG",
        bagWeight: 1,
        category: "SHRIMP FEED",
        uom: "MT"
    },
    "HIGH BOOST-2 - 1KG": {
        productName: "HIGH BOOST-2",
        brand: "HIGH BOOST",
        grade: "HIGH BOOST-2 - 1KG",
        bagWeight: 1,
        category: "SHRIMP FEED",
        uom: "MT"
    },
    "HIGH BOOST-3 - 1KG": {
        productName: "HIGH BOOST-3",
        brand: "HIGH BOOST",
        grade: "HIGH BOOST-3 - 1KG",
        bagWeight: 1,
        category: "SHRIMP FEED",
        uom: "MT"
    }
};

/**
 * Helper function to get product info by grade name
 * @param {string} gradeName - The grade field from lot/bay data
 * @returns {object|null} Product specifications or null if not found
 */
export const getProductByGrade = (gradeName) => {
    if (!gradeName) return null;
    return FG_MATERIAL_MASTER[gradeName] || null;
};

/**
 * Helper function to get bag weight by grade name
 * @param {string} gradeName - The grade field from lot/bay data
 * @returns {number} Bag weight in KG (defaults to 25 if not found)
 */
export const getBagWeightByGrade = (gradeName) => {
    const product = getProductByGrade(gradeName);
    return product?.bagWeight || 25; // Default to 25kg
};

/**
 * Get all unique product names
 * @returns {string[]} Array of product names
 */
export const getAllProductNames = () => {
    return [...new Set(Object.values(FG_MATERIAL_MASTER).map(p => p.productName))];
};

/**
 * Get all grades for a specific product
 * @param {string} productName 
 * @returns {string[]} Array of grade names
 */
export const getGradesForProduct = (productName) => {
    return Object.values(FG_MATERIAL_MASTER)
        .filter(p => p.productName === productName)
        .map(p => p.grade);
};
