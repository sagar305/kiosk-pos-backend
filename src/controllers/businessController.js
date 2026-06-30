import Business from '../models/Business.js';
import { cloudinaryEnabled, uploadToCloudinary } from '../middlewares/upload.js';

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
  if (req.body.currency) business.currency = req.body.currency;
  await business.save();
  res.json(business);
};

export const uploadBusinessLogo = async (req, res) => {
  const business = await Business.findById(req.businessId);
  if (!business) return res.status(404).json({ error: 'Not found' });
  if (!req.file) return res.status(400).json({ error: 'No image file uploaded' });
  business.logo = cloudinaryEnabled ? await uploadToCloudinary(req.file.buffer) : `/uploads/${req.file.filename}`;
  await business.save();
  res.json(business);
};
