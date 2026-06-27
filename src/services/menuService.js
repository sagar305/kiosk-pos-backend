// Resolves the actual ingredients consumed and the actual price for a cart
// line, accounting for combos (bundle of other products' recipes) and
// customisation options (extra recipe lines + price deltas on top of the
// base product).

// `product` must have `comboItems.product` populated when type === 'combo'.
// `selectedOptionIds` is the list of customisation option _ids chosen for
// this line (from Product.customisations[].options[]._id).
// `selectedComboItemIds` is the list of comboItem _ids the customer opted
// into (combo bundled items are optional add-ons, not auto-included).
export function getEffectiveRecipe(product, selectedOptionIds = [], selectedComboItemIds = []) {
  const lines = [...(product.recipe || [])];

  if (product.type === 'combo') {
    for (const comboItem of product.comboItems || []) {
      if (!selectedComboItemIds.some((id) => String(id) === String(comboItem._id))) continue;
      const sub = comboItem.product;
      if (!sub) continue;
      for (const line of sub.recipe || []) {
        lines.push({ ingredient: line.ingredient, qty: line.qty * comboItem.qty });
      }
    }
  }

  // Customisation options can be attached to combo products too (e.g. an
  // optional add-on), so resolve them regardless of product type.
  for (const group of product.customisations || []) {
    for (const option of group.options || []) {
      if (selectedOptionIds.some((id) => String(id) === String(option._id))) {
        lines.push(...(option.recipe || []));
      }
    }
  }
  return lines;
}

// Snapshots the combo bundled items the customer opted into, and returns the
// total price delta they add to the combo's base price.
export function resolveSelectedComboItems(product, selectedComboItemIds = []) {
  const selected = [];
  let priceDelta = 0;
  for (const comboItem of product.comboItems || []) {
    if (!selectedComboItemIds.some((id) => String(id) === String(comboItem._id))) continue;
    const sub = comboItem.product;
    selected.push({
      comboItemId: comboItem._id,
      product: sub?._id || comboItem.product,
      name: sub?.name || '',
      qty: comboItem.qty,
      priceDelta: comboItem.priceDelta || 0,
    });
    priceDelta += comboItem.priceDelta || 0;
  }
  return { selected, priceDelta };
}

// Snapshots the chosen customisation options for storage on the order item,
// and returns the total price delta they add to the product's base price.
export function resolveSelectedOptions(product, selectedOptionIds = []) {
  const selected = [];
  let priceDelta = 0;
  for (const group of product.customisations || []) {
    for (const option of group.options || []) {
      if (selectedOptionIds.some((id) => String(id) === String(option._id))) {
        selected.push({ group: group.name, option: option._id, name: option.name, priceDelta: option.priceDelta || 0 });
        priceDelta += option.priceDelta || 0;
      }
    }
  }
  return { selected, priceDelta };
}
