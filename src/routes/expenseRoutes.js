import express from 'express';
import { listExpenses, createExpense, deleteExpense } from '../controllers/expenseController.js';
import { requireAuth, requireOutlet } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.use(requireAuth, permit('owner', 'pos_manager'), requireOutlet);
router.get('/', listExpenses);
router.post('/', createExpense);
router.delete('/:id', permit('owner'), deleteExpense);

export default router;
