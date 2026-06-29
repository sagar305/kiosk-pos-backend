import Business from '../models/Business.js';
import { cloudinaryEnabled, uploadToCloudinary } from '../middlewares/upload.js';
import { encrypt } from '../utils/encryption.js';

export const getBusiness = async (req, res) => {
  const business = await Business.findById(req.businessId);
  if (!business) return res.status(404).json({ error: 'Not found' });
  const hasOwnApiKey = !!business.aiSettings?.anthropicApiKeyEncrypted;
  const result = business.toObject();
  delete result.aiSettings;
  res.json({ ...result, aiSettings: { hasOwnApiKey } });
};

export const setAnthropicApiKey = async (req, res) => {
  const { apiKey } = req.body;
  if (!apiKey || typeof apiKey !== 'string') {
    return res.status(400).json({ error: 'apiKey is required' });
  }
  const business = await Business.findById(req.businessId);
  if (!business) return res.status(404).json({ error: 'Not found' });
  business.aiSettings.anthropicApiKeyEncrypted = encrypt(apiKey.trim());
  await business.save();
  res.json({ hasOwnApiKey: true });
};

export const clearAnthropicApiKey = async (req, res) => {
  const business = await Business.findById(req.businessId);
  if (!business) return res.status(404).json({ error: 'Not found' });
  business.aiSettings.anthropicApiKeyEncrypted = '';
  await business.save();
  res.json({ hasOwnApiKey: false });
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
