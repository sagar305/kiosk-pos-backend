import express from 'express';
import { chatWithAssistant, resetAssistantSession } from '../controllers/aiController.js';
import { requireAuth, requireOutlet } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.use(requireAuth, requireOutlet, permit('owner', 'pos_manager'));
router.post('/chat', chatWithAssistant);
router.delete('/chat/:sessionId', resetAssistantSession);

export default router;
