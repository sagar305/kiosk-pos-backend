import PurchaseOrder from '../models/PurchaseOrder.js';
import Ingredient from '../models/Ingredient.js';
import StockLog from '../models/StockLog.js';
import StockBatch from '../models/StockBatch.js';
import Expense from '../models/Expense.js';

function round3(n) {
  return Math.round(n * 1000) / 1000;
}

export const listPurchaseOrders = async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const pos = await PurchaseOrder.find(filter)
    .populate('ingredient')
    .populate('createdBy', 'name')
    .populate('requestedBy', 'name')
    .sort({ createdAt: -1 });
  res.json(pos);
};

// Manual purchase entry — owner/manager ordering stock ahead of a threshold breach.
export const createPurchaseOrder = async (req, res) => {
  try {
    const { ingredient, qtyOrdered, unitPrice } = req.body;
    const po = await PurchaseOrder.create({ ingredient, qtyOrdered, unitPrice, createdBy: req.user._id });
    res.status(201).json(po);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// pos_manager flags an ingredient that's running low/out, with a reason —
// lands in the same PO queue an owner orders from, just tagged with who asked.
export const requestPurchaseOrder = async (req, res) => {
  try {
    const { ingredient, qtyOrdered, reason } = req.body;
    const po = await PurchaseOrder.create({
      ingredient,
      qtyOrdered,
      requestedReason: reason,
      requestedBy: req.user._id,
      createdBy: req.user._id,
    });
    res.status(201).json(po);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const receivePurchaseOrder = async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) return res.status(404).json({ error: 'Not found' });
  if (po.status !== 'pending') return res.status(400).json({ error: 'Purchase order already finalized' });

  const ingredient = await Ingredient.findById(po.ingredient);
  if (!ingredient) return res.status(404).json({ error: 'Ingredient not found' });

  const receivedQty = req.body.receivedQty != null ? Number(req.body.receivedQty) : po.qtyOrdered;
  const pricePerUnit =
    req.body.pricePerUnit != null ? Number(req.body.pricePerUnit) : po.unitPrice ?? ingredient.costPerUnit;
  const expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : undefined;

  const oldStock = ingredient.stockQty;
  const oldCost = ingredient.costPerUnit;
  ingredient.stockQty = round3(oldStock + receivedQty);
  // Weighted-average cost across existing stock and the newly received lot,
  // so menu costing reflects the blended price rather than just the latest one.
  ingredient.costPerUnit =
    ingredient.stockQty > 0 ? round3((oldStock * oldCost + receivedQty * pricePerUnit) / ingredient.stockQty) : pricePerUnit;
  ingredient.lastPurchasePrice = pricePerUnit;
  ingredient.lastPurchaseDate = new Date();
  await ingredient.save();

  await StockLog.create({
    ingredient: ingredient._id,
    type: 'purchase',
    qtyChange: receivedQty,
    reason: `Received ${po.poCode}`,
    createdBy: req.user._id,
  });

  await StockBatch.create({
    ingredient: ingredient._id,
    qty: receivedQty,
    expiryDate,
    purchaseOrder: po._id,
  });

  await Expense.create({
    category: 'stock_purchase',
    amount: round3(receivedQty * pricePerUnit),
    description: `${po.poCode} — ${ingredient.name} (${receivedQty} ${ingredient.unit})`,
    purchaseOrder: po._id,
    ingredient: ingredient._id,
    createdBy: req.user._id,
  });

  po.status = 'received';
  po.receivedAt = new Date();
  po.receivedQty = receivedQty;
  po.pricePerUnit = pricePerUnit;
  if (expiryDate) po.expiryDate = expiryDate;
  await po.save();

  res.json(po);
};

export const cancelPurchaseOrder = async (req, res) => {
  const po = await PurchaseOrder.findById(req.params.id);
  if (!po) return res.status(404).json({ error: 'Not found' });
  if (po.status !== 'pending') return res.status(400).json({ error: 'Purchase order already finalized' });
  po.status = 'cancelled';
  await po.save();
  res.json(po);
};
