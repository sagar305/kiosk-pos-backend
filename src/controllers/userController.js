import bcrypt from 'bcryptjs';
import User from '../models/User.js';

export const listUsers = async (req, res) => {
  const users = await User.find().select('-password -refreshToken').populate('outlets', 'name code');
  res.json(users);
};

export const createUser = async (req, res) => {
  try {
    const { name, email, password, role, mobile, permissions, outlets } = req.body;
    if (!['pos_manager', 'kitchen_staff', 'owner'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
    const hash = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hash, role, mobile, permissions, outlets });
    res.status(201).json({ ...user.toObject(), password: undefined, refreshToken: undefined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateUser = async (req, res) => {
  try {
    const { name, role, mobile, permissions, active, password, outlets } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ error: 'Not found' });
    if (name !== undefined) user.name = name;
    if (role !== undefined) user.role = role;
    if (mobile !== undefined) user.mobile = mobile;
    if (active !== undefined) user.active = active;
    if (outlets !== undefined) user.outlets = outlets;
    if (permissions !== undefined) Object.assign(user.permissions, permissions);
    if (password) user.password = await bcrypt.hash(password, 10);
    await user.save();
    res.json({ ...user.toObject(), password: undefined, refreshToken: undefined });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteUser = async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};
