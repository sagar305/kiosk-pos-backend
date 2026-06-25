import mongoose from 'mongoose';
import { nextSequence } from './Counter.js';
import tenantPlugin from '../utils/tenantPlugin.js';
import outletPlugin from '../utils/outletPlugin.js';

// Recipe line: how much of an ingredient is consumed per unit of this product
// sold (e.g. Coffee -> 100ml milk, 150ml water, 8g coffee, 10g sugar). `qty`
// is entered in the ingredient's recipe unit (see utils/unitConversion.js).
const recipeLineSchema = new mongoose.Schema(
  {
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient', required: true },
    qty: { type: Number, required: true },
  },
  { _id: false }
);

// A single choice within a customisation group (e.g. "Large" within "Size").
// Choosing it can add to the price and/or consume extra ingredients on top
// of the product's base recipe (e.g. an extra espresso shot).
const customisationOptionSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    priceDelta: { type: Number, default: 0 },
    recipe: { type: [recipeLineSchema], default: [] },
  },
  { timestamps: false }
);

// A group of mutually-related choices, e.g. "Size" (single-select, required)
// or "Add-ons" (multi-select, optional).
const customisationGroupSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    selectionType: { type: String, enum: ['single', 'multiple'], default: 'single' },
    required: { type: Boolean, default: false },
    options: { type: [customisationOptionSchema], default: [] },
  },
  { timestamps: false }
);

// A combo bundles a fixed quantity of other products at a special price
// (the combo's own `price` field). Ingredient consumption is the sum of the
// bundled products' own recipes.
const comboItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    qty: { type: Number, default: 1 },
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
    type: { type: String, enum: ['product', 'combo'], default: 'product' },
    customisations: { type: [customisationGroupSchema], default: [] },
    comboItems: { type: [comboItemSchema], default: [] },
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
productSchema.plugin(outletPlugin);
productSchema.index({ businessId: 1, itemCode: 1 }, { unique: true });

export default mongoose.model('Product', productSchema);
