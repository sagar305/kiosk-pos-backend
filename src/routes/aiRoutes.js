import express from 'express';
import { chatWithAssistant, resetAssistantSession } from '../controllers/aiController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// No requireOutlet here: an owner may open the assistant before picking an
// outlet from the header switcher, so the assistant itself asks which outlet
// to operate on (see aiAssistant.js) instead of being blocked at the gate.
router.use(requireAuth, permit('owner'));
router.post('/chat', chatWithAssistant);
router.delete('/chat/:sessionId', resetAssistantSession);

export default router;
