// Server-Sent Events fan-out, scoped per business+outlet, so KDS screens and
// the public Ready Pickup display get realtime token updates without
// polling. A client with no outlet selected (e.g. an owner viewing "all
// outlets") subscribes under the `${businessId}:all` key and receives every
// event for that business, regardless of outlet.
const clients = new Map(); // key -> Set<res>

function keyFor(businessId, outletId) {
  return `${businessId}:${outletId || 'all'}`;
}

export function addClient(req, res) {
  const key = keyFor(req.businessId, req.outletId);
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  });
  res.flushHeaders();
  res.write('retry: 2000\n\n');

  if (!clients.has(key)) clients.set(key, new Set());
  clients.get(key).add(res);

  req.on('close', () => {
    clients.get(key)?.delete(res);
  });
}

export function broadcast(businessId, outletId, event, data) {
  const payload = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
  const targets = new Set([keyFor(businessId, null)]);
  if (outletId) targets.add(keyFor(businessId, outletId));
  for (const key of targets) {
    const set = clients.get(key);
    if (!set) continue;
    for (const res of set) res.write(payload);
  }
}
