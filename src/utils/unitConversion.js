// Ingredients are stocked in a "stock unit" (kg, l, pc) but recipes are
// authored in a smaller, more precise "recipe unit" (g, ml, pc) — e.g. stock
// is bought and counted in kilograms, but a coffee recipe calls for 8 grams.
const CONVERSIONS = {
  kg: { recipeUnit: 'g', factor: 1000 },
  l: { recipeUnit: 'ml', factor: 1000 },
  g: { recipeUnit: 'g', factor: 1 },
  ml: { recipeUnit: 'ml', factor: 1 },
  pc: { recipeUnit: 'pc', factor: 1 },
};

export function recipeUnitFor(stockUnit) {
  return CONVERSIONS[stockUnit]?.recipeUnit || stockUnit;
}

// Converts a quantity expressed in the ingredient's recipe unit into the
// ingredient's stock unit, for stock deduction/restock arithmetic.
export function toStockQty(stockUnit, recipeQty) {
  const factor = CONVERSIONS[stockUnit]?.factor || 1;
  return recipeQty / factor;
}
