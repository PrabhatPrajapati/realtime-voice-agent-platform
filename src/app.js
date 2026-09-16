import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { requestLogger } from './middleware/request-logger.js';
import { errorHandler } from './middleware/error-handler.js';
import apiRoutes from './routes/index.js';
import twilioWebhookRoutes from './routes/twilio-webhook.routes.js';

const app = express();

// Security Headers
app.use(
  helmet({
    contentSecurityPolicy: false, // For flexibility with media streams and dev dashboards
  })
);

// Cross-Origin Resource Sharing
app.use(cors());

// Request Logging
app.use(requestLogger);

// Body Parsing
// Standard JSON for REST APIs
app.use(express.json());
// URL-encoded parser (required for Twilio webhook form-data payloads)
app.use(express.urlencoded({ extended: true }));

// Webhook Routes (Twilio)
app.use('/webhooks/twilio', twilioWebhookRoutes);

// Static Assets & Dashboard UI
app.use(express.static('public'));

// Main REST API Routes
app.use('/api', apiRoutes);

// 404 Handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: `Route ${req.method} ${req.originalUrl} not found`,
  });
});

// Centralized Error Handling Middleware
app.use(errorHandler);

export default app;
