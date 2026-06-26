import Ingredient from '../models/Ingredient.js';
import StockLog from '../models/StockLog.js';
import StockBatch from '../models/StockBatch.js';
import PurchaseOrder from '../models/PurchaseOrder.js';

export const listIngredients = async (req, res) => res.json(await Ingredient.find());

export const listLowStock = async (req, res) => {
  const ingredients = await Ingredient.find({ active: true });
  res.json(ingredients.filter((i) => i.stockQty <= i.thresholdQty));
};

export const createIngredient = async (req, res) => {
  try {
    const { expiryDate, ...body } = req.body;
    const ingredient = await Ingredient.create(body);

    if (ingredient.stockQty > 0) {
      await StockBatch.create({
        ingredient: ingredient._id,
        qty: ingredient.stockQty,
        expiryDate: expiryDate ? new Date(expiryDate) : undefined,
        source: 'opening',
      });
    }

    res.status(201).json(ingredient);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateIngredient = async (req, res) => {
  const ingredient = await Ingredient.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!ingredient) return res.status(404).json({ error: 'Not found' });
  res.json(ingredient);
};

export const deleteIngredient = async (req, res) => {
  const poCount = await PurchaseOrder.countDocuments({ ingredient: req.params.id });
  if (poCount > 0) {
    return res
      .status(400)
      .json({ error: 'Cannot delete an ingredient with purchase order history. Deactivate it instead.' });
  }
  await Ingredient.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};

// Manual stock adjustment (e.g. wastage, stock count correction), independent
// of order consumption and purchase receiving.
export const adjustStock = async (req, res) => {
  const { qtyChange, reason, expiryDate } = req.body;
  const ingredient = await Ingredient.findById(req.params.id);
  if (!ingredient) return res.status(404).json({ error: 'Not found' });

  ingredient.stockQty = Math.max(0, ingredient.stockQty + Number(qtyChange));
  await ingredient.save();

  await StockLog.create({
    ingredient: ingredient._id,
    type: 'adjustment',
    qtyChange: Number(qtyChange),
    reason,
    createdBy: req.user._id,
  });

  if (Number(qtyChange) > 0) {
    await StockBatch.create({
      ingredient: ingredient._id,
      qty: Number(qtyChange),
      expiryDate: expiryDate ? new Date(expiryDate) : undefined,
      source: 'opening',
    });
  }

  res.json(ingredient);
};

// Nearest-expiry batch per ingredient with remaining qty > 0, for surfacing
// expiry visibility in the inventory UI (FEFO ledger, not the stock total).
export const listNearestExpiry = async (req, res) => {
  const batches = await StockBatch.find({ qty: { $gt: 0 }, expiryDate: { $ne: null } }).sort({ expiryDate: 1 });
  const nearest = new Map();
  for (const batch of batches) {
    const key = String(batch.ingredient);
    if (!nearest.has(key)) nearest.set(key, batch);
  }
  res.json(
    [...nearest.values()].map((b) => ({ ingredient: b.ingredient, qty: b.qty, expiryDate: b.expiryDate }))
  );
};

export const listStockLogs = async (req, res) => {
  const filter = req.query.ingredient ? { ingredient: req.query.ingredient } : {};
  const logs = await StockLog.find(filter).populate('ingredient').populate('createdBy', 'name').sort({ createdAt: -1 });
  res.json(logs);
};
