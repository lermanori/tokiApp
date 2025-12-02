/**
 * Database representation of a Toki (matches the tokis table schema)
 */
export interface DbToki {
  id: string;
  host_id: string;
  title: string;
  description: string | null;
  category: string | null;
  status: string | null;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  image_url: string | null;
  image_urls: string[] | null;
  external_link: string | null;
  visibility: 'public' | 'private' | null;
  created_at: Date | string;
  updated_at: Date | string;
  scheduled_time: Date | string | null;
  max_attendees: number | null;
  time_slot: string | null;
}

/**
 * MCP specification format for a Toki (standardized API format)
 */
export interface SpecToki {
  id: string;
  author_id: string;
  content: string;
  media_urls: string[];
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  visibility: 'public' | 'private';
  tags: string[];
  like_count: number;
  comment_count: number;
  repost_count: number;
  external_url: string | null;
  metadata: Record<string, unknown>;
}

