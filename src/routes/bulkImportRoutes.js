import express from 'express';
import multer from 'multer';
import {
  ingredientTemplate,
  productTemplate,
  importIngredientsExcel,
  importIngredientRows,
  importProductsExcel,
  importProductRows,
  previewPdfBill,
} from '../controllers/bulkImportController.js';
import { requireAuth, requireOutlet } from '../middlewares/authMiddleware.js';
import { permit } from '../middlewares/roleMiddleware.js';

const router = express.Router();

// Separate multer instance from the product-image upload middleware: these
// files are spreadsheets/PDFs, not images, and never touch Cloudinary.
const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 10 * 1024 * 1024 } });

router.use(requireAuth, permit('owner', 'pos_manager'), requireOutlet);

router.get('/template/ingredients', ingredientTemplate);
router.get('/template/products', productTemplate);
router.post('/ingredients/excel', upload.single('file'), importIngredientsExcel);
router.post('/ingredients/rows', importIngredientRows);
router.post('/products/excel', upload.single('file'), importProductsExcel);
router.post('/products/rows', importProductRows);
router.post('/pdf-preview', upload.single('file'), previewPdfBill);

export default router;
