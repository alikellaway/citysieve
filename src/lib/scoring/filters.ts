import type { SurveyState } from '@/lib/survey/types';
import type { AreaProfile } from './engine';

export function applyHardFilters(
  areas: AreaProfile[],
  state: SurveyState
): AreaProfile[] {
  return areas.filter((area) => {
    // Filter 1: Commute time exceeds max tolerance (only when user set a hard cap)
    if (
      state.commute.commuteTimeIsHardCap &&
      area.commuteEstimate !== undefined &&
      area.commuteEstimate > state.commute.maxCommuteTime
    ) {
      return false;
    }

    // Filter 2: Environment type mismatch (allow adjacent types, OR across selections)
    if (state.environment.areaTypes.length > 0 && area.environment.type) {
      const typeOrder = ['city_centre', 'inner_suburb', 'outer_suburb', 'town', 'rural'] as const;
      const areaIdx = typeOrder.indexOf(area.environment.type);
      
      const passes = state.environment.areaTypes.some((selectedType) => {
        const userIdx = typeOrder.indexOf(selectedType);
        return Math.abs(userIdx - areaIdx) <= 1;
      });
      
      if (!passes) return false;
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
