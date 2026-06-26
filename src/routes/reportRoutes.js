import express from 'express';
import {
  salesReport,
  salesTrendReport,
  ordersReport,
  productsReport,
  paymentsReport,
  expensesReport,
  inventoryReport,
} from '../controllers/reportController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.use(requireAuth, permit('owner'));
router.get('/sales', salesReport);
router.get('/sales-trend', salesTrendReport);
router.get('/orders', ordersReport);
router.get('/products', productsReport);
router.get('/payments', paymentsReport);
router.get('/expenses', expensesReport);
router.get('/inventory', inventoryReport);

export default router;
