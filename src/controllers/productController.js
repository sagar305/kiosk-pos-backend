import Product from '../models/Product.js';

export const listProducts = async (req, res) => {
  const products = await Product.find().populate('category').populate('taxIds').populate('recipe.ingredient');
  res.json(products);
};

export const createProduct = async (req, res) => {
  try {
    const { name, category, price, taxIds, recipe, available } = req.body;
    const product = await Product.create({
      name,
      category,
      price,
      taxIds,
      recipe,
      available,
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
