export interface AlgorithmWeights {
  w_hist: number;
  w_social: number;
  w_pop: number;
  w_time: number;
  w_geo: number;
  w_novel: number;
  w_pen: number;
}

export interface EventData {
  id: string;
  category: string;
  scheduled_time: Date | null;
  latitude: number | null;
  longitude: number | null;
  max_attendees: number;
  current_attendees: number;
  distance_km?: number | null;
  host_id?: string;
}

export interface ScoredEvent extends EventData {
  algorithm_score: number;
}

export interface AlgorithmContext {
  userId: string;
  userLat?: number | null;
  userLng?: number | null;
  weights: AlgorithmWeights;
}

