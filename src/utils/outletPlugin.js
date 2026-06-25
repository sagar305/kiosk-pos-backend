import mongoose from 'mongoose';
import { getOutletId } from './tenantContext.js';

// Adds an `outlet` field and transparently scopes queries/saves to the
// current request's outlet (resolved by requireAuth from the X-Outlet-Id
// header), mirroring tenantPlugin. Scoping only applies when an outlet is
// actually selected, so an owner viewing without an outlet selected sees
// across all of their outlets.
export default function outletPlugin(schema) {
  schema.add({
    outlet: { type: mongoose.Schema.Types.ObjectId, ref: 'Outlet', index: true },
  });

  schema.pre('save', function (next) {
    if (!this.outlet) {
      const outletId = getOutletId();
      if (outletId) this.outlet = outletId;
    }
    next();
  });

  schema.pre('insertMany', function (next, docs) {
    const outletId = getOutletId();
    if (outletId) {
      docs.forEach((doc) => {
        if (!doc.outlet) doc.outlet = outletId;
      });
    }
    next();
  });

  const scopeQuery = function (next) {
    const outletId = getOutletId();
    if (outletId && this.getFilter().outlet === undefined) {
      this.where({ outlet: outletId });
    }
    next();
  };

  [
    'find',
    'findOne',
    'findOneAndUpdate',
    'findOneAndDelete',
    'findOneAndRemove',
    'countDocuments',
    'updateMany',
    'updateOne',
    'deleteMany',
    'deleteOne',
  ].forEach((method) => schema.pre(method, scopeQuery));

  schema.pre('aggregate', function (next) {
    const outletId = getOutletId();
    if (outletId) {
      this.pipeline().unshift({ $match: { outlet: new mongoose.Types.ObjectId(outletId) } });
    }
    next();
  });
}
