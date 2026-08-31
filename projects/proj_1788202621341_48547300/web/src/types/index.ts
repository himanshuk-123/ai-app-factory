export interface ScreenData {
  screenId: string;
  screenName: string;
  purpose: string;
  userGoal: string;
  layoutStructure: string;
  uiComponents: string[];
  loadingState: string;
  emptyState: string;
  errorState: string;
  successState: string;
}

export type ViewState = 'NORMAL' | 'LOADING' | 'EMPTY' | 'ERROR' | 'SUCCESS';
