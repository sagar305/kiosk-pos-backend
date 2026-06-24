import mongoose from 'mongoose';
import { nextSequence } from './Counter.js';
import tenantPlugin from '../utils/tenantPlugin.js';

// Recipe line: how much of an ingredient is consumed per unit of this product
// sold (e.g. Coffee -> 100ml milk, 150ml water, 8g coffee, 10g sugar).
const recipeLineSchema = new mongoose.Schema(
  {
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    qty: { type: Number, required: true },
  },
  { _id: false }
);

const productSchema = new mongoose.Schema(
  {
    itemCode: { type: String },
    name: { type: String, required: true },
    image: String,
    category: { type: mongoose.Schema.Types.ObjectId, ref: 'Category', required: true },
    price: { type: Number, required: true, default: 0 },
    taxIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Tax' }],
    recipe: { type: [recipeLineSchema], default: [] },
    available: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.pre('save', async function (next) {
  if (!this.itemCode) {
    const seq = await nextSequence('product');
    this.itemCode = `ITEM-${String(seq).padStart(5, '0')}`;
  }
  next();
});

productSchema.plugin(tenantPlugin);
productSchema.index({ businessId: 1, itemCode: 1 }, { unique: true });

export default mongoose.model('Product', productSchema);
