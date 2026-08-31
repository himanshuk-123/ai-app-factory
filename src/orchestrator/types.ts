export type ProjectStatus = 'INITIALIZED' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
export type WorkflowStage = 'INIT' | string;

export interface ProjectMetadata {
  id: string;
  idea: string;
  status: ProjectStatus;
  stage: WorkflowStage;
  createdAt: string;
  updatedAt: string;
  [key: string]: any;
}
