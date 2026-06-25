import Product from '../models/Product.js';
import Category from '../models/Category.js';
import Ingredient from '../models/Ingredient.js';
import Tax from '../models/Tax.js';
import Fee from '../models/Fee.js';
import Coupon from '../models/Coupon.js';
import Outlet from '../models/Outlet.js';
import Business from '../models/Business.js';

// Everything a POS Manager needs to take orders with no network: full menu
// (with customisations/combos), taxes/fees/coupons, ingredients (for stock
// labels) and outlets. The frontend caches this on login and falls back to
// it when offline.
export const getBootstrap = async (req, res) => {
  const [products, categories, ingredients, taxes, fees, coupons, outlets, business] = await Promise.all([
    Product.find()
      .populate('category')
      .populate('taxIds')
      .populate('recipe.ingredient')
      .populate('comboItems.product', 'name price image'),
    Category.find(),
    Ingredient.find(),
    Tax.find({ active: true }),
    Fee.find({ active: true }),
    Coupon.find({ active: true }),
    Outlet.find(),
    Business.findById(req.businessId),
  ]);

  res.json({
    fetchedAt: new Date().toISOString(),
    business: business
      ? { _id: business._id, name: business.name, slug: business.slug, currency: business.currency, settings: business.settings }
      : null,
    outlets,
    categories,
    ingredients,
    taxes,
    fees,
    coupons,
    products,
  });
};
