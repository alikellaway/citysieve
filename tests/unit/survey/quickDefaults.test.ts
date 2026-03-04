import { describe, it, expect } from 'vitest';
import { buildQuickSurveyState } from '@/lib/survey/quickDefaults';
import type { QuickSurveyAnswers } from '@/lib/survey/quickDefaults';

describe('quickDefaults logic', () => {
  const baseAnswers: QuickSurveyAnswers = {
    workLocation: null,
    isRemote: false,
    commuteModes: ['drive'],
    maxCommuteTime: 45,
    areaTypes: ['city_centre'],
    topPriorities: [],
    remoteRegion: null,
  };

  it('sets selected priorities to Likert 5 and unselected to Likert 2', () => {
    const state = buildQuickSurveyState({
      ...baseAnswers,
      topPriorities: ['supermarkets', 'publicTransportReliance'],
    });

    // Selected
    expect(state.lifestyle.supermarkets).toBe(5);
    expect(state.transport.publicTransportReliance).toBe(5);

    // Unselected
    expect(state.lifestyle.highStreet).toBe(2);
    expect(state.environment.peaceAndQuiet).toBe(2);

    // Other non-priority defaults
    expect(state.transport.broadbandImportance).toBe(3); // NEUTRAL default
  });

  it('sets all to Likert 3 if topPriorities is empty', () => {
    const state = buildQuickSurveyState(baseAnswers);
    expect(state.lifestyle.supermarkets).toBe(3);
    expect(state.lifestyle.highStreet).toBe(3);
    expect(state.environment.peaceAndQuiet).toBe(3);
  });

  it('handles remote workers correctly', () => {
    const state = buildQuickSurveyState({
      ...baseAnswers,
      isRemote: true,
      remoteRegion: 'london',
    });

    expect(state.commute.daysPerWeek).toBe(0);
    expect(state.commute.remoteRegion).toBe('london');
  });

  it('handles non-remote workers correctly', () => {
    const state = buildQuickSurveyState({
      ...baseAnswers,
      isRemote: false,
      remoteRegion: 'london',
    });

    expect(state.commute.daysPerWeek).toBe(5);
    expect(state.commute.remoteRegion).toBeNull();
  });

  it('sets surveyMode to quick', () => {
    const state = buildQuickSurveyState(baseAnswers);
    expect(state.surveyMode).toBe('quick');
  });
});
