import mongoose from 'mongoose';
import tenantPlugin from '../utils/tenantPlugin.js';

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    unit: { type: String, enum: ['g', 'kg', 'ml', 'l', 'pc'], required: true },
    stockQty: { type: Number, default: 0 },
    thresholdQty: { type: Number, default: 0 },
    reorderQty: { type: Number, default: 0 },
    costPerUnit: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

ingredientSchema.plugin(tenantPlugin);
ingredientSchema.index({ businessId: 1, name: 1 }, { unique: true });

export default mongoose.model('Ingredient', ingredientSchema);
