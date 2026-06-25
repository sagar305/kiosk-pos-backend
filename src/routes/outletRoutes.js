import express from 'express';
import { listOutlets, createOutlet, updateOutlet, deleteOutlet } from '../controllers/outletController.js';
import { requireAuth } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';

const router = express.Router();

router.use(requireAuth);
// Any authenticated user can list outlets (needed for an outlet switcher);
// only the owner can create/edit/remove outlets.
router.get('/', listOutlets);
router.post('/', permit('owner'), createOutlet);
router.patch('/:id', permit('owner'), updateOutlet);
router.delete('/:id', permit('owner'), deleteOutlet);

export default router;
