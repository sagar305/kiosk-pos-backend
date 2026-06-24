import PurchaseOrder from '../models/PurchaseOrder.js';
import Ingredient from '../models/Ingredient.js';
import StockLog from '../models/StockLog.js';

export const listPurchaseOrders = async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  const pos = await PurchaseOrder.find(filter).populate('ingredient').populate('createdBy', 'name').sort({ createdAt: -1 });
  res.json(pos);
};

// Manual purchase entry — owner/manager ordering stock ahead of a threshold breach.
export const createPurchaseOrder = async (req, res) => {
  try {
    const { ingredient, qtyOrdered } = req.body;
    const po = await PurchaseOrder.create({ ingredient, qtyOrdered, createdBy: req.user._id });
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

  ingredient.stockQty += po.qtyOrdered;
  await ingredient.save();

  await StockLog.create({
    ingredient: ingredient._id,
    type: 'purchase',
    qtyChange: po.qtyOrdered,
    reason: `Received ${po.poCode}`,
    createdBy: req.user._id,
  });

  po.status = 'received';
  po.receivedAt = new Date();
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
