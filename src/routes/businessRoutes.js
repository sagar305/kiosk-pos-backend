import express from 'express';
import {
  getBusiness,
  updateBusinessSettings,
  uploadBusinessLogo,
  setAnthropicApiKey,
  clearAnthropicApiKey,
} from '../controllers/businessController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';
import upload from '../middlewares/upload.js';

const router = express.Router();

router.get('/', requireAuth, getBusiness);
router.patch('/', requireAuth, permit('owner'), updateBusinessSettings);
router.post('/logo', requireAuth, permit('owner'), upload.single('image'), uploadBusinessLogo);
router.patch('/ai-key', requireAuth, permit('owner'), setAnthropicApiKey);
router.delete('/ai-key', requireAuth, permit('owner'), clearAnthropicApiKey);

export default router;
