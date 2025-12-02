// Use default export from database config (pool)
import pool from '../../config/database';
import { DbToki, SpecToki } from '../types';

function toIsoString(value: Date | string): string {
  if (value instanceof Date) {
    return value.toISOString();
  }
  // Assume already a valid timestamp string; best-effort conversion
  const date = new Date(value);
  return isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
}

export async function transformTokiToSpecFormat(
  dbToki: DbToki,
  expand?: string[]
): Promise<SpecToki> {
  const tagsResult = await pool.query(
    'SELECT tag_name FROM toki_tags WHERE toki_id = $1',
    [dbToki.id]
  );

  const tags = tagsResult.rows.map((row: { tag_name: string }) => row.tag_name);

  const mediaUrls: string[] = Array.isArray(dbToki.image_urls)
    ? dbToki.image_urls.filter(Boolean) as string[]
    : dbToki.image_url
      ? [dbToki.image_url]
      : [];

  const includeStats = expand?.includes('stats') ?? false;

  const spec: SpecToki = {
    id: dbToki.id,
    author_id: dbToki.host_id,
    content: dbToki.description ?? dbToki.title,
    media_urls: mediaUrls,
    created_at: toIsoString(dbToki.created_at),
    updated_at: toIsoString(dbToki.updated_at),
    visibility: dbToki.visibility ?? 'private',
    tags,
    like_count: includeStats ? 0 : 0,
    comment_count: includeStats ? 0 : 0,
    repost_count: includeStats ? 0 : 0,
    external_url: dbToki.external_link ?? null,
    metadata: {},
  };

  return spec;
}

export function transformSpecToTokiFormat(spec: SpecToki) {
  const title = spec.content.length > 255 ? spec.content.slice(0, 252) + '...' : spec.content;

  return {
    host_id: spec.author_id,
    title,
    description: spec.content,
    visibility: spec.visibility || 'private',
    image_url: spec.media_urls[0] ?? null,
    external_link: spec.external_url ?? null,
  };
}


