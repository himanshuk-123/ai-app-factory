export interface UserPersona {
  name: string;
  role: string;
  painPoints: string[];
  goals: string[];
}

export interface UserJourney {
  flowName: string;
  description: string;
  steps: string[];
}

export interface ScreenSpec {
  id: string;
  name: string;
  purpose: string;
  keyComponents: string[];
}

export interface NavigationRoute {
  name: string;
  screenId: string;
  description: string;
}

export interface NavigationStructure {
  type: string;
  mainTabs: string[];
  routes: NavigationRoute[];
}

export interface TechStackRecommendation {
  frontend: string;
  backend: string;
  database: string;
  auth: string;
  hosting: string;
}

export interface MVPFeature {
  name: string;
  description: string;
  priority: 'HIGH' | 'MEDIUM' | 'LOW';
}

export interface FutureFeature {
  name: string;
  description: string;
  phase: string;
}

export interface ProductSpecResult {
  projectId: string;
  idea: string;
  appName: string;
  tagline: string;
  targetAudience: string;
  mvpFeatures: MVPFeature[];
  futureFeatures: FutureFeature[];
  userPersonas: UserPersona[];
  userJourneys: UserJourney[];
  screens: ScreenSpec[];
  navigationStructure: NavigationStructure;
  techStack: TechStackRecommendation;
  monetizationModel: string;
  generatedAt: string;
}
