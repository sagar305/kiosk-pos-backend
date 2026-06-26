import mongoose from 'mongoose';
import tenantPlugin from '../utils/tenantPlugin.js';
import outletPlugin from '../utils/outletPlugin.js';

// A received lot of stock, tracked separately from Ingredient.stockQty so we
// can tell which units expire when (FEFO) without changing how the overall
// running stock total is maintained elsewhere.
const stockBatchSchema = new mongoose.Schema(
  {
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    qty: { type: Number, required: true }, // remaining qty in this batch, in the ingredient's stock unit
    expiryDate: Date,
    receivedAt: { type: Date, default: Date.now },
    source: { type: String, enum: ['purchase', 'opening'], default: 'purchase' },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
  },
  { timestamps: true }
);

stockBatchSchema.plugin(tenantPlugin);
stockBatchSchema.plugin(outletPlugin);
stockBatchSchema.index({ ingredient: 1, expiryDate: 1 });

export default mongoose.model('StockBatch', stockBatchSchema);
