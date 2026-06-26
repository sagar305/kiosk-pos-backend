import express from 'express';
import { getBusiness, updateBusinessSettings, uploadBusinessLogo } from '../controllers/businessController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

router.get('/', requireAuth, getBusiness);
router.patch('/', requireAuth, permit('owner'), updateBusinessSettings);
router.post('/logo', requireAuth, permit('owner'), upload.single('image'), uploadBusinessLogo);

export default router;
