export type AmenityCategory =
  | 'supermarkets'
  | 'pubsBars'
  | 'restaurantsCafes'
  | 'parksGreenSpaces'
  | 'gymsLeisure'
  | 'healthcare'
  | 'librariesCulture'
  | 'trainStation'
  | 'busStop';

export interface Poi {
  id: number;
  lat: number;
  lng: number;
  name: string;
  type: string;
  category: AmenityCategory;
}

export const AMENITY_CATEGORIES: AmenityCategory[] = [
  'supermarkets',
  'pubsBars',
  'restaurantsCafes',
  'parksGreenSpaces',
  'gymsLeisure',
  'healthcare',
  'librariesCulture',
  'trainStation',
  'busStop',
];

export const CATEGORY_CONFIG: Record<AmenityCategory, { color: string; icon: string; label: string }> = {
  supermarkets: { color: '#22c55e', icon: '🛒', label: 'Supermarkets' },
  pubsBars: { color: '#f59e0b', icon: '🍺', label: 'Pubs & Bars' },
  restaurantsCafes: { color: '#ef4444', icon: '🍽️', label: 'Restaurants & Cafes' },
  parksGreenSpaces: { color: '#10b981', icon: '🌳', label: 'Parks & Green Spaces' },
  gymsLeisure: { color: '#8b5cf6', icon: '🏋️', label: 'Gyms & Leisure' },
  healthcare: { color: '#ec4899', icon: '💊', label: 'Healthcare' },
  librariesCulture: { color: '#6366f1', icon: '📚', label: 'Culture' },
  trainStation: { color: '#3b82f6', icon: '🚂', label: 'Train Stations' },
  busStop: { color: '#64748b', icon: '🚌', label: 'Bus Stops' },
};
