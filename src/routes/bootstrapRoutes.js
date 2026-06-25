import express from 'express';
import { getBootstrap } from '../controllers/bootstrapController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';

const router = express.Router();

router.use(requireAuth);
router.get('/', getBootstrap);

export default router;
