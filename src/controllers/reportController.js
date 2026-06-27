import Token from '../models/Token.js';
import Ingredient from '../models/Ingredient.js';
import Expense from '../models/Expense.js';

function rangeStart(period) {
  const now = new Date();
  const start = new Date(now);
  if (period === 'today') start.setHours(0, 0, 0, 0);
  else if (period === 'week') start.setDate(now.getDate() - 7);
  else if (period === 'month') start.setMonth(now.getMonth() - 1);
  else if (period === 'year') start.setFullYear(now.getFullYear() - 1);
  else start.setHours(0, 0, 0, 0);
  return start;
}

export const salesReport = async (req, res) => {
  const start = rangeStart(req.query.period);
  const tokens = await Token.find({ createdAt: { $gte: start }, status: { $ne: 'cancelled' } });
  const grossSales = tokens.reduce((sum, t) => sum + t.total, 0);
  const refunds = tokens.reduce((sum, t) => sum + (t.refundAmount || 0), 0);
  res.json({
    period: req.query.period || 'today',
    orderCount: tokens.length,
    grossSales: round2(grossSales),
    refunds: round2(refunds),
    netSales: round2(grossSales - refunds),
  });
};

export const ordersReport = async (req, res) => {
  const start = rangeStart(req.query.period);
  const tokens = await Token.find({ createdAt: { $gte: start } }).sort({ createdAt: -1 });
  res.json({
    total: tokens.length,
    completed: tokens.filter((t) => t.status === 'completed').length,
    cancelled: tokens.filter((t) => t.status === 'cancelled').length,
    refunded: tokens.filter((t) => t.refundAmount > 0).length,
    orders: tokens.map((t) => ({
      _id: t._id,
      tokenNumber: t.tokenNumber,
      customerName: t.customerName,
      total: t.total,
      status: t.status,
      paymentStatus: t.paymentStatus,
      createdAt: t.createdAt,
    })),
  });
};

export const productsReport = async (req, res) => {
  const start = rangeStart(req.query.period);
  const tokens = await Token.find({ createdAt: { $gte: start }, status: { $ne: 'cancelled' } });
  const counts = new Map();
  for (const token of tokens) {
    for (const item of token.items) {
      const key = item.name;
      counts.set(key, (counts.get(key) || 0) + item.qty);
    }
  }
  const ranked = [...counts.entries()].map(([name, qty]) => ({ name, qty })).sort((a, b) => b.qty - a.qty);
  res.json({
    topSelling: ranked.slice(0, 10),
    leastSelling: ranked.slice(-10).reverse(),
  });
};

export const paymentsReport = async (req, res) => {
  const start = rangeStart(req.query.period);
  const tokens = await Token.find({ createdAt: { $gte: start } });
  const totals = { cash: 0, upi: 0, card: 0, wallet: 0 };
  for (const token of tokens) {
    for (const payment of token.payments) {
      totals[payment.method] = (totals[payment.method] || 0) + payment.amount;
    }
  }
  res.json(Object.fromEntries(Object.entries(totals).map(([k, v]) => [k, round2(v)])));
};

// Day-by-day net sales within the period, for a trend line chart.
export const salesTrendReport = async (req, res) => {
  const start = rangeStart(req.query.period);
  const tokens = await Token.find({ createdAt: { $gte: start }, status: { $ne: 'cancelled' } });
  const byDay = new Map();
  for (const token of tokens) {
    const day = token.createdAt.toISOString().slice(0, 10);
    const net = token.total - (token.refundAmount || 0);
    byDay.set(day, (byDay.get(day) || 0) + net);
  }
  const trend = [...byDay.entries()].map(([date, total]) => ({ date, total: round2(total) })).sort((a, b) =>
    a.date.localeCompare(b.date)
  );
  res.json(trend);
};

export const expensesReport = async (req, res) => {
  const start = rangeStart(req.query.period);
  const expenses = await Expense.find({ date: { $gte: start } });
  const byCategory = new Map();
  for (const expense of expenses) {
    byCategory.set(expense.category, (byCategory.get(expense.category) || 0) + expense.amount);
  }
  res.json({
    total: round2(expenses.reduce((sum, e) => sum + e.amount, 0)),
    byCategory: [...byCategory.entries()].map(([category, total]) => ({ category, total: round2(total) })),
  });
};

export const inventoryReport = async (req, res) => {
  const ingredients = await Ingredient.find({ active: true });
  const stockValue = ingredients.reduce((sum, i) => sum + i.stockQty * i.costPerUnit, 0);
  const lowStock = ingredients.filter((i) => i.stockQty <= i.thresholdQty);
  res.json({
    stockValue: round2(stockValue),
    lowStockCount: lowStock.length,
    lowStock,
  });
};

function round2(n) {
  return Math.round(n * 1000) / 1000;
}
