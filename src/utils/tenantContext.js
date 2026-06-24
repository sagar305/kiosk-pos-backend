import { AsyncLocalStorage } from 'async_hooks';

// Carries the current request's businessId through async operations without
// threading it through every function call. Set once per request by
// requireAuth (see authMiddleware.js); read by tenantPlugin to auto-scope
// every query/save on tenant-owned models.
const storage = new AsyncLocalStorage();

export const runWithTenant = (businessId, fn) => storage.run({ businessId }, fn);

export const getBusinessId = () => storage.getStore()?.businessId || null;
