import Business from '../models/Business.js';
import Outlet from '../models/Outlet.js';
import Token from '../models/Token.js';
import { runWithTenant } from '../utils/tenantContext.js';
import { addClient } from '../services/sseService.js';

// The Ready Pickup screen is a public TV display facing customers, so it has
// no auth — it is scoped to a business purely by its public slug, and
// optionally to one outlet via ?outletId=<Outlet.code> (case-insensitive).
async function resolveScope(req, res) {
  const business = await Business.findOne({ slug: req.params.businessSlug });
  if (!business) {
    res.status(404).json({ error: 'Not found' });
    return null;
  }

  const outletCode = req.query.outletId || req.query.outletid;
  let outletId = null;
  if (outletCode) {
    const outlet = await runWithTenant(business._id, null, () =>
      Outlet.findOne({ code: new RegExp(`^${outletCode}$`, 'i') })
    );
    if (!outlet) {
      res.status(404).json({ error: 'Outlet not found' });
      return null;
    }
    outletId = outlet._id;
  }

  return { businessId: business._id, outletId };
}

export const getReadyTokens = async (req, res) => {
  const scope = await resolveScope(req, res);
  if (!scope) return;
  await runWithTenant(scope.businessId, scope.outletId, async () => {
    const tokens = await Token.find({ status: 'ready' }).sort({ updatedAt: 1 });
    res.json(tokens.map((t) => ({ tokenNumber: t.tokenNumber, tokenDate: t.tokenDate, updatedAt: t.updatedAt })));
  });
};

export const readyScreenStream = async (req, res) => {
  const scope = await resolveScope(req, res);
  if (!scope) return;
  req.businessId = scope.businessId;
  req.outletId = scope.outletId;
  addClient(req, res);
};
