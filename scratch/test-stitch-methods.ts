import 'dotenv/config';
import { StitchToolClient } from '@google/stitch-sdk';

async function testStitchMethods() {
  const apiKey = process.env.STITCH_API_KEY || process.env.GEMINI_API_KEY;
  try {
    const client = new StitchToolClient({ apiKey });
    console.log('Calling create_project with title...');
    
    const projectRes = await client.callTool('create_project', {
      title: 'Test Student Expense Tracking App',
    });
    console.log('create_project result:', JSON.stringify(projectRes, null, 2));
  } catch (err: any) {
    console.error('Stitch method error:', err.message || err);
  }
}

testStitchMethods();
