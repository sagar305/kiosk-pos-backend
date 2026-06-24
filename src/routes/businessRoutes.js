import express from 'express';
import { getBusiness, updateBusinessSettings } from '../controllers/businessController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.get('/', requireAuth, getBusiness);
router.patch('/', requireAuth, permit('owner'), updateBusinessSettings);

export default router;
