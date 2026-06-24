import Tax from '../models/Tax.js';

export const listTaxes = async (req, res) => res.json(await Tax.find());
export const createTax = async (req, res) => res.status(201).json(await Tax.create(req.body));
export const updateTax = async (req, res) => {
  const tax = await Tax.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!tax) return res.status(404).json({ error: 'Not found' });
  res.json(tax);
};
export const deleteTax = async (req, res) => {
  await Tax.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};
