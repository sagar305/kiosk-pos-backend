import XLSX from 'xlsx';
import Ingredient from '../models/Ingredient.js';
import Product from '../models/Product.js';
import Category from '../models/Category.js';

function sheetRows(buffer) {
  const workbook = XLSX.read(buffer, { type: 'buffer' });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  return XLSX.utils.sheet_to_json(sheet, { defval: '' });
}

function buildTemplate(headers) {
  const sheet = XLSX.utils.aoa_to_sheet([headers]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, 'Sheet1');
  return XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
}

export const ingredientTemplate = (req, res) => {
  const buffer = buildTemplate(['name', 'unit', 'stockQty', 'thresholdQty', 'reorderQty', 'costPerUnit', 'packSize', 'packLabel']);
  res.setHeader('Content-Disposition', 'attachment; filename="ingredient-template.xlsx"');
  res.type('xlsx').send(buffer);
};

export const productTemplate = (req, res) => {
  const buffer = buildTemplate(['name', 'category', 'price', 'available']);
  res.setHeader('Content-Disposition', 'attachment; filename="product-template.xlsx"');
  res.type('xlsx').send(buffer);
};

async function upsertIngredientRows(rows, userId) {
  const created = [];
  const updated = [];
  const errors = [];
  for (const row of rows) {
    try {
      const name = String(row.name || '').trim();
      if (!name) continue;
      const data = {
        name,
        unit: row.unit || 'g',
        stockQty: Number(row.stockQty) || 0,
        thresholdQty: Number(row.thresholdQty) || 0,
        reorderQty: Number(row.reorderQty) || 0,
        costPerUnit: Number(row.costPerUnit) || 0,
        packSize: Number(row.packSize) || 1,
        packLabel: row.packLabel || '',
      };
      const existing = await Ingredient.findOne({ name });
      if (existing) {
        await Ingredient.findByIdAndUpdate(existing._id, data);
        updated.push(name);
      } else {
        await Ingredient.create(data);
        created.push(name);
      }
    } catch (err) {
      errors.push({ row, error: err.message });
    }
  }
  return { created, updated, errors };
}

async function upsertProductRows(rows) {
  const created = [];
  const updated = [];
  const errors = [];
  for (const row of rows) {
    try {
      const name = String(row.name || '').trim();
      if (!name) continue;
      const categoryName = String(row.category || '').trim();
      let category = categoryName ? await Category.findOne({ name: categoryName }) : null;
      if (categoryName && !category) category = await Category.create({ name: categoryName });
      const data = {
        name,
        price: Number(row.price) || 0,
        available: row.available === '' ? true : Boolean(row.available),
        ...(category ? { category: category._id } : {}),
      };
      const existing = await Product.findOne({ name });
      if (existing) {
        await Product.findByIdAndUpdate(existing._id, data);
        updated.push(name);
      } else {
        if (!category) throw new Error('Category is required for new products');
        await Product.create(data);
        created.push(name);
      }
    } catch (err) {
      errors.push({ row, error: err.message });
    }
  }
  return { created, updated, errors };
}

export const importIngredientsExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const result = await upsertIngredientRows(sheetRows(req.file.buffer), req.user._id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const importIngredientRows = async (req, res) => {
  try {
    const result = await upsertIngredientRows(req.body.rows || [], req.user._id);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const importProductsExcel = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const result = await upsertProductRows(sheetRows(req.file.buffer));
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

export const importProductRows = async (req, res) => {
  try {
    const result = await upsertProductRows(req.body.rows || []);
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Best-effort: most supplier bills list one item per line as
// "<name> ... <qty> <unit> ... <price>". We can't reliably parse arbitrary
// invoice layouts, so this only extracts a guess per line and the caller
// (frontend) shows it as an editable table before anything is imported.
export const previewPdfBill = async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  try {
    const { default: pdfParse } = await import('pdf-parse');
    const data = await pdfParse(req.file.buffer);
    const lines = data.text.split('\n').map((l) => l.trim()).filter(Boolean);

    const lineRegex = /^(.+?)\s+(\d+(?:\.\d+)?)\s*(kg|g|ml|l|pc|pcs|packet|pkt)?\s*[@x]?\s*[₹$]?\s*(\d+(?:\.\d+)?)?$/i;
    const rows = [];
    for (const line of lines) {
      const match = line.match(lineRegex);
      if (!match) continue;
      const [, name, qty, unitRaw, price] = match;
      rows.push({
        name: name.trim(),
        qty: Number(qty),
        unit: (unitRaw || '').toLowerCase().startsWith('pkt') || (unitRaw || '').toLowerCase().startsWith('packet')
          ? 'pc'
          : (unitRaw || 'pc').replace('pcs', 'pc'),
        costPerUnit: price ? round3(Number(price) / Number(qty)) : 0,
      });
    }
    res.json({ rows, rawText: data.text });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

function round3(n) {
  return Math.round(n * 1000) / 1000;
}
