/**
 * Bag calculation utilities using FG Material Master as source of truth
 */
import { getBagWeightByGrade } from '../data/fgMaterialMaster';

/**
 * Calculates the number of bags based on Quantity (MT) and Grade.
 * Uses FG Material Master for accurate bag weight lookup.
 * Falls back to string parsing for backwards compatibility.
 * 
 * @param {number|string} qtyMT - Quantity in Metric Tonnes
 * @param {string} productName - Name of the product (deprecated, use grade)
 * @param {string} grade - Grade from FG Material Master (preferred)
 * @returns {number} - Number of bags (rounded)
 */
export const calculateBags = (qtyMT, productName, grade = null) => {
    if (!qtyMT) return 0;
    const qty = parseFloat(qtyMT);
    if (isNaN(qty)) return 0;

    let bagWeightKg = 25; // Default

    // PRIORITY 1: Use grade from FG Material Master (most accurate)
    if (grade) {
        bagWeightKg = getBagWeightByGrade(grade);
    }
    // PRIORITY 2: Fallback to string parsing for backwards compatibility
    else if (productName) {
        const name = String(productName).toUpperCase();

        // Try to parse bag weight from product name
        if (name.includes('1KG') || name.includes('1 KG')) {
            bagWeightKg = 1;
        } else if (name.includes('10KG') || name.includes('10 KG')) {
            bagWeightKg = 10;
        } else if (name.includes('25KG') || name.includes('25 KG')) {
            bagWeightKg = 25;
        } else if (name.includes('50KG') || name.includes('50 KG')) {
            bagWeightKg = 50;
        }
    }

    // Convert MT to KG then divide by Bag Weight
    // 1 MT = 1000 KG
    const totalKg = qty * 1000;
    return Math.round(totalKg / bagWeightKg);
};

/**
 * Returns the Bag Weight in KG inferred from grade or product name.
 * @param {string} productName - Product name (fallback)
 * @param {string} grade - Grade from FG Material Master (preferred)
 * @returns {number} Bag weight in KG
 */
export const getBagWeightKg = (productName, grade = null) => {
    // PRIORITY 1: Use grade from FG Material Master
    if (grade) {
        return getBagWeightByGrade(grade);
    }

    // PRIORITY 2: Fallback to string parsing
    if (productName) {
        const name = String(productName).toUpperCase();
        if (name.includes('1KG') || name.includes('1 KG')) return 1;
        if (name.includes('10KG') || name.includes('10 KG')) return 10;
        if (name.includes('25KG') || name.includes('25 KG')) return 25;
        if (name.includes('50KG') || name.includes('50 KG')) return 50;
    }

    return 25; // Default
};

