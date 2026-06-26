import mongoose from 'mongoose';
import tenantPlugin from '../utils/tenantPlugin.js';

const feeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    type: { type: String, enum: ['flat', 'percent'], default: 'flat' },
    value: { type: Number, required: true },
    active: { type: Boolean, default: true },
    mandatory: { type: Boolean, default: true },
  },
  { timestamps: true }
);

feeSchema.plugin(tenantPlugin);

export default mongoose.model('Fee', feeSchema);
