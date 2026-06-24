import mongoose from 'mongoose';
import tenantPlugin from '../utils/tenantPlugin.js';

const taxSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    percent: { type: Number, required: true },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

taxSchema.plugin(tenantPlugin);

export default mongoose.model('Tax', taxSchema);
