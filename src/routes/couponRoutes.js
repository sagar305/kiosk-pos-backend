import express from 'express';
import { listCoupons, createCoupon, updateCoupon, deleteCoupon, validateCoupon } from '../controllers/couponController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.get('/', listCoupons);
router.get('/validate', validateCoupon);
router.post('/', permit('owner'), createCoupon);
router.patch('/:id', permit('owner'), updateCoupon);
router.delete('/:id', permit('owner'), deleteCoupon);

export default router;
