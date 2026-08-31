import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

async function testSearch() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: 'Perform market research on student expense tracking apps in 2025/2026. List top 3 competitors, pricing, user complaints, and web sources with URLs.',
      config: {
        tools: [{ googleSearch: {} }],
      },
    });

    console.log('Text Output:', response.text);
    const candidate = response.candidates?.[0];
    console.log('Grounding Metadata:', JSON.stringify(candidate?.groundingMetadata, null, 2));
  } catch (err: any) {
    console.error('Search test error:', err.message);
  }
}

testSearch();
