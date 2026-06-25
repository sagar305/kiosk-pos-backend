import Outlet from '../models/Outlet.js';

export const listOutlets = async (req, res) => {
  const outlets = await Outlet.find().sort({ createdAt: 1 });
  res.json(outlets);
};

export const createOutlet = async (req, res) => {
  try {
    const { name, code, address } = req.body;
    const outlet = await Outlet.create({ name, code, address });
    res.status(201).json(outlet);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateOutlet = async (req, res) => {
  const outlet = await Outlet.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!outlet) return res.status(404).json({ error: 'Not found' });
  res.json(outlet);
};

export const deleteOutlet = async (req, res) => {
  await Outlet.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};
