import Anthropic from '@anthropic-ai/sdk';
import { decrypt } from '../utils/encryption.js';

const clientCache = new Map();

// Builds (and caches) an Anthropic client for a specific API key. Each
// business may use its own key, so we cache per-key rather than a single
// global client.
export function getAnthropicClient(apiKey) {
  if (!apiKey) {
    throw new Error('No Anthropic API key available');
  }
  if (!clientCache.has(apiKey)) {
    clientCache.set(apiKey, new Anthropic({ apiKey }));
  }
  return clientCache.get(apiKey);
}

// Decides which Anthropic API key (if any) a business's AI assistant call
// should use:
//   1. The business's own key, if the owner has set one (BYOK).
//   2. The shared ANTHROPIC_API_KEY env var, but only if the business
//      owner's email is in the OWNER_ALLOWED allowlist.
//   3. Otherwise null — caller should tell the owner to add their own key.
export function resolveAnthropicApiKey({ business, ownerEmail }) {
  const ownKeyEncrypted = business?.aiSettings?.anthropicApiKeyEncrypted;
  if (ownKeyEncrypted) {
    return decrypt(ownKeyEncrypted);
  }

  const allowed = (process.env.OWNER_ALLOWED || '')
    .split(',')
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);

  if (ownerEmail && allowed.includes(ownerEmail.toLowerCase()) && process.env.ANTHROPIC_API_KEY) {
    return process.env.ANTHROPIC_API_KEY;
  }

  return null;
}
