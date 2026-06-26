import Business from '../models/Business.js';

export const getBusiness = async (req, res) => {
  const business = await Business.findById(req.businessId);
  res.json(business);
};

export const updateBusinessSettings = async (req, res) => {
  const business = await Business.findById(req.businessId);
  if (!business) return res.status(404).json({ error: 'Not found' });
  Object.assign(business.settings, req.body.settings || {});
  Object.assign(business.theme, req.body.theme || {});
  if (req.body.name) business.name = req.body.name;
  await business.save();
  res.json(business);
};
