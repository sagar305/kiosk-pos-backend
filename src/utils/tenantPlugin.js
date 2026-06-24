import mongoose from 'mongoose';
import { getBusinessId } from './tenantContext.js';

// Adds a businessId field to a schema and transparently scopes every
// query/save/aggregate to the current request's tenant (via AsyncLocalStorage).
// Controllers can do Model.find() / Model.create() without repeating
// { businessId: req.businessId } everywhere, and forgetting to scope a query
// manually can't leak data across tenants.
export default function tenantPlugin(schema) {
  schema.add({
    businessId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Business',
      index: true,
    },
  });

  schema.pre('save', function (next) {
    if (!this.businessId) {
      const businessId = getBusinessId();
      if (businessId) this.businessId = businessId;
    }
    next();
  });

  schema.pre('insertMany', function (next, docs) {
    const businessId = getBusinessId();
    if (businessId) {
      docs.forEach((doc) => {
        if (!doc.businessId) doc.businessId = businessId;
      });
    }
    next();
  });

  const scopeQuery = function (next) {
    const businessId = getBusinessId();
    if (businessId && this.getFilter().businessId === undefined) {
      this.where({ businessId });
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
    const businessId = getBusinessId();
    if (businessId) {
      this.pipeline().unshift({
        $match: { businessId: new mongoose.Types.ObjectId(businessId) },
      });
    }
    next();
  });
}
