// Server-Sent Events fan-out, scoped per business, so KDS screens and the
// public Ready Pickup display get realtime token updates without polling.
const clientsByBusiness = new Map();

export function addClient(req, res) {
  const businessId = String(req.businessId);
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();
  res.write('retry: 2000\n\n');

  if (!clientsByBusiness.has(businessId)) clientsByBusiness.set(businessId, new Set());
  clientsByBusiness.get(businessId).add(res);

  req.on('close', () => {
    clientsByBusiness.get(businessId)?.delete(res);
  });
}

export function broadcast(businessId, event, data) {
  const clients = clientsByBusiness.get(String(businessId));
  if (!clients) return;
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  for (const res of clients) res.write(payload);
}
