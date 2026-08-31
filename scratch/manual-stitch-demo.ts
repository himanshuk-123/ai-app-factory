import dotenv from 'dotenv';
import { StitchToolClient } from '@google/stitch-sdk';

dotenv.config();

/**
 * Manual Stitch API Demo Script
 * Demonstrates how to programmatically call Google Stitch to create projects and generate screens.
 */
async function runManualStitchDemo() {
  const apiKey = process.env.STITCH_API_KEY || process.env.GEMINI_API_KEY;
  console.log('==================================================');
  console.log('🎨 MANUAL GOOGLE STITCH API DEMO');
  console.log('==================================================\n');

  if (!apiKey) {
    console.error('❌ STITCH_API_KEY or GEMINI_API_KEY is not set in .env');
    return;
  }

  console.log('1. Initializing Stitch Tool Client via @google/stitch-sdk...');
  const client = new StitchToolClient({ apiKey });

  try {
    // Step 1: Create a Stitch Project
    const projectTitle = `Custom App Design ${Date.now()}`;
    console.log(`\n2. Creating Stitch Project: "${projectTitle}"...`);
    
    const projectRes: any = await client.callTool('create_project', { title: projectTitle });
    console.log('Stitch Project Response:', JSON.stringify(projectRes, null, 2));

    const projectId = projectRes?.id || projectRes?.name || `projects/stitch_${Date.now()}`;
    const cleanProjectId = projectId.replace(/^projects\//, '');

    // Step 2: Generate a Custom UI Screen
    const screenName = 'Habit Tracker Dashboard';
    const prompt = 'Create a modern dark-mode mobile dashboard for habit tracking with daily streaks, progress rings, and habit completion cards.';
    
    console.log(`\n3. Generating Screen "${screenName}" for project ${cleanProjectId}...`);
    const screenRes: any = await client.callTool('generate_screen_from_text', {
      projectId: cleanProjectId,
      prompt: `Screen Name: ${screenName}\n\n${prompt}`,
      deviceType: 'MOBILE',
      modelId: 'GEMINI_3_FLASH',
    });

    console.log('Stitch Screen Generation Response:', JSON.stringify(screenRes, null, 2));
    console.log('\n==================================================');
    console.log('✅ MANUAL STITCH API DEMO COMPLETED SUCCESSFULLY');
    console.log('==================================================');
  } catch (err: any) {
    console.error('\n⚠️ Stitch API Call Note:', err.message);
    console.log('\nIf Stitch API endpoint access is restricted for your key, MockStitchProvider is automatically used by Stage 5 (Stitch Designer Agent).');
  }
}

runManualStitchDemo();
