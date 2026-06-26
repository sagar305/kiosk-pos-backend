import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    currency: { type: String, default: 'INR' },
    theme: {
      primaryColor: { type: String, default: '' },
      secondaryColor: { type: String, default: '' },
    },
    settings: {
      // Default permission applied to new pos_manager/cashier users; an owner
      // can still override the flag per-user on User.permissions.canRefund.
      cashierCanRefundByDefault: { type: Boolean, default: false },
      lowStockAlertEnabled: { type: Boolean, default: true },
      autoCreatePurchaseOrder: { type: Boolean, default: true },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Business', businessSchema);
