import express from 'express';
import { listKdsTokens, startPreparingItem, markItemUnavailable, markItemReady } from '../controllers/kdsController.js';
import { requireAuth, requireAuthSSE } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';
import { addClient } from '../services/sseService.js';

const router = express.Router();

router.get('/stream', requireAuthSSE, (req, res) => addClient(req, res));

router.use(requireAuth, permit('owner', 'kitchen_staff'));
router.get('/', listKdsTokens);
router.patch('/:tokenId/items/:itemId/start', startPreparingItem);
router.patch('/:tokenId/items/:itemId/unavailable', markItemUnavailable);
router.patch('/:tokenId/items/:itemId/ready', markItemReady);

export default router;
