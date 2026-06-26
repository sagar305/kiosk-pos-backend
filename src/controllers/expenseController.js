import Expense from '../models/Expense.js';

export const listExpenses = async (req, res) => {
  const filter = {};
  if (req.query.category) filter.category = req.query.category;
  if (req.query.from || req.query.to) {
    filter.date = {};
    if (req.query.from) filter.date.$gte = new Date(req.query.from);
    if (req.query.to) filter.date.$lte = new Date(req.query.to);
  }
  const expenses = await Expense.find(filter).populate('createdBy', 'name').populate('ingredient', 'name').sort({ date: -1 });
  res.json(expenses);
};

export const createExpense = async (req, res) => {
  try {
    const { category, amount, description, date } = req.body;
    const expense = await Expense.create({ category, amount, description, date, createdBy: req.user._id });
    res.status(201).json(expense);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const deleteExpense = async (req, res) => {
  await Expense.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};
