export interface StepInfo {
  id: string;
  name: string;
  path: string;
  number: number;
}

export const SURVEY_STEPS: StepInfo[] = [
  { id: 'profile', name: 'Profile', path: '/survey/profile', number: 1 },
  { id: 'commute', name: 'Commute', path: '/survey/commute', number: 2 },
  { id: 'family', name: 'Family & Social', path: '/survey/family', number: 3 },
  { id: 'lifestyle', name: 'Lifestyle', path: '/survey/lifestyle', number: 4 },
  { id: 'transport', name: 'Transport', path: '/survey/transport', number: 5 },
  { id: 'environment', name: 'Environment', path: '/survey/environment', number: 6 },
];

export const TOTAL_STEPS = SURVEY_STEPS.length;
