import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { runWithTenant } from '../utils/tenantContext.js';

// Resolves which outlet a request operates on. Returns:
// - a string outletId if one was explicitly requested (header/query) or
//   defaulted from the user's own assignment,
// - null if no outlet applies (owner viewing across all outlets),
// - undefined if the requested outlet is not one the user may access.
function resolveOutletId(req, user) {
  const requested = req.headers['x-outlet-id'] || req.query.outletId;
  if (requested) {
    if (user.role !== 'owner') {
      const allowed = (user.outlets || []).some((o) => String(o) === String(requested));
      if (!allowed) return undefined;
    }
    return String(requested);
  }
  if (user.role !== 'owner' && user.outlets?.length) return String(user.outlets[0]);
  return null;
}

export const requireAuth = async (req, res, next) => {
  try {
    const auth = req.headers.authorization;
    if (!auth) return res.status(401).json({ error: 'No token' });
    const token = auth.split(' ')[1];
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);
    if (!user) return res.status(401).json({ error: 'User not found' });

    const outletId = resolveOutletId(req, user);
    if (outletId === undefined) return res.status(403).json({ error: 'You do not have access to this outlet' });

    req.user = user;
    req.businessId = user.businessId;
    req.outletId = outletId;
    runWithTenant(user.businessId, outletId, next);
  } catch (err) {
    return res.status(401).json({ error: 'Invalid token' });
  }
};

// Requires an outlet to have been resolved (explicitly or via the user's own
// assignment) — for actions on outlet-scoped data (menu, inventory, orders)
// where there's no sensible "all outlets" behaviour.
export const requireOutlet = (req, res, next) => {
  if (!req.outletId) return res.status(400).json({ error: 'Select an outlet first' });
  next();
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
        const outletId = resolveOutletId(req, user);
        req.outletId = outletId === undefined ? null : outletId;
      }
    }
  } catch (err) {
    // invalid/expired token: reject rather than connecting anonymously, since
    // KDS/ready-screen broadcasts carry business-scoped data.
  }
  if (!req.businessId) return res.status(401).json({ error: 'Invalid token' });
  runWithTenant(req.businessId, req.outletId, next);
};
