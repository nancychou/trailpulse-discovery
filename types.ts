
export interface Review {
  user: string;
  avatar: string;
  rating: number;
  date: string;
  text: string;
}

export interface Hazard {
  type: string;
  message: string;
  date: string;
}

/** Lightweight trail for list/card views — no hazards/reviews. */
export interface TrailListItem {
  id: string;
  name: string;
  difficulty: number | null;
  calculatedDifficulty: string | null;
  rating: number | null;
  numVotes: number | null;
  distance: number | null;
  elevation: number | null;
  highestPoint: number | null;
  trailheadLat: number | null;
  trailheadLng: number | null;
  surface: string | null;
  routeType: string | null;
  waterSource: string | null;
  imageUrl: string | null;
  difficultyScore010: number | null;
}

/** Full trail with all fields + hazards/reviews (for detail drawer). */
export interface Trail {
  id: string;
  name: string;

  // Ranking & difficulty
  rank: number | null;
  difficulty: number | null;
  calculatedDifficulty: string | null; // WTA label: "Easy", "Moderate", "Hard", etc.
  rating: number | null;              // Average star rating (0-5)
  numVotes: number | null;

  // Core stats
  distance: number | null;    // miles (raw from WTA)
  elevation: number | null;   // feet gain
  highestPoint: number | null; // feet

  // GPS coordinates
  trailheadLat: number | null;
  trailheadLng: number | null;

  // Categorizations
  surface: string | null;
  routeType: string | null;
  waterSource: string | null;

  // Assets
  imageUrl: string | null;

  // Logistics
  parkingTags: string[];
  parkingStatus: string | null;
  restrooms: string | null;
  cellCoverage: string | null;
  crowdLevel: number | null;

  // Source
  sourceUrl: string | null;

  // OSM enrichment
  osmId: number | null;
  osmName: string | null;
  matchConfidence: number | null;

  // Scoring/analysis fields
  maxGradeP95: number | null;
  surfacePrimary: string | null;
  surfaceBreakdown: string | null;
  distanceMi: number | null;
  gradeP95: number | null;
  surfacePenalty: number | null;
  logDistance: number | null;
  wtaDiffLevel: number | null;
  difficultyScore010: number | null;

  // Relational data (from separate tables)
  hazards?: Hazard[];
  reviews?: Review[];
}

export interface Race {
  id: string;
  name: string;
  location: string;
  country: string;
  date: string;
  type: string;
  distance: string;
  distanceKm: number;
  elevation: string;
  rating: number;
  difficultyRank: number;
  reviewCount: string;
  imageUrl: string;
  qualifiers: string[];
}

export interface UserProfile {
  id: string;
  email: string;
  displayName: string;
  gender: string;
  avatarUrl: string;
  bio: string;
  savedRaceIds: string[];
  groupRunIds: string[];
  createdAt: string;
}

export type SortOption = 'Rating' | 'Distance' | 'Elevation' | 'Difficulty';

export interface FilterState {
  difficultyRange: [number, number];
  distanceRange: [number, number];
  elevationRange: [number, number];
  waterAvailability: string[];
  surfaces: string[];
  routeTypes: string[];
  parkingTags: string[];
}

export interface RaceFilterState {
  location: string;
  distanceRange: [number | null, number | null];
  qualifiers: string[];
  difficulty: number | null;
  showSavedOnly: boolean;
}

export interface MapBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}
