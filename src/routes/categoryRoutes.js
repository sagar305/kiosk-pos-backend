import express from 'express';
import { listCategories, createCategory, updateCategory, deleteCategory } from '../controllers/categoryController.js';
import { requireAuth, requireOutlet } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.get('/', listCategories);
router.post('/', permit('owner'), requireOutlet, createCategory);
router.patch('/:id', permit('owner'), updateCategory);
router.delete('/:id', permit('owner'), deleteCategory);

export default router;
