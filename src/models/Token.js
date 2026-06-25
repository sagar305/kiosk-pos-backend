import mongoose from 'mongoose';
import tenantPlugin from '../utils/tenantPlugin.js';
import outletPlugin from '../utils/outletPlugin.js';

// A chosen customisation option, snapshotted at order time (name/priceDelta
// recorded here too, since the product's own option could change later).
const selectedOptionSchema = new mongoose.Schema(
  {
    group: { type: String, required: true },
    option: { type: mongoose.Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    priceDelta: { type: Number, default: 0 },
  },
  { _id: false }
);

const itemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    price: { type: Number, required: true },
    qty: { type: Number, required: true, default: 1 },
    notes: { type: String, default: '' },
    selectedOptions: { type: [selectedOptionSchema], default: [] },
    itemStatus: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'unavailable'],
      default: 'pending',
    },
  },
  { timestamps: true }
);

const paymentSchema = new mongoose.Schema(
  {
    method: { type: String, enum: ['cash', 'upi', 'card', 'wallet'], required: true },
    amount: { type: Number, required: true },
    reference: String,
  },
  { timestamps: true }
);

const tokenSchema = new mongoose.Schema(
  {
    tokenNumber: { type: Number, required: true },
    tokenDate: { type: String, required: true }, // YYYY-MM-DD, for daily reset/search
    items: { type: [itemSchema], default: [] },

    itemsSubtotal: { type: Number, default: 0 },
    discountType: { type: String, enum: ['value', 'percent'], default: 'value' },
    discountValue: { type: Number, default: 0 },
    discountTotal: { type: Number, default: 0 },
    discountReason: String,
    appliedCoupon: { type: mongoose.Schema.Types.ObjectId, ref: 'Coupon', default: null },
    taxTotal: { type: Number, default: 0 },
    feesTotal: { type: Number, default: 0 },
    tipAmount: { type: Number, default: 0 },
    total: { type: Number, default: 0 },

    payments: { type: [paymentSchema], default: [] },
    paymentStatus: {
      type: String,
      enum: ['unpaid', 'paid', 'partially_refunded', 'refunded'],
      default: 'unpaid',
    },

    status: {
      type: String,
      enum: ['pending', 'preparing', 'ready', 'completed', 'cancelled'],
      default: 'pending',
    },

    customerName: String,
    customerMobile: String,

    cashier: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    cancelledReason: String,
    refundAmount: { type: Number, default: 0 },
    refundReason: String,
    refundedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

tokenSchema.plugin(tenantPlugin);
tokenSchema.plugin(outletPlugin);
tokenSchema.index({ businessId: 1, outlet: 1, tokenDate: 1, tokenNumber: 1 }, { unique: true });

export default mongoose.model('Token', tokenSchema);
