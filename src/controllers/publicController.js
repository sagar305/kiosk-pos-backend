import Business from '../models/Business.js';
import Token from '../models/Token.js';
import { runWithTenant } from '../utils/tenantContext.js';
import { addClient } from '../services/sseService.js';

// The Ready Pickup screen is a public TV display facing customers, so it has
// no auth — it is scoped to a business purely by its public slug.
async function resolveBusinessId(req, res) {
  const business = await Business.findOne({ slug: req.params.businessSlug });
  if (!business) {
    res.status(404).json({ error: 'Not found' });
    return null;
  }
  return business._id;
}

export const getReadyTokens = async (req, res) => {
  const businessId = await resolveBusinessId(req, res);
  if (!businessId) return;
  await runWithTenant(businessId, async () => {
    const tokens = await Token.find({ status: 'ready' }).sort({ updatedAt: 1 });
    res.json(tokens.map((t) => ({ tokenNumber: t.tokenNumber, tokenDate: t.tokenDate, updatedAt: t.updatedAt })));
  });
};

export const readyScreenStream = async (req, res) => {
  const businessId = await resolveBusinessId(req, res);
  if (!businessId) return;
  req.businessId = businessId;
  addClient(req, res);
};
