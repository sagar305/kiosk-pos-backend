// In-memory per-process conversation store, scoped by business so one
// tenant can never see another's chat. Sessions are intentionally ephemeral
// (lost on restart) — this is a chat aid, not an audit log.
const sessions = new Map();

function key(businessId, sessionId) {
  return `${businessId}:${sessionId}`;
}

export function getSession(businessId, sessionId) {
  const k = key(businessId, sessionId);
  if (!sessions.has(k)) {
    sessions.set(k, { messages: [], lastCreatedProduct: null, outletId: null });
  }
  return sessions.get(k);
}

export function deleteSession(businessId, sessionId) {
  sessions.delete(key(businessId, sessionId));
}
