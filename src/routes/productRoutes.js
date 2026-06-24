import express from 'express';
import {
  listProducts,
  createProduct,
  updateProduct,
  setProductAvailability,
  deleteProduct,
} from '../controllers/productController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

router.use(requireAuth);
router.get('/', listProducts);
router.post('/', permit('owner'), upload.single('image'), createProduct);
router.patch('/:id', permit('owner'), upload.single('image'), updateProduct);
router.patch('/:id/availability', permit('owner', 'pos_manager'), setProductAvailability);
router.delete('/:id', permit('owner'), deleteProduct);

export default router;
