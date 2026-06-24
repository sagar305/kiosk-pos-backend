import express from 'express';
import { listFees, createFee, updateFee, deleteFee } from '../controllers/feeController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.get('/', listFees);
router.post('/', permit('owner'), createFee);
router.patch('/:id', permit('owner'), updateFee);
router.delete('/:id', permit('owner'), deleteFee);

export default router;
