import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { runWithTenant } from '../utils/tenantContext.js';

export const requireAuth = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No token' });
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });
    req.user = user;
    req.businessId = user.businessId;
    runWithTenant(user.businessId, next);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// EventSource can't send an Authorization header, so the SSE stream accepts
// the token as a query param.
export const requireAuthSSE = async (req, res, next) => {
  try {
    const token = req.query.token || (req.headers.authorization || '').split(' ')[1];
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (user) {
        req.user = user;
        req.businessId = user.businessId;
      }
    }
  } catch (err) {
    // invalid/expired token: reject rather than connecting anonymously, since
    // KDS/ready-screen broadcasts carry business-scoped data.
  }
  if (!req.businessId) return res.status(401).json({ error: 'Invalid token' });
  runWithTenant(req.businessId, next);
};
