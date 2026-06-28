import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import Business from '../models/Business.js';
import Otp from '../models/Otp.js';
import { signAccessToken, signRefreshToken, verifyRefreshToken } from '../utils/token.js';
import { sendOtpEmail } from '../utils/email.js';
import { slugify } from '../utils/slug.js';
import { runWithTenant } from '../utils/tenantContext.js';

const OTP_TTL_MS = 10 * 60 * 1000;
const SIGNUP_TOKEN_TTL = '15m';
const MAX_OTP_ATTEMPTS = 5;

const generateOtp = () => String(Math.floor(100000 + Math.random() * 900000));

// Owner self-signup happens in three steps so the email is verified before
// any account is created: initiate (send OTP) -> verify-otp (get a
// short-lived signup token) -> complete (set password, create the account).
// Staff accounts are created afterwards by the owner via userController.
export const initiateSignup = async (req, res) => {
  try {
    const { businessName, name, email } = req.body;
    if (!businessName || !name || !email) {
      return res.status(400).json({ error: 'businessName, name and email are required' });
    }

    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const otp = generateOtp();
    const otpHash = await bcrypt.hash(otp, 10);

    await Otp.findOneAndUpdate(
      { email, purpose: 'signup' },
      { email, purpose: 'signup', otpHash, businessName, name, attempts: 0, expiresAt: new Date(Date.now() + OTP_TTL_MS) },
      { upsert: true }
    );

    await sendOtpEmail(email, otp, name);

    res.json({ ok: true, message: 'OTP sent to email' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const verifySignupOtp = async (req, res) => {
  try {
    const { email, otp } = req.body;
    if (!email || !otp) return res.status(400).json({ error: 'email and otp are required' });

    const record = await Otp.findOne({ email, purpose: 'signup' });
    if (!record) return res.status(400).json({ error: 'No OTP request found for this email' });

    if (record.expiresAt < new Date()) {
      await record.deleteOne();
      return res.status(400).json({ error: 'OTP expired, please request a new one' });
    }

    if (record.attempts >= MAX_OTP_ATTEMPTS) {
      await record.deleteOne();
      return res.status(400).json({ error: 'Too many incorrect attempts, please request a new OTP' });
    }

    const match = await bcrypt.compare(otp, record.otpHash);
    if (!match) {
      record.attempts += 1;
      await record.save();
      return res.status(400).json({ error: 'Invalid OTP' });
    }

    const signupToken = jwt.sign(
      { purpose: 'signup', email, businessName: record.businessName, name: record.name },
      process.env.JWT_SECRET,
      { expiresIn: SIGNUP_TOKEN_TTL }
    );

    await record.deleteOne();

    res.json({ ok: true, signupToken });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const completeSignup = async (req, res) => {
  try {
    const { signupToken, password, confirmPassword } = req.body;
    if (!signupToken || !password || !confirmPassword) {
      return res.status(400).json({ error: 'signupToken, password and confirmPassword are required' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ error: 'Passwords do not match' });
    }

    let payload;
    try {
      payload = jwt.verify(signupToken, process.env.JWT_SECRET);
    } catch {
      return res.status(400).json({ error: 'Invalid or expired signup token, please verify OTP again' });
    }
    if (payload.purpose !== 'signup') return res.status(400).json({ error: 'Invalid signup token' });

    const { email, businessName, name } = payload;
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already in use' });

    const business = await Business.create({ name: businessName, slug: slugify(businessName) });
    const hash = await bcrypt.hash(password, 10);

    const user = await runWithTenant(business._id, null, () =>
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
    outlets: req.user.outlets,
  });
};
