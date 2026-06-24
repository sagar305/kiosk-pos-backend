import express from 'express';
import { getReadyTokens, readyScreenStream } from '../controllers/publicController.js';

const router = express.Router();

router.get('/:businessSlug/ready', getReadyTokens);
router.get('/:businessSlug/ready/stream', readyScreenStream);

export default router;
