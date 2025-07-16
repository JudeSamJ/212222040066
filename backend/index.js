import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import Logger from './logger.js';
import urlController from './controllers/urlController.js';
import { validateCreateUrl } from './middleware/validation.js';

// Necessary for __dirname in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

const logger = new Logger();

app.use(express.json());

app.use(async (req, res, next) => {
  const startTime = Date.now();

  await logger.info(
    'backend',
    'middleware',
    `${req.method} ${req.path} - Request received`
  );

  const originalJson = res.json;
  res.json = function (data) {
    const duration = Date.now() - startTime;
    logger.info(
      'backend',
      'middleware',
      `${req.method} ${req.path} - Response sent (${res.statusCode}) in ${duration}ms`
    );
    return originalJson.call(this, data);
  };

  next();
});

app.post(
  '/shorturls',
  validateCreateUrl,
  urlController.createShortUrl.bind(urlController)
);
app.get(
  '/shorturls/:shortcode',
  urlController.getUrlStatistics.bind(urlController)
);
app.get('/:shortcode', urlController.redirectToOriginalUrl.bind(urlController));

app.use(async (err, req, res, next) => {
  await logger.error('backend', 'middleware', `Error: ${err.message}`);
  res.status(500).json({
    error: 'Internal server error',
    message: err.message,
  });
});

app.use(async (req, res) => {
  await logger.warn(
    'backend',
    'route',
    `404 - Route not found: ${req.method} ${req.path}`
  );
  res.status(404).json({
    error: 'Not found',
    message: 'The requested resource was not found',
  });
});

app.listen(PORT, async () => {
  await logger.info(
    'backend',
    'config',
    `URL Shortener Microservice started on port ${PORT}`
  );
  console.log(`Server running on http://localhost:${PORT}`);
});

export default app;
