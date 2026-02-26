import type { SurveyState } from '@/lib/survey/types';
import type { AreaProfile } from './engine';

export type FilterReason = 'commute' | 'areaType' | 'excludedArea';

export interface RejectedArea {
  area: AreaProfile;
  reasons: FilterReason[];
}

export interface FilterResult {
  passed: AreaProfile[];
  rejected: RejectedArea[];
}

export function applyHardFiltersWithReasons(
  areas: AreaProfile[],
  state: SurveyState
): FilterResult {
  const passed: AreaProfile[] = [];
  const rejected: RejectedArea[] = [];

  for (const area of areas) {
    const reasons: FilterReason[] = [];

    if (
      state.commute.commuteTimeIsHardCap &&
      area.commuteEstimate !== undefined &&
      area.commuteEstimate > state.commute.maxCommuteTime
    ) {
      reasons.push('commute');
    }

    if (state.environment.areaTypes.length > 0 && area.environment.type) {
      const typeOrder = ['city_centre', 'inner_suburb', 'outer_suburb', 'town', 'rural'] as const;
      const areaIdx = typeOrder.indexOf(area.environment.type);

      const passes = state.environment.areaTypes.some((selectedType) => {
        const userIdx = typeOrder.indexOf(selectedType);
        return Math.abs(userIdx - areaIdx) <= 1;
      });

      if (!passes) reasons.push('areaType');
    }

    if (state.environment.excludeAreas.length > 0) {
      const lowerName = area.name.toLowerCase();
      if (
        state.environment.excludeAreas.some((ex) =>
          lowerName.includes(ex.toLowerCase())
        )
      ) {
        reasons.push('excludedArea');
      }
    }

    if (reasons.length > 0) {
      rejected.push({ area, reasons });
    } else {
      passed.push(area);
    }
  }

  return { passed, rejected };
}

export function applyHardFilters(
  areas: AreaProfile[],
  state: SurveyState
): AreaProfile[] {
  return applyHardFiltersWithReasons(areas, state).passed;
}
