import express from 'express';
import {
  listPurchaseOrders,
  createPurchaseOrder,
  requestPurchaseOrder,
  receivePurchaseOrder,
  cancelPurchaseOrder,
} from '../controllers/purchaseOrderController.js';
import { requireAuth, requireOutlet } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.use(requireAuth, permit('owner', 'pos_manager'), requireOutlet);
router.get('/', listPurchaseOrders);
router.post('/', permit('owner'), createPurchaseOrder);
router.post('/request', requestPurchaseOrder);
router.post('/:id/receive', permit('owner'), receivePurchaseOrder);
router.post('/:id/cancel', permit('owner'), cancelPurchaseOrder);

export default router;
