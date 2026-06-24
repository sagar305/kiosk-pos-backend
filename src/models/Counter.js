import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  _id: { type: String, required: true },
  seq: { type: Number, default: 0 },
});

const Counter = mongoose.model('Counter', counterSchema);

export async function nextSequence(name) {
  const counter = await Counter.findByIdAndUpdate(
    name,
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  return counter.seq;
}

// Token numbers reset daily, so the sequence key is namespaced by business
// and calendar date (YYYY-MM-DD) rather than being a single ever-growing counter.
export async function nextDailySequence(businessId, date = new Date()) {
  const day = date.toISOString().slice(0, 10);
  return nextSequence(`token_${businessId}_${day}`);
}

export default Counter;
