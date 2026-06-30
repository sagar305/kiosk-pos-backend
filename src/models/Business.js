import mongoose from 'mongoose';

const businessSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    slug: { type: String, required: true, unique: true },
    ownerId: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    currency: { type: String, default: 'INR' },
    logo: { type: String, default: '' },
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
      autoPrintReceipt: { type: Boolean, default: true },
      manualDrawerOpenLocked: { type: Boolean, default: false },
      // POS UI language; outlets may override this via Outlet.settings.language.
      language: { type: String, default: 'en' },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Business', businessSchema);
