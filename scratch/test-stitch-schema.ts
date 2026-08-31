import 'dotenv/config';
import { toolMap } from '@google/stitch-sdk';

console.log('create_project schema:', JSON.stringify(toolMap.get('create_project')?.inputSchema, null, 2));
console.log('generate_screen_from_text schema:', JSON.stringify(toolMap.get('generate_screen_from_text')?.inputSchema, null, 2));
