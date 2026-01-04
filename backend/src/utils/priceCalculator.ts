/**
 * Calculate price per unit from size string and price
 *
 * Supports:
 * - Weight units: kg, g, mg (normalized to kg)
 * - Volume units: L, l, ml, mL (normalized to L)
 * - Count units: pieces, pcs, pc, st, stk, stück, x, count, units (per piece)
 *
 * @param size - Size string (e.g., "1kg", "500g", "1L", "500ml", "6 pieces")
 * @param price - Price as number or string
 * @returns Normalized price per unit as number, or null if invalid/unparseable
 *
 * @example
 * calculatePricePerUnit("1kg", 2.50) // → 2.50 per kg
 * calculatePricePerUnit("500g", 1.20) // → 2.40 per kg
 * calculatePricePerUnit("1L", 2.50) // → 2.50 per L
 * calculatePricePerUnit("500ml", 1.80) // → 3.60 per L
 * calculatePricePerUnit("6 pieces", 3.60) // → 0.60 per piece
 * calculatePricePerUnit("invalid", 2.50) // → null
 */
export function calculatePricePerUnit(
  size: string | null | undefined,
  price: number | string | { toNumber: () => number }
): number | null {
  // Handle null/undefined/empty size
  if (!size || size.trim() === '') {
    return null;
  }

  // Convert price to number
  let priceNum: number;
  if (typeof price === 'string') {
    priceNum = parseFloat(price);
  } else if (typeof price === 'object' && price !== null && typeof price.toNumber === 'function') {
    // Handle Prisma Decimal type
    priceNum = price.toNumber();
  } else {
    priceNum = Number(price);
  }

  // Validate price
  if (isNaN(priceNum) || priceNum <= 0) {
    return null;
  }

  // Parse size string with regex
  const pattern = /^(\d+(?:\.\d+)?)\s*(kg|g|mg|l|L|ml|mL|pieces?|pcs?|pc|st|stk|stück|x|count|units?)$/i;
  const match = size.trim().match(pattern);

  if (!match) {
    return null; // Invalid format
  }

  const amount = parseFloat(match[1]);
  const unit = match[2].toLowerCase();

  // Calculate normalized amount in base units
  let normalizedAmount: number;

  // Weight (normalize to kg)
  if (unit === 'kg') {
    normalizedAmount = amount;
  } else if (unit === 'g') {
    normalizedAmount = amount / 1000;
  } else if (unit === 'mg') {
    normalizedAmount = amount / 1000000;
  }
  // Volume (normalize to L)
  else if (unit === 'l') {
    normalizedAmount = amount;
  } else if (unit === 'ml') {
    normalizedAmount = amount / 1000;
  }
  // Count (normalize to per piece)
  else if (['piece', 'pieces', 'pcs', 'pc', 'st', 'stk', 'stück', 'x', 'count', 'unit', 'units'].includes(unit)) {
    normalizedAmount = amount;
  }
  else {
    return null; // Unknown unit
  }

  // Validate normalized amount
  if (normalizedAmount <= 0) {
    return null;
  }

  // Calculate price per normalized unit
  const pricePerUnit = priceNum / normalizedAmount;

  // Return as number with 2 decimal places
  return parseFloat(pricePerUnit.toFixed(2));
}
