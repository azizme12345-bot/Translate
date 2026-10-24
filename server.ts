import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import dotenv from 'dotenv';
import { translateContent, type TranslationRequest } from './src/translateService';

dotenv.config();

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '15mb' }));

  // Translation API Route (matches Vercel serverless /api/translate route)
  app.post('/api/translate', async (req, res) => {
    try {
      const body: TranslationRequest = req.body;
      if (!body || (!body.text && !body.imageBase64)) {
        res.status(400).json({ error: 'Text or image is required for translation.' });
        return;
      }

      const result = await translateContent(body);
      res.json(result);
    } catch (err: any) {
      console.error('Server translation error:', err);
      res.status(500).json({
        error: err?.message || 'Translation failed on the server. Please try again.',
      });
    }
  });

  if (isProd) {
    app.use(express.static(path.resolve('dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve('dist', 'index.html'));
    });
  } else {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        host: '0.0.0.0',
        port: PORT,
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
