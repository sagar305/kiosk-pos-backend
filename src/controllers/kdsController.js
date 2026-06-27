import Token from '../models/Token.js';
import { broadcast } from '../services/sseService.js';

// Kitchen staff must never see payment/financial data, so KDS responses are
// stripped down to token/item/timing fields only.
function toKdsView(token) {
  return {
    _id: token._id,
    tokenNumber: token.tokenNumber,
    tokenDate: token.tokenDate,
    status: token.status,
    items: token.items.map((i) => ({
      _id: i._id,
      name: i.name,
      qty: i.qty,
      notes: i.notes,
      selectedOptions: i.selectedOptions,
      itemStatus: i.itemStatus,
    })),
    createdAt: token.createdAt,
  };
}

export const listKdsTokens = async (req, res) => {
  const tokens = await Token.find({ status: { $in: ['pending', 'preparing', 'ready'] } }).sort({ createdAt: 1 });
  res.json(tokens.map(toKdsView));
};

async function syncTokenStatusFromItems(token) {
  const statuses = token.items.map((i) => i.itemStatus);
  if (statuses.every((s) => s === 'ready' || s === 'unavailable')) {
    token.status = 'ready';
  } else if (statuses.some((s) => s === 'preparing')) {
    token.status = 'preparing';
  }
  await token.save();
}

export const startPreparingItem = async (req, res) => {
  const token = await Token.findById(req.params.tokenId);
  if (!token) return res.status(404).json({ error: 'Not found' });
  const item = token.items.id(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  item.itemStatus = 'preparing';
  if (token.status === 'pending') token.status = 'preparing';
  await token.save();

  broadcast(req.businessId, req.outletId, 'token_updated', toKdsView(token));
  res.json(toKdsView(token));
};

export const markItemUnavailable = async (req, res) => {
  const token = await Token.findById(req.params.tokenId);
  if (!token) return res.status(404).json({ error: 'Not found' });
  const item = token.items.id(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  item.itemStatus = 'unavailable';
  await syncTokenStatusFromItems(token);

  broadcast(req.businessId, req.outletId, 'token_updated', toKdsView(token));
  res.json(toKdsView(token));
};

export const markItemReady = async (req, res) => {
  const token = await Token.findById(req.params.tokenId);
  if (!token) return res.status(404).json({ error: 'Not found' });
  const item = token.items.id(req.params.itemId);
  if (!item) return res.status(404).json({ error: 'Item not found' });

  item.itemStatus = 'ready';
  await syncTokenStatusFromItems(token);

  broadcast(req.businessId, req.outletId, 'token_ready', toKdsView(token));
  res.json(toKdsView(token));
};
