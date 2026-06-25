import Token from '../models/Token.js';
import Product from '../models/Product.js';
import Coupon from '../models/Coupon.js';
import Fee from '../models/Fee.js';
import Business from '../models/Business.js';
import { nextDailySequence } from '../models/Counter.js';
import { computeOrderTotals } from '../services/orderTotalsService.js';
import { consumeRecipeForItems, restockRecipeForItems } from '../services/inventoryService.js';
import { broadcast } from '../services/sseService.js';
import { resolveSelectedOptions } from '../services/menuService.js';

function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

async function canRefund(user) {
  if (user.role === 'owner') return true;
  if (user.permissions?.canRefund !== null && user.permissions?.canRefund !== undefined) {
    return user.permissions.canRefund;
  }
  const business = await Business.findById(user.businessId);
  return business?.settings?.cashierCanRefundByDefault ?? false;
}

export const createOrder = async (req, res) => {
  try {
    const { items, discountType, discountValue, discountReason, couponCode, feeIds, tipAmount, customerName, customerMobile } = req.body;
    if (!items?.length) return res.status(400).json({ error: 'Cart is empty' });

    const products = await Product.find({ _id: { $in: items.map((i) => i.product) } }).populate('comboItems.product');

    let appliedCoupon = null;
    let finalDiscountType = discountType || 'value';
    let finalDiscountValue = discountValue || 0;

    if (couponCode) {
      const subtotalForCoupon = items.reduce((sum, i) => {
        const p = products.find((pr) => String(pr._id) === String(i.product));
        return sum + (p ? p.price * i.qty : 0);
      }, 0);
      const coupon = await Coupon.findOne({ code: String(couponCode).toUpperCase(), active: true });
      if (!coupon) return res.status(400).json({ error: 'Invalid coupon' });
      if (coupon.expiresAt && coupon.expiresAt < new Date()) {
        return res.status(400).json({ error: 'Coupon expired' });
      }
      if (subtotalForCoupon < coupon.minOrderValue) {
        return res.status(400).json({ error: `Minimum order value is ${coupon.minOrderValue}` });
      }
      appliedCoupon = coupon;
      finalDiscountType = coupon.type === 'percent' ? 'percent' : 'value';
      finalDiscountValue = coupon.value;
    }

    const fees = feeIds?.length ? await Fee.find({ _id: { $in: feeIds }, active: true }) : [];

    const totals = await computeOrderTotals({
      items,
      products,
      discountType: finalDiscountType,
      discountValue: finalDiscountValue,
      fees,
      tipAmount,
    });

    const tokenDate = todayKey();
    const tokenNumber = await nextDailySequence(req.businessId, req.outletId);

    const tokenItems = items.map((i) => {
      const product = products.find((p) => String(p._id) === String(i.product));
      const { selected, priceDelta } = resolveSelectedOptions(product, i.selectedOptions || []);
      return {
        product: i.product,
        name: product.name,
        price: product.price + priceDelta,
        qty: i.qty,
        notes: i.notes || '',
        selectedOptions: selected,
      };
    });

    const token = await Token.create({
      tokenNumber,
      tokenDate,
      items: tokenItems,
      itemsSubtotal: totals.itemsSubtotal,
      discountType: finalDiscountType,
      discountValue: finalDiscountValue,
      discountTotal: totals.discountTotal,
      discountReason,
      appliedCoupon: appliedCoupon?._id || null,
      taxTotal: totals.taxTotal,
      feesTotal: totals.feesTotal,
      tipAmount: totals.tipAmount,
      total: totals.total,
      customerName,
      customerMobile,
      cashier: req.user._id,
    });

    const itemsForInventory = items.map((i) => ({
      qty: i.qty,
      product: products.find((p) => String(p._id) === String(i.product)),
      selectedOptions: i.selectedOptions || [],
    }));
    const oversoldIngredients = await consumeRecipeForItems(itemsForInventory, {
      businessId: req.businessId,
      tokenId: token._id,
      createdBy: req.user._id,
    });

    if (oversoldIngredients.length) {
      token.stockConflict = true;
      token.stockConflictIngredients = oversoldIngredients;
      await token.save();
    }

    broadcast(req.businessId, req.outletId, 'token_created', token);
    res.status(201).json(token);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const recordPayment = async (req, res) => {
  const { method, amount, reference } = req.body;
  const token = await Token.findById(req.params.id);
  if (!token) return res.status(404).json({ error: 'Not found' });

  token.payments.push({ method, amount, reference });
  const paidTotal = token.payments.reduce((sum, p) => sum + p.amount, 0);
  token.paymentStatus = paidTotal >= token.total ? 'paid' : 'unpaid';
  await token.save();

  broadcast(req.businessId, req.outletId, 'token_updated', token);
  res.json(token);
};

export const listOrders = async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.tokenDate) filter.tokenDate = req.query.tokenDate;
  if (req.query.tokenNumber) filter.tokenNumber = Number(req.query.tokenNumber);
  const tokens = await Token.find(filter).populate('cashier', 'name').sort({ createdAt: -1 });
  res.json(tokens);
};

export const getOrder = async (req, res) => {
  const token = await Token.findById(req.params.id).populate('cashier', 'name').populate('items.product');
  if (!token) return res.status(404).json({ error: 'Not found' });
  res.json(token);
};

export const cancelOrder = async (req, res) => {
  const { reason } = req.body;
  const token = await Token.findById(req.params.id).populate({
    path: 'items.product',
    populate: { path: 'comboItems.product' },
  });
  if (!token) return res.status(404).json({ error: 'Not found' });
  if (['completed', 'cancelled'].includes(token.status)) {
    return res.status(400).json({ error: `Cannot cancel a ${token.status} order` });
  }

  await restockRecipeForItems(
    token.items.map((ti) => ({
      qty: ti.qty,
      product: ti.product,
      selectedOptions: ti.selectedOptions?.map((o) => o.option) || [],
    })),
    { tokenId: token._id, createdBy: req.user._id }
  );

  token.status = 'cancelled';
  token.cancelledReason = reason;
  await token.save();

  broadcast(req.businessId, req.outletId, 'token_updated', token);
  res.json(token);
};

export const refundOrder = async (req, res) => {
  if (!(await canRefund(req.user))) {
    return res.status(403).json({ error: 'You do not have permission to issue refunds' });
  }

  const { amount, reason } = req.body;
  const token = await Token.findById(req.params.id);
  if (!token) return res.status(404).json({ error: 'Not found' });
  if (token.paymentStatus === 'unpaid') {
    return res.status(400).json({ error: 'Order has no payment to refund' });
  }

  const refundAmount = Number(amount);
  if (refundAmount <= 0 || refundAmount > token.total) {
    return res.status(400).json({ error: 'Invalid refund amount' });
  }

  token.refundAmount = refundAmount;
  token.refundReason = reason;
  token.refundedBy = req.user._id;
  token.paymentStatus = refundAmount >= token.total ? 'refunded' : 'partially_refunded';
  await token.save();

  broadcast(req.businessId, req.outletId, 'token_updated', token);
  res.json(token);
};

// Counter staff mark a token completed once the customer has picked it up.
export const completeOrder = async (req, res) => {
  const token = await Token.findById(req.params.id);
  if (!token) return res.status(404).json({ error: 'Not found' });
  if (token.status !== 'ready') return res.status(400).json({ error: 'Order is not ready for pickup yet' });
  token.status = 'completed';
  await token.save();
  broadcast(req.businessId, req.outletId, 'token_updated', token);
  res.json(token);
};

// Reprint lookup by token number + date (defaults to today), for the counter receipt printer.
export const reprintOrder = async (req, res) => {
  const tokenDate = req.query.tokenDate || todayKey();
  const token = await Token.findOne({ tokenDate, tokenNumber: Number(req.params.tokenNumber) }).populate('cashier', 'name');
  if (!token) return res.status(404).json({ error: 'Not found' });
  res.json(token);
};
