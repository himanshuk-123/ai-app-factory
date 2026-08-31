export interface MobileGeneratorResult {
  projectId: string;
  appName: string;
  mobileProjectPath: string;
  screenCount: number;
  generatedScreens: string[];
  dependencyInstallSuccess: boolean;
  typeCheckSuccess: boolean;
  validationSuccess: boolean;
  validationError?: string;
  generatedAt: string;
}
