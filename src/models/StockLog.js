import mongoose from 'mongoose';
import tenantPlugin from '../utils/tenantPlugin.js';
import outletPlugin from '../utils/outletPlugin.js';

const stockLogSchema = new mongoose.Schema(
  {
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    type: { type: String, enum: ['purchase', 'adjustment', 'consumption', 'restock'], required: true },
    qtyChange: { type: Number, required: true },
    reason: String,
    token: { type: mongoose.Schema.Types.ObjectId, ref: 'Token' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

stockLogSchema.plugin(tenantPlugin);
stockLogSchema.plugin(outletPlugin);

export default mongoose.model('StockLog', stockLogSchema);
