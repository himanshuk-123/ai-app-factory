export interface ComponentInteraction {
  componentName: string;
  trigger: string;
  action: string;
  feedback: string;
}

export interface ScreenUXSpec {
  screenId: string;
  screenName: string;
  purpose: string;
  userGoal: string;
  entryPoints: string[];
  exitActions: string[];
  layoutStructure: string;
  uiComponents: string[];
  componentInteractions: ComponentInteraction[];
  requiredData: string[];
  loadingState: string;
  emptyState: string;
  errorState: string;
  successState: string;
  mobileConsiderations: string;
}

export interface NavigationFlow {
  flowName: string;
  trigger: string;
  sequence: string[];
}

export interface SharedComponentSpec {
  name: string;
  description: string;
  usedInScreens: string[];
}

export interface DesignRequirementsForStitch {
  colorSemantics: string[];
  typographyGuidelines: string;
  spacingAndGrid: string;
  componentVariantsNeeded: string[];
  motionAndMicroInteractions: string[];
}

export interface UXSpecResult {
  projectId: string;
  idea: string;
  appName: string;
  screens: ScreenUXSpec[];
  navigationFlows: NavigationFlow[];
  globalRules: string[];
  sharedComponents: SharedComponentSpec[];
  designRequirementsForStitch: DesignRequirementsForStitch;
  generatedAt: string;
}
