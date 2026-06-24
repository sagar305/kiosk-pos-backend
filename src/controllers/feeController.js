import Fee from '../models/Fee.js';

export const listFees = async (req, res) => res.json(await Fee.find());
export const createFee = async (req, res) => res.status(201).json(await Fee.create(req.body));
export const updateFee = async (req, res) => {
  const fee = await Fee.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!fee) return res.status(404).json({ error: 'Not found' });
  res.json(fee);
};
export const deleteFee = async (req, res) => {
  await Fee.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};
