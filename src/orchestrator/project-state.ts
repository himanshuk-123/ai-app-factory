import fs from 'node:fs/promises';
import path from 'node:path';
import type { ProjectMetadata, ProjectStatus, WorkflowStage } from './types.js';

export class ProjectStateManager {
  private projectFolderPath: string;
  private stateFilePath: string;
  private state: ProjectMetadata | null = null;

  constructor(projectFolderPath: string) {
    this.projectFolderPath = projectFolderPath;
    this.stateFilePath = path.join(projectFolderPath, 'project.json');
  }

  /**
   * Initializes a new project.json file with given metadata.
   */
  async createInitialState(metadata: ProjectMetadata): Promise<ProjectMetadata> {
    await fs.mkdir(this.projectFolderPath, { recursive: true });
    const now = new Date().toISOString();
    this.state = {
      ...metadata,
      createdAt: metadata.createdAt || now,
      updatedAt: now,
    };
    await this.saveState();
    return this.state;
  }

  /**
   * Reads and loads project.json into memory.
   */
  async loadState(): Promise<ProjectMetadata> {
    try {
      const content = await fs.readFile(this.stateFilePath, 'utf-8');
      this.state = JSON.parse(content) as ProjectMetadata;
      return this.state;
    } catch (error) {
      throw new Error(`Failed to load project state from ${this.stateFilePath}: ${(error as Error).message}`);
    }
  }

  /**
   * Returns current in-memory state.
   */
  getState(): ProjectMetadata {
    if (!this.state) {
      throw new Error('Project state not loaded. Call loadState() or createInitialState() first.');
    }
    return this.state;
  }

  /**
   * Updates project status.
   */
  async updateStatus(status: ProjectStatus): Promise<ProjectMetadata> {
    return this.updateState({ status });
  }

  /**
   * Updates workflow stage.
   */
  async updateStage(stage: WorkflowStage): Promise<ProjectMetadata> {
    return this.updateState({ stage });
  }

  /**
   * Updates partial metadata, updates timestamp, and persists changes.
   */
  async updateState(updates: Partial<ProjectMetadata>): Promise<ProjectMetadata> {
    const currentState = this.getState();
    this.state = {
      ...currentState,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    await this.saveState();
    return this.state;
  }

  /**
   * Persists current state to project.json safely on Windows.
   */
  private async saveState(): Promise<void> {
    if (!this.state) return;
    const jsonContent = JSON.stringify(this.state, null, 2);

    for (let attempt = 1; attempt <= 5; attempt++) {
      try {
        await fs.writeFile(this.stateFilePath, jsonContent, 'utf-8');
        return;
      } catch (err: any) {
        if (err.code === 'EPERM' || err.code === 'EBUSY') {
          await new Promise((resolve) => setTimeout(resolve, attempt * 100));
        } else {
          throw err;
        }
      }
    }
  }
}
