import express from 'express';
import { listTaxes, createTax, updateTax, deleteTax } from '../controllers/taxController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.get('/', listTaxes);
router.post('/', permit('owner'), createTax);
router.patch('/:id', permit('owner'), updateTax);
router.delete('/:id', permit('owner'), deleteTax);

export default router;
