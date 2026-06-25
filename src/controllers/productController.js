import Product from '../models/Product.js';

// multipart/form-data (used when an image file is attached) can only carry
// string fields, so array/object fields are sent JSON-encoded and need parsing.
function parseJsonField(value) {
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch {
    return value;
  }
}

export const listProducts = async (req, res) => {
  const products = await Product.find()
    .populate('category')
    .populate('taxIds')
    .populate('recipe.ingredient')
    .populate('comboItems.product', 'name price image');
  res.json(products);
};

export const createProduct = async (req, res) => {
  try {
    const { name, category, price, taxIds, recipe, available, type, customisations, comboItems } = req.body;
    const product = await Product.create({
      name,
      category,
      price,
      taxIds: parseJsonField(taxIds),
      recipe: parseJsonField(recipe),
      available,
      type,
      customisations: parseJsonField(customisations),
      comboItems: parseJsonField(comboItems),
      image: req.file ? `/uploads/${req.file.filename}` : req.body.image,
    });
    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const updateProduct = async (req, res) => {
  try {
    const update = { ...req.body };
    if (update.taxIds !== undefined) update.taxIds = parseJsonField(update.taxIds);
    if (update.recipe !== undefined) update.recipe = parseJsonField(update.recipe);
    if (update.customisations !== undefined) update.customisations = parseJsonField(update.customisations);
    if (update.comboItems !== undefined) update.comboItems = parseJsonField(update.comboItems);
    if (req.file) update.image = `/uploads/${req.file.filename}`;
    const product = await Product.findByIdAndUpdate(req.params.id, update, { new: true });
    if (!product) return res.status(404).json({ error: 'Not found' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const setProductAvailability = async (req, res) => {
  const { available } = req.body;
  const product = await Product.findByIdAndUpdate(req.params.id, { available }, { new: true });
  if (!product) return res.status(404).json({ error: 'Not found' });
  res.json(product);
};

export const deleteProduct = async (req, res) => {
  await Product.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
};
