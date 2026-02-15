import type { SurveyState } from '@/lib/survey/types';
import type { AreaProfile } from './engine';

export function applyHardFilters(
  areas: AreaProfile[],
  state: SurveyState
): AreaProfile[] {
  return areas.filter((area) => {
    // Filter 1: Commute time exceeds max tolerance
    if (
      area.commuteEstimate !== undefined &&
      area.commuteEstimate > state.commute.maxCommuteTime
    ) {
      return false;
    }

    // Filter 2: Environment type mismatch (allow adjacent types)
    if (state.environment.areaType && area.environment.type !== state.environment.areaType) {
      const typeOrder = ['city_centre', 'inner_suburb', 'outer_suburb', 'town', 'rural'] as const;
      const userIdx = typeOrder.indexOf(state.environment.areaType);
      const areaIdx = typeOrder.indexOf(area.environment.type);
      if (Math.abs(userIdx - areaIdx) > 1) return false;
    }

    // Filter 3: Explicitly excluded areas
    if (state.environment.excludeAreas.length > 0) {
      const lowerName = area.name.toLowerCase();
      if (
        state.environment.excludeAreas.some((ex) =>
          lowerName.includes(ex.toLowerCase())
        )
      ) {
        return false;
      }
    }

    return true;
  });
}
