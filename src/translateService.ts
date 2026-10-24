import { GoogleGenAI } from '@google/genai';

export interface TranslationRequest {
  text?: string;
  sourceLang?: string;
  targetLang?: string;
  imageBase64?: string;
  mimeType?: string;
}

export interface TranslationResponse {
  translatedText: string;
  sourceLang: string;
  targetLang: string;
}

function getAiClient(customApiKey?: string): GoogleGenAI {
  const apiKey = customApiKey || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error(
      'GEMINI_API_KEY environment variable is not configured. Please set GEMINI_API_KEY in your Cloudflare Pages / server environment variables.'
    );
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export async function translateContent(
  req: TranslationRequest,
  customApiKey?: string
): Promise<TranslationResponse> {
  const ai = getAiClient(customApiKey);
  const sourceLang = req.sourceLang || 'Auto-detect';
  const targetLang = req.targetLang || 'Urdu';

  // Handle multimodal image translation if an image is provided
  if (req.imageBase64) {
    const mimeType = req.mimeType || 'image/jpeg';
    const cleanBase64 = req.imageBase64.replace(/^data:image\/[a-zA-Z+]+;base64,/, '');

    const imagePart = {
      inlineData: {
        mimeType,
        data: cleanBase64,
      },
    };

    const promptPart = {
      text: `Carefully read any text visible in this image and translate it accurately into ${targetLang}. Return ONLY the direct translation. If there is no legible text in the image, reply: "No text detected in this image."`,
    };

    const response = await ai.models.generateContent({
      model: 'gemini-3.1-flash-lite',
      contents: { parts: [imagePart, promptPart] },
      config: {
        temperature: 0.2,
      },
    });

    const translatedText = (response.text || '').trim();
    return {
      translatedText,
      sourceLang,
      targetLang,
    };
  }

  // Handle text translation
  const text = (req.text || '').trim();
  if (!text) {
    return {
      translatedText: '',
      sourceLang,
      targetLang,
    };
  }

  // If source and target languages are identical, return the original text directly
  if (sourceLang === targetLang && sourceLang !== 'Auto-detect') {
    return {
      translatedText: text,
      sourceLang,
      targetLang,
    };
  }

  const systemInstruction = `You are an expert, highly accurate language translator.
Translate the user input text faithfully and accurately from ${sourceLang} into ${targetLang}.
Preserve the exact tone, formatting, punctuation, casing, line breaks, and cultural nuances.
Do not add any explanations, notes, conversational filler, or quotation marks unless present in the source text.
Return ONLY the direct translation.`;

  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: text,
    config: {
      systemInstruction,
      temperature: 0.2,
    },
  });

  const translatedText = (response.text || '').trim();

  return {
    translatedText,
    sourceLang,
    targetLang,
  };
}
