import express from 'express';
import {
  listIngredients,
  listLowStock,
  createIngredient,
  updateIngredient,
  deleteIngredient,
  adjustStock,
  listStockLogs,
} from '../controllers/ingredientController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.use(requireAuth, permit('owner'));
router.get('/', listIngredients);
router.get('/low-stock', listLowStock);
router.get('/stock-logs', listStockLogs);
router.post('/', createIngredient);
router.patch('/:id', updateIngredient);
router.delete('/:id', deleteIngredient);
router.post('/:id/adjust', adjustStock);

export default router;
