import 'dotenv/config';
import { GoogleGenAI } from '@google/genai';

async function testModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  const ai = new GoogleGenAI({ apiKey });
  try {
    const testGen = await ai.models.generateContent({
      model: 'gemini-3.6-flash',
      contents: 'Hello! Evaluate this app idea: "Build a student expense tracking app". Return a valid JSON with keys: problem, targetUsers, valueProposition, competitionAssessment, differentiation, technicalFeasibility, monetizationPotential, keyRisks, score, recommendation.',
      config: { responseMimeType: 'application/json' }
    });
    console.log('gemini-3.6-flash response:', testGen.text);
  } catch (err: any) {
    console.error('Test error:', err.message);
  }
}

testModels();
