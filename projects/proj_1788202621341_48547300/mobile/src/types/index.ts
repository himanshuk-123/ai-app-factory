export type ViewState = 'NORMAL' | 'LOADING' | 'EMPTY' | 'ERROR' | 'SUCCESS';

export interface ScreenSpec {
  screenId: string;
  screenName: string;
  purpose: string;
  userGoal: string;
  layoutStructure: string;
  uiComponents: string[];
}
