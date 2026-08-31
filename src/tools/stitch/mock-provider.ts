import type { IStitchProvider } from './types.js';

export class MockStitchProvider implements IStitchProvider {
  name = 'MockStitchProvider';

  async createProject(title: string): Promise<{ id: string; name: string }> {
    const timestamp = Date.now();
    const id = `stitch_proj_${timestamp}`;
    return {
      id,
      name: `projects/${id}`,
    };
  }

  async generateScreen(
    projectId: string,
    screenName: string,
    _prompt: string
  ): Promise<{ screenId: string; previewUrl?: string }> {
    const screenSlug = screenName.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    const screenId = `stitch_screen_${screenSlug}_${Date.now().toString(36)}`;
    return {
      screenId,
      previewUrl: `https://stitch.google.com/projects/${projectId}/screens/${screenId}`,
    };
  }
}
