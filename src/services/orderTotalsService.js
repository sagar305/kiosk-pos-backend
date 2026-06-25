import Tax from '../models/Tax.js';
import { resolveSelectedOptions } from './menuService.js';

// Computes the full charge breakdown for a set of cart items against the
// business's active taxes, an optional discount/coupon, fees and tip.
// Each item's unit price is its product's base price plus any chosen
// customisation options' priceDelta.
export async function computeOrderTotals({ items, products, discountType, discountValue, fees, tipAmount }) {
  let itemsSubtotal = 0;
  let taxTotal = 0;

  for (const item of items) {
    const product = products.find((p) => String(p._id) === String(item.product));
    if (!product) continue;
    const { priceDelta } = resolveSelectedOptions(product, item.selectedOptions || []);
    const unitPrice = product.price + priceDelta;
    const lineTotal = unitPrice * item.qty;
    itemsSubtotal += lineTotal;

    if (product.taxIds?.length) {
      const taxes = await Tax.find({ _id: { $in: product.taxIds }, active: true });
      for (const tax of taxes) {
        taxTotal += (lineTotal * tax.percent) / 100;
      }
    }
  }

  let discountTotal = 0;
  if (discountType === 'percent') {
    discountTotal = (itemsSubtotal * (discountValue || 0)) / 100;
  } else {
    discountTotal = discountValue || 0;
  }
  discountTotal = Math.min(discountTotal, itemsSubtotal);

  let feesTotal = 0;
  for (const fee of fees || []) {
    feesTotal += fee.type === 'percent' ? (itemsSubtotal * fee.value) / 100 : fee.value;
  }

  const total = itemsSubtotal - discountTotal + taxTotal + feesTotal + (tipAmount || 0);

  return {
    itemsSubtotal: round2(itemsSubtotal),
    discountTotal: round2(discountTotal),
    taxTotal: round2(taxTotal),
    feesTotal: round2(feesTotal),
    tipAmount: round2(tipAmount || 0),
    total: round2(total),
  };
}

function round2(n) {
  return Math.round(n * 1000) / 1000;
}
