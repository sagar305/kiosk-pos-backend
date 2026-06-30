import Anthropic from '@anthropic-ai/sdk';

let client;

// Lazily constructed so the server can boot without the key set (the AI
// route will simply error per-request until ANTHROPIC_API_KEY is configured).
export function getAnthropicClient() {
  if (!client) {
    if (!process.env.ANTHROPIC_API_KEY) {
      throw new Error('ANTHROPIC_API_KEY is not configured');
    }
    client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  }
  return client;
}
