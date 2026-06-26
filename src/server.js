import dotenv from 'dotenv';
dotenv.config();

import cron from 'node-cron';
import app from './app.js';
import connectDB from './config/db.js';
import { runExpiryChecks } from './jobs/expiryJobs.js';

const PORT = process.env.PORT || 5000;

connectDB().then(() => {
  app.listen(PORT, () => console.log(`🚀 Kiosk POS backend listening on port ${PORT}`));

  // Hourly: catches both "expiring within 24h" (raise a PO) and "already
  // expired" (pull from stock + log wastage) without needing a precise hour.
  cron.schedule('0 * * * *', () => {
    runExpiryChecks().catch((err) => console.error('Expiry check job failed:', err));
  });
});
