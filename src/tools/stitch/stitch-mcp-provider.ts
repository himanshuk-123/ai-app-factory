import { StitchToolClient } from '@google/stitch-sdk';
import type { IStitchProvider } from './types.js';

export class StitchMCPProvider implements IStitchProvider {
  name = 'StitchMCPProvider';
  private client: StitchToolClient;

  constructor(apiKey?: string) {
    const rawKey = apiKey || process.env.STITCH_API_KEY || process.env.GEMINI_API_KEY;
    if (!rawKey || !rawKey.trim()) {
      throw new Error('STITCH_API_KEY or GEMINI_API_KEY is missing from environment variables.');
    }
    const cleanKey = rawKey.trim();
    this.client = new StitchToolClient({ apiKey: cleanKey });
  }

  /**
   * Creates a Stitch project using Stitch MCP tool `create_project`.
   */
  async createProject(title: string): Promise<{ id: string; name: string }> {
    try {
      const res: any = await this.client.callTool('create_project', { title });
      
      // Handle tool error responses safely
      if (res?.isError || (Array.isArray(res?.content) && res.content[0]?.text?.includes('Error'))) {
        const errorMsg = res.content?.[0]?.text || 'Stitch MCP create_project failed.';
        throw new Error(errorMsg);
      }

      // Extract project ID / resource name
      const name = res?.name || res?.projectName || res?.id || `projects/stitch_${Date.now()}`;
      const id = name.replace(/^projects\//, '');

      return { id, name };
    } catch (error) {
      throw new Error(`Stitch MCP Project Creation Failed: ${(error as Error).message}`);
    }
  }

  /**
   * Generates a screen using Stitch MCP tool `generate_screen_from_text`.
   */
  async generateScreen(
    projectId: string,
    screenName: string,
    prompt: string
  ): Promise<{ screenId: string; previewUrl?: string; downloadUrl?: string; htmlUrl?: string; theme?: any }> {
    try {
      const cleanProjectId = projectId.replace(/^projects\//, '');
      const res: any = await this.client.callTool('generate_screen_from_text', {
        projectId: cleanProjectId,
        prompt: `Screen Name: ${screenName}\n\n${prompt}`,
        deviceType: 'MOBILE',
        modelId: 'GEMINI_3_FLASH',
      });

      if (res?.isError || (Array.isArray(res?.content) && res.content[0]?.text?.includes('Error'))) {
        const errorMsg = res.content?.[0]?.text || `Screen generation failed for "${screenName}".`;
        throw new Error(errorMsg);
      }

      // Extract output screen metadata
      const screenObj = res?.outputComponents?.[0]?.design?.screens?.[0];
      const screenId = screenObj?.name || res?.screenId || res?.name || `screen_${Date.now()}`;
      const downloadUrl = screenObj?.screenshot?.downloadUrl;
      const htmlUrl = screenObj?.htmlCode?.downloadUrl;
      const theme = screenObj?.theme || res?.outputComponents?.[0]?.designSystem?.theme;

      const previewUrl = res?.previewUrl || res?.url || `https://stitch.google.com/projects/${cleanProjectId}/screens/${screenId.replace(/^.*\/screens\//, '')}`;

      return { screenId, previewUrl, downloadUrl, htmlUrl, theme };
    } catch (error) {
      throw new Error(`Stitch MCP Screen Generation Failed for "${screenName}": ${(error as Error).message}`);
    }
  }
}
