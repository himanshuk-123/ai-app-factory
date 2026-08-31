export interface WebGeneratorResult {
  projectId: string;
  appName: string;
  webProjectPath: string;
  screenCount: number;
  generatedScreens: string[];
  buildSuccess: boolean;
  buildError?: string;
  generatedAt: string;
}
