import crypto from 'crypto';
import { getSession, deleteSession } from '../services/aiAssistantSessions.js';
import { runAssistantTurn } from '../services/aiAssistant.js';

export const chatWithAssistant = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    const sessionId = req.body.sessionId || crypto.randomUUID();
    const session = getSession(req.businessId, sessionId);

    const { reply, createdProduct } = await runAssistantTurn(session, message, req.user.role);

    res.json({ sessionId, reply, createdProduct });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const resetAssistantSession = async (req, res) => {
  deleteSession(req.businessId, req.params.sessionId);
  res.json({ ok: true });
};
