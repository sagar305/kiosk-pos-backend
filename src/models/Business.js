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
      // WhatsApp receipt sending via the Meta WhatsApp Cloud API. Each business
      // brings its own phone_number_id + access token from its own Meta App;
      // when SIMULATE=1 on the server, sends use the test* fields instead so a
      // business can try the feature against Meta's test number before going live.
      whatsapp: {
        enabled: { type: Boolean, default: false },
        phoneNumberId: { type: String, default: '' },
        accessToken: { type: String, default: '' },
        testPhoneNumberId: { type: String, default: '' },
        testAccessToken: { type: String, default: '' },
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model('Business', businessSchema);
