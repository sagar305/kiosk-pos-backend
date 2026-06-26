import mongoose from 'mongoose';
import tenantPlugin from '../utils/tenantPlugin.js';
import outletPlugin from '../utils/outletPlugin.js';
import { recipeUnitFor } from '../utils/unitConversion.js';

const ingredientSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    // Unit stock is purchased/counted in (e.g. kg, l). Recipes are authored
    // in the smaller recipeUnit (e.g. g, ml) — see utils/unitConversion.js.
    unit: { type: String, enum: ['g', 'kg', 'ml', 'l', 'pc'], required: true },
    stockQty: { type: Number, default: 0 },
    thresholdQty: { type: Number, default: 0 },
    reorderQty: { type: Number, default: 0 },
    costPerUnit: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    // How this ingredient is usually received (e.g. 1 packet = 40 pc), so
    // receiving/adjustment screens can let staff enter "packs" instead of
    // doing the multiplication themselves.
    packSize: { type: Number, default: 1 },
    packLabel: { type: String, default: '' },
    lastPurchasePrice: { type: Number },
    lastPurchaseDate: { type: Date },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

ingredientSchema.virtual('recipeUnit').get(function () {
  return recipeUnitFor(this.unit);
});

ingredientSchema.plugin(tenantPlugin);
ingredientSchema.plugin(outletPlugin);
ingredientSchema.index({ businessId: 1, outlet: 1, name: 1 }, { unique: true });

export default mongoose.model('Ingredient', ingredientSchema);
