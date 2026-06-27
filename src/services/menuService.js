// Resolves the actual ingredients consumed and the actual price for a cart
// line, accounting for combos (bundle of other products' recipes) and
// customisation options (extra recipe lines + price deltas on top of the
// base product).

// `product` must have `comboItems.product` populated when type === 'combo'.
// `selectedOptionIds` is the list of customisation option _ids chosen for
// this line (from Product.customisations[].options[]._id).
// `selectedComboItems` is the list of `{ comboItemId, selectedOptions }` the
// customer opted into (combo bundled items are optional add-ons, not
// auto-included) - `selectedOptions` are the chosen customisation option
// _ids for the bundled sub-product itself (e.g. a required "Size" group).
export function getEffectiveRecipe(product, selectedOptionIds = [], selectedComboItems = []) {
  const lines = [...(product.recipe || [])];

  if (product.type === 'combo') {
    for (const comboItem of product.comboItems || []) {
      const entry = selectedComboItems.find((e) => String(e.comboItemId) === String(comboItem._id));
      if (!entry) continue;
      const sub = comboItem.product;
      if (!sub) continue;
      for (const line of sub.recipe || []) {
        lines.push({ ingredient: line.ingredient, qty: line.qty * comboItem.qty });
      }
      lines.push(...optionsRecipeFor(sub, entry.selectedOptions || []));
    }
  }

  // Customisation options can be attached to combo products too (e.g. an
  // optional add-on), so resolve them regardless of product type.
  lines.push(...optionsRecipeFor(product, selectedOptionIds));
  return lines;
}

// Recipe lines contributed by the chosen customisation options of a given
// product (used for both a line's top-level product and a combo's bundled
// sub-products).
function optionsRecipeFor(product, selectedOptionIds = []) {
  const lines = [];
  for (const group of product.customisations || []) {
    for (const option of group.options || []) {
      if (selectedOptionIds.some((id) => String(id) === String(option._id))) {
        lines.push(...(option.recipe || []));
      }
    }
  }
  return lines;
}

// Snapshots the combo bundled items the customer opted into (including any
// customisations chosen for the bundled sub-product itself), and returns the
// total price delta they add to the combo's base price.
export function resolveSelectedComboItems(product, selectedComboItems = []) {
  const selected = [];
  let priceDelta = 0;
  for (const comboItem of product.comboItems || []) {
    const entry = selectedComboItems.find((e) => String(e.comboItemId) === String(comboItem._id));
    if (!entry) continue;
    const sub = comboItem.product;
    const { selected: subSelectedOptions, priceDelta: subPriceDelta } = resolveSelectedOptions(sub, entry.selectedOptions || []);
    const itemPriceDelta = (comboItem.priceDelta || 0) + subPriceDelta;
    selected.push({
      comboItemId: comboItem._id,
      product: sub?._id || comboItem.product,
      name: sub?.name || '',
      qty: comboItem.qty,
      priceDelta: itemPriceDelta,
      selectedOptions: subSelectedOptions,
    });
    priceDelta += itemPriceDelta;
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
