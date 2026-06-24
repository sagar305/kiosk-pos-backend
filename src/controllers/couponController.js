import Coupon from '../models/Coupon.js';

export const listCoupons = async (req, res) => res.json(await Coupon.find());

export const createCoupon = async (req, res) => {
  try {
    const coupon = await Coupon.create(req.body);
    res.status(201).json(coupon);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateCoupon = async (req, res) => {
  const coupon = await Coupon.findByIdAndUpdate(req.params.id, req.body, { new: true });
  if (!coupon) return res.status(404).json({ error: 'Not found' });
  res.json(coupon);
};

export const deleteCoupon = async (req, res) => {
  await Coupon.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};

export const validateCoupon = async (req, res) => {
  const { code, orderValue } = req.query;
  const coupon = await Coupon.findOne({ code: String(code).toUpperCase(), active: true });
  if (!coupon) return res.status(404).json({ error: 'Invalid coupon' });
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return res.status(400).json({ error: 'Coupon expired' });
  }
  if (orderValue && Number(orderValue) < coupon.minOrderValue) {
    return res.status(400).json({ error: `Minimum order value is ${coupon.minOrderValue}` });
  }
  res.json(coupon);
};
