import type { IRenderProvider, RenderServiceOptions } from './types.js';

export class RenderApiProvider implements IRenderProvider {
  private apiKey: string | null = null;
  private baseUrl = 'https://api.render.com/v1';

  constructor(apiKey?: string) {
    this.apiKey = apiKey || process.env.RENDER_API_KEY || null;
  }

  public isConfigured(): boolean {
    return !!this.apiKey && this.apiKey.trim().length > 0;
  }

  private getHeaders(): Record<string, string> {
    if (!this.apiKey) {
      throw new Error('RENDER_API_KEY is not configured in process environment.');
    }
    return {
      Authorization: `Bearer ${this.apiKey.trim()}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    };
  }

  /**
   * Retrieves the owner ID associated with the API key.
   */
  public async getOwnerId(): Promise<string> {
    if (!this.isConfigured()) {
      throw new Error('Render API Key missing.');
    }

    const res = await fetch(`${this.baseUrl}/owners?limit=10`, {
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to fetch Render owner details (HTTP ${res.status}): ${errText}`);
    }

    const ownersData = (await res.json()) as Array<{ owner: { id: string; name: string } }>;
    if (ownersData.length === 0) {
      throw new Error('No owner accounts found for this Render API Key.');
    }
    return ownersData[0].owner.id;
  }

  /**
   * Creates or retrieves a static site service on Render.
   */
  public async createOrGetService(options: RenderServiceOptions): Promise<{ serviceId: string; liveUrl?: string }> {
    if (!this.isConfigured()) {
      throw new Error('Render API Key missing.');
    }

    try {
      // 1. List services to check if service already exists
      const listRes = await fetch(`${this.baseUrl}/services?limit=50`, {
        headers: this.getHeaders(),
      });

      if (!listRes.ok) {
        const errText = await listRes.text();
        throw new Error(`Failed to list Render services (HTTP ${listRes.status}): ${errText}`);
      }

      const servicesData = (await listRes.json()) as Array<{ service: { id: string; name: string; url?: string } }>;
      const existing = servicesData.find((s) => s.service.name === options.name);

      if (existing) {
        return {
          serviceId: existing.service.id,
          liveUrl: existing.service.url || (existing.service as any).serviceDetails?.url,
        };
      }

      // 2. Fetch ownerId
      const ownerId = await this.getOwnerId();

      // 3. Create static site service if not existing
      const createBody: any = {
        type: 'static_site',
        name: options.name,
        ownerId,
        serviceDetails: {
          buildCommand: options.buildCommand || 'npm run build',
          publishPath: options.publishPath || 'dist',
        },
      };

      if (options.repoUrl) {
        createBody.repo = options.repoUrl;
        if (options.branch) createBody.branch = options.branch;
      }

      const createRes = await fetch(`${this.baseUrl}/services`, {
        method: 'POST',
        headers: this.getHeaders(),
        body: JSON.stringify(createBody),
      });

      if (!createRes.ok) {
        const createErr = await createRes.text();
        throw new Error(`Failed to create Render service (HTTP ${createRes.status}): ${createErr}`);
      }

      const resData = (await createRes.json()) as any;
      const srvObj = resData.service || resData;
      const serviceId = srvObj.id;
      const liveUrl = srvObj.serviceDetails?.url || srvObj.url;

      if (!serviceId) {
        throw new Error(`Render API response did not contain a valid service ID: ${JSON.stringify(resData)}`);
      }

      return {
        serviceId,
        liveUrl,
      };
    } catch (err: any) {
      throw new Error(`Render API Provider Error: ${err.message}`);
    }
  }

  /**
   * Triggers a new deployment on a Render service.
   */
  public async triggerDeploy(serviceId: string): Promise<{ deployId: string }> {
    if (!this.isConfigured()) {
      throw new Error('Render API Key missing.');
    }

    const deployRes = await fetch(`${this.baseUrl}/services/${serviceId}/deploys`, {
      method: 'POST',
      headers: this.getHeaders(),
      body: JSON.stringify({
        clearCache: 'do_not_clear',
      }),
    });

    if (!deployRes.ok) {
      const errText = await deployRes.text();
      throw new Error(`Failed to trigger Render deploy (HTTP ${deployRes.status}): ${errText}`);
    }

    const deployData = (await deployRes.json()) as any;
    const dObj = deployData.deploy || deployData;
    const deployId = dObj.id;
    if (!deployId) {
      throw new Error(`Render API response did not contain a valid deploy ID: ${JSON.stringify(deployData)}`);
    }
    return { deployId };
  }

  /**
   * Gets current deployment status from Render.
   */
  public async getDeployStatus(serviceId: string, deployId: string): Promise<{ status: string; liveUrl?: string }> {
    if (!this.isConfigured()) {
      throw new Error('Render API Key missing.');
    }

    const res = await fetch(`${this.baseUrl}/services/${serviceId}/deploys/${deployId}`, {
      headers: this.getHeaders(),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`Failed to check Render deploy status (HTTP ${res.status}): ${errText}`);
    }

    const data = (await res.json()) as any;
    const dObj = data.deploy || data;
    return {
      status: dObj.status,
      liveUrl: dObj.url || dObj.serviceDetails?.url,
    };
  }
}
