import mongoose from 'mongoose';
import tenantPlugin from '../utils/tenantPlugin.js';
import outletPlugin from '../utils/outletPlugin.js';

const expenseSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: ['stock_purchase', 'wastage', 'utilities', 'salary', 'rent', 'other'],
      required: true,
    },
    amount: { type: Number, required: true },
    description: String,
    date: { type: Date, default: Date.now },
    purchaseOrder: { type: mongoose.Schema.Types.ObjectId, ref: 'PurchaseOrder' },
    ingredient: { type: mongoose.Schema.Types.ObjectId, ref: 'Ingredient' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

expenseSchema.plugin(tenantPlugin);
expenseSchema.plugin(outletPlugin);

export default mongoose.model('Expense', expenseSchema);
