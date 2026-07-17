export interface Station {
  id: string;
  name: string;
  code: string;
  city: string;
}

export type TrainType = 'Bullet' | 'Express' | 'Passenger';

export interface Train {
  id: string;
  name: string;
  number: string;
  type: TrainType;
  speedKmh: number;
}

export interface Stop {
  station: Station;
  arrivalTime: string;   // format "HH:MM" or "Pass"
  departureTime: string; // format "HH:MM" or "Pass"
  waitTimeMins: number;  // 0 if source/destination or short halt
  distanceOffsetKm: number; // distance from route start
  platform?: string;     // mock platform info, e.g. "Platform 3"
}

export interface RouteLeg {
  train: Train;
  fromStation: Station;
  toStation: Station;
  departureTime: string;
  arrivalTime: string;
  distanceKm: number;
}

export interface Route {
  id: string;
  train: Train;
  source: Station;
  destination: Station;
  stops: Stop[]; // First stop is source, last is destination
  legs: RouteLeg[];
  totalDurationMins: number;
  totalDistanceKm: number;
  basePrice: number;
  departureTime: string; // e.g. "08:30"
  arrivalTime: string;   // e.g. "14:15"
}

export interface SearchQuery {
  sourceId: string;
  destinationId: string;
  travelDate: string;
}

export type SortOption = 'fastest' | 'shortest' | 'cheapest';

export interface RouteFilters {
  sort: SortOption;
  trainTypes: TrainType[];
}
