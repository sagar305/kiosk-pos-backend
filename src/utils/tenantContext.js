import { AsyncLocalStorage } from 'async_hooks';

// Carries the current request's businessId/outletId through async operations
// without threading them through every function call. Set once per request by
// requireAuth (see authMiddleware.js); read by tenantPlugin/outletPlugin to
// auto-scope every query/save on tenant-owned models.
const storage = new AsyncLocalStorage();

export const runWithTenant = (businessId, outletId, fn) => storage.run({ businessId, outletId: outletId || null }, fn);

export const getBusinessId = () => storage.getStore()?.businessId || null;

export const getOutletId = () => storage.getStore()?.outletId || null;
