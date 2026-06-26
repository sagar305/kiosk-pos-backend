import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import path from 'path';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';

import authRoutes from './routes/authRoutes.js';
import businessRoutes from './routes/businessRoutes.js';
import outletRoutes from './routes/outletRoutes.js';
import userRoutes from './routes/userRoutes.js';
import categoryRoutes from './routes/categoryRoutes.js';
import taxRoutes from './routes/taxRoutes.js';
import feeRoutes from './routes/feeRoutes.js';
import couponRoutes from './routes/couponRoutes.js';
import productRoutes from './routes/productRoutes.js';
import ingredientRoutes from './routes/ingredientRoutes.js';
import purchaseOrderRoutes from './routes/purchaseOrderRoutes.js';
import orderRoutes from './routes/orderRoutes.js';
import kdsRoutes from './routes/kdsRoutes.js';
import reportRoutes from './routes/reportRoutes.js';
import publicRoutes from './routes/publicRoutes.js';
import bootstrapRoutes from './routes/bootstrapRoutes.js';
import expenseRoutes from './routes/expenseRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import bulkImportRoutes from './routes/bulkImportRoutes.js';

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || '').split(',').map((o) => o.trim()).filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      // No Origin header (curl, server-to-server, same-host Swagger UI) is allowed through.
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

app.use('/api/auth', authRoutes);
app.use('/api/business', businessRoutes);
app.use('/api/outlets', outletRoutes);
app.use('/api/users', userRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/taxes', taxRoutes);
app.use('/api/fees', feeRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/products', productRoutes);
app.use('/api/ingredients', ingredientRoutes);
app.use('/api/purchase-orders', purchaseOrderRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/kds', kdsRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/public', publicRoutes);
app.use('/api/bootstrap', bootstrapRoutes);
app.use('/api/expenses', expenseRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/bulk-import', bulkImportRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.use((err, req, res, next) => {
  if (err.message === 'Not allowed by CORS') return res.status(403).json({ error: err.message });
  if (err.name === 'MulterError') return res.status(400).json({ error: err.message });
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

export default app;
