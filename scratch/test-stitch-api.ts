import 'dotenv/config';
import { Stitch, StitchToolClient } from '@google/stitch-sdk';

async function testStitchInit() {
  const apiKey = process.env.STITCH_API_KEY || process.env.GEMINI_API_KEY;
  console.log('API Key present for Stitch:', !!apiKey);

  try {
    const stitch = new Stitch({ apiKey });
    console.log('Stitch instance created successfully.');
    console.log('Stitch methods:', Object.getOwnPropertyNames(Object.getPrototypeOf(stitch)));
  } catch (err: any) {
    console.error('Stitch init error:', err);
  }
}

testStitchInit();
