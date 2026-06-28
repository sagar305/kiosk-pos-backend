import mongoose from 'mongoose';

const otpSchema = new mongoose.Schema(
  {
    email: { type: String, required: true },
    purpose: { type: String, enum: ['signup'], required: true },
    otpHash: { type: String, required: true },
    businessName: { type: String, required: true },
    name: { type: String, required: true },
    attempts: { type: Number, default: 0 },
    expiresAt: { type: Date, required: true },
  },
  { timestamps: true }
);

otpSchema.index({ email: 1, purpose: 1 }, { unique: true });

export default mongoose.model('Otp', otpSchema);
