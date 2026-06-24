import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import Business from '../models/Business.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { slugify } from '../utils/slug.js';
import { runWithTenant } from '../utils/tenantContext.js';

// Owner self-signup: creates the business (tenant) and the first owner user
// in one step. There's no customer-facing signup here — staff accounts are
// created by the owner afterwards via userController.
export const signup = async (req, res) => {
  try {
    const { businessName, name, email, password } = req.body;
    if (!businessName || !name || !email || !password) {
      return res.status(400).json({ error: 'businessName, name, email and password are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const business = await Business.create({ name: businessName, slug: slugify(businessName) });
    const hash = await bcrypt.hash(password, 10);

    const user = await runWithTenant(business._id, () =>
      User.create({ name, email, password: hash, role: 'owner', businessId: business._id })
    );
    business.ownerId = user._id;
    await business.save();

    res.status(201).json({ ok: true, businessId: business._id, businessSlug: business.slug });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user || !user.active) return res.status(400).json({ error: 'Invalid credentials' });
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(400).json({ error: 'Invalid credentials' });

    const payload = { id: user._id, role: user.role, businessId: user.businessId };
    const accessToken = signAccessToken(payload);
    const refreshToken = signRefreshToken(payload);
    user.refreshToken = refreshToken;
    await user.save();

    res.json({
      accessToken,
      refreshToken,
      user: { id: user._id, name: user.name, email: user.email, role: user.role, businessId: user.businessId },
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const refresh = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.status(400).json({ error: 'No token' });
    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.id);
    if (!user || user.refreshToken !== token) return res.status(401).json({ error: 'Invalid refresh' });

    const newPayload = { id: user._id, role: user.role, businessId: user.businessId };
    const accessToken = signAccessToken(newPayload);
    const newRefresh = signRefreshToken(newPayload);
    user.refreshToken = newRefresh;
    await user.save();
    res.json({ accessToken, refreshToken: newRefresh });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token' });
  }
};

export const logout = async (req, res) => {
  try {
    const { token } = req.body;
    if (!token) return res.json({ ok: true });
    const payload = verifyRefreshToken(token);
    const user = await User.findById(payload.id);
    if (user) {
      user.refreshToken = null;
      await user.save();
    }
    res.json({ ok: true });
  } catch (err) {
    res.json({ ok: true });
  }
};

export const me = async (req, res) => {
  res.json({
    id: req.user._id,
    name: req.user.name,
    email: req.user.email,
    role: req.user.role,
    permissions: req.user.permissions,
    businessId: req.user.businessId,
  });
};
