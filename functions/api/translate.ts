import { translateContent, type TranslationRequest } from '../../src/translateService';

interface Env {
  GEMINI_API_KEY?: string;
}

// Cloudflare Pages Function Handler for POST /api/translate
export const onRequestPost = async (context: { request: Request; env: Env }) => {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { request, env } = context;
    const apiKey = env.GEMINI_API_KEY || (typeof process !== 'undefined' ? process.env?.GEMINI_API_KEY : '');

    if (!apiKey) {
      return new Response(
        JSON.stringify({
          error:
            'GEMINI_API_KEY is not configured in Cloudflare Pages. Please set GEMINI_API_KEY under Settings > Environment Variables in Cloudflare Pages dashboard.',
        }),
        {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const body: TranslationRequest = await request.json();

    if (!body || (!body.text && !body.imageBase64)) {
      return new Response(
        JSON.stringify({ error: 'Text or image is required for translation.' }),
        {
          status: 400,
          headers: { 'Content-Type': 'application/json', ...corsHeaders },
        }
      );
    }

    const result = await translateContent(body, apiKey);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json', ...corsHeaders },
    });
  } catch (err: any) {
    console.error('Cloudflare Pages translation error:', err);
    return new Response(
      JSON.stringify({ error: err?.message || 'Translation failed on Cloudflare Pages function.' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json', ...corsHeaders },
      }
    );
  }
};

export const onRequestOptions = async () => {
  return new Response(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
};
