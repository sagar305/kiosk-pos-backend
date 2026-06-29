import crypto from 'crypto';
import Business from '../models/Business.js';
import { getSession, deleteSession } from '../services/aiAssistantSessions.js';
import { runAssistantTurn } from '../services/aiAssistant.js';
import { resolveAnthropicApiKey } from '../services/anthropicClient.js';

export const chatWithAssistant = async (req, res) => {
  try {
    const { message } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'message is required' });
    }

    const business = await Business.findById(req.businessId);
    const apiKey = resolveAnthropicApiKey({ business, ownerEmail: req.user.email });
    if (!apiKey) {
      return res.status(403).json({
        error: 'No Anthropic API key available for this business. Add your own API key in Settings to use the AI assistant.',
      });
    }

    const sessionId = req.body.sessionId || crypto.randomUUID();
    const session = getSession(req.businessId, sessionId);

    const { reply, createdProduct } = await runAssistantTurn(session, message, req.user.role, req.user._id, apiKey);

    res.json({ sessionId, reply, createdProduct });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const resetAssistantSession = async (req, res) => {
  deleteSession(req.businessId, req.params.sessionId);
  res.json({ ok: true });
};
