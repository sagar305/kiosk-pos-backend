import Ingredient from '../models/Ingredient.js';
import StockLog from '../models/StockLog.js';

export const listIngredients = async (req, res) => res.json(await Ingredient.find());

export const listLowStock = async (req, res) => {
  const ingredients = await Ingredient.find({ active: true });
  res.json(ingredients.filter((i) => i.stockQty <= i.thresholdQty));
};

export const createIngredient = async (req, res) => {
  try {
    const ingredient = await Ingredient.create(req.body);
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
  await Ingredient.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};

// Manual stock adjustment (e.g. wastage, stock count correction), independent
// of order consumption and purchase receiving.
export const adjustStock = async (req, res) => {
  const { qtyChange, reason } = req.body;
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

  res.json(ingredient);
};

export const listStockLogs = async (req, res) => {
  const filter = req.query.ingredient ? { ingredient: req.query.ingredient } : {};
  const logs = await StockLog.find(filter).populate('ingredient').populate('createdBy', 'name').sort({ createdAt: -1 });
  res.json(logs);
};
