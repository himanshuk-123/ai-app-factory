import readline from 'node:readline/promises';
import { stdin as input, stdout as output } from 'node:process';
import dotenv from 'dotenv';
import { StitchToolClient } from '@google/stitch-sdk';

dotenv.config();

async function startInteractiveStitchCLI() {
  const rl = readline.createInterface({ input, output });

  console.log('==================================================');
  console.log('🎨 INTERACTIVE GOOGLE STITCH API TOOL');
  console.log('==================================================\n');

  const apiKey = process.env.STITCH_API_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error('❌ Missing API key! Please set STITCH_API_KEY or GEMINI_API_KEY in your .env file.');
    rl.close();
    return;
  }

  const client = new StitchToolClient({ apiKey });

  try {
    // 1. Prompt for Project Title
    const title = await rl.question('📌 Enter Project Title (e.g. "My Custom Dashboard"): ');
    console.log(`\nSending request to Stitch API: create_project({ title: "${title || 'Untitled Project'}" })...`);

    let projectId = `projects/stitch_${Date.now()}`;
    try {
      const projRes: any = await client.callTool('create_project', { title: title || 'Untitled Project' });
      console.log('\n✅ Stitch Project Created Successfully!');
      console.log('API Response:', JSON.stringify(projRes, null, 2));
      projectId = projRes?.id || projRes?.name || projectId;
    } catch (err: any) {
      console.log('\n⚠️ Live Stitch API Project Creation Response/Error:', err.message);
      console.log(`Using fallback Project ID: "${projectId}"`);
    }

    const cleanProjectId = projectId.replace(/^projects\//, '');

    // Loop for generating screens
    let keepGenerating = true;
    while (keepGenerating) {
      console.log('\n--------------------------------------------------');
      console.log(`📱 Generating Screen for Project ID: "${cleanProjectId}"`);
      console.log('--------------------------------------------------');

      const screenName = await rl.question('1. Enter Screen Name (e.g. "Analytics Screen"): ');
      const userPrompt = await rl.question('2. Enter Detailed Prompt (e.g. "Dark mode with neon green line chart and summary cards"): ');
      
      const deviceChoice = await rl.question('3. Select Device Type [1 = MOBILE, 2 = DESKTOP] (Default: 1): ');
      const deviceType = deviceChoice.trim() === '2' ? 'DESKTOP' : 'MOBILE';

      const apiParameters = {
        projectId: cleanProjectId,
        prompt: `Screen Name: ${screenName || 'Main Screen'}\n\n${userPrompt}`,
        deviceType,
        modelId: 'GEMINI_3_FLASH',
      };

      console.log('\n🚀 Exact API Parameters being sent to Stitch:');
      console.log(JSON.stringify(apiParameters, null, 2));

      console.log('\nCalling Stitch API: generate_screen_from_text...');
      try {
        const screenRes: any = await client.callTool('generate_screen_from_text', apiParameters);
        console.log('\n🎉 Screen Generated Successfully!');
        console.log('API Output Response:', JSON.stringify(screenRes, null, 2));
      } catch (err: any) {
        console.log('\n⚠️ Live Stitch API Screen Generation Response/Error:', err.message);
        const fallbackUrl = `https://stitch.google.com/projects/${cleanProjectId}/screens/screen_${Date.now()}`;
        console.log(`Generated Fallback URL reference: ${fallbackUrl}`);
      }

      const answer = await rl.question('\nWould you like to generate another screen for this project? (y/n): ');
      if (answer.trim().toLowerCase() !== 'y') {
        keepGenerating = false;
      }
    }

    console.log('\n==================================================');
    console.log('👋 Interactive Stitch Session Closed.');
    console.log('==================================================');
  } catch (globalErr: any) {
    console.error('Error during interactive session:', globalErr.message);
  } finally {
    rl.close();
  }
}

startInteractiveStitchCLI();
