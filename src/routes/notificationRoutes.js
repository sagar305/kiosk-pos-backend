import express from 'express';
import { listNotifications, markNotificationRead } from '../controllers/notificationController.js';
import { requireAuth, requireOutlet } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.use(requireAuth, permit('owner', 'pos_manager'), requireOutlet);
router.get('/', listNotifications);
router.post('/:id/read', markNotificationRead);

export default router;
