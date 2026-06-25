import express from 'express';
import {
  listPurchaseOrders,
  createPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from '../controllers/purchaseOrderController.js';
import { requireAuth, requireOutlet } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.use(requireAuth, permit('owner'), requireOutlet);
router.get('/', listPurchaseOrders);
router.post('/', createPurchaseOrder);
router.post('/:id/receive', receivePurchaseOrder);
router.post('/:id/cancel', cancelPurchaseOrder);

export default router;
