import express from 'express';
import {
  createOrder,
  recordPayment,
  listOrders,
  getOrder,
  cancelOrder,
  refundOrder,
  completeOrder,
  reprintOrder,
} from '../controllers/orderController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.use(requireAuth, permit('owner', 'pos_manager'));
router.get('/', listOrders);
router.get('/reprint/:tokenNumber', reprintOrder);
router.get('/:id', getOrder);
router.post('/', createOrder);
router.post('/:id/payments', recordPayment);
router.post('/:id/cancel', cancelOrder);
router.post('/:id/refund', refundOrder);
router.post('/:id/complete', completeOrder);

export default router;
