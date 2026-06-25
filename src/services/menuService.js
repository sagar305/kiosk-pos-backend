// Resolves the actual ingredients consumed and the actual price for a cart
// line, accounting for combos (bundle of other products' recipes) and
// customisation options (extra recipe lines + price deltas on top of the
// base product).

// `product` must have `comboItems.product` populated when type === 'combo'.
// `selectedOptionIds` is the list of customisation option _ids chosen for
// this line (from Product.customisations[].options[]._id).
export function getEffectiveRecipe(product, selectedOptionIds = []) {
  if (product.type === 'combo') {
    const lines = [];
    for (const comboItem of product.comboItems || []) {
      const sub = comboItem.product;
      if (!sub) continue;
      for (const line of sub.recipe || []) {
        lines.push({ ingredient: line.ingredient, qty: line.qty * comboItem.qty });
      }
    }
    return lines;
  }

  const lines = [...(product.recipe || [])];
  for (const group of product.customisations || []) {
    for (const option of group.options || []) {
      if (selectedOptionIds.some((id) => String(id) === String(option._id))) {
        lines.push(...(option.recipe || []));
      }
    }
  }
  return lines;
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
