import type { IncomingMessage, ServerResponse } from 'http';
import { translateContent, type TranslationRequest } from '../src/translateService';

// Vercel Serverless Function Handler
export default async function handler(req: any, res: any) {
  // CORS headers
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS,PATCH,DELETE,POST,PUT');
  res.setHeader(
    'Access-Control-Allow-Headers',
    'X-CSRF-Token, X-Requested-With, Accept, Accept-Version, Content-Length, Content-MD5, Content-Type, Date, X-Api-Version'
  );

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  try {
    const body: TranslationRequest = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;

    if (!body || (!body.text && !body.imageBase64)) {
      return res.status(400).json({ error: 'Text or image is required for translation.' });
    }

    const result = await translateContent(body);
    return res.status(200).json(result);
  } catch (err: any) {
    console.error('Translation error in Vercel function:', err);
    return res.status(500).json({
      error: err?.message || 'Translation failed. Please try again.',
    });
  }
}
