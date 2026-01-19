import { pool } from '../../config/database';
import { DbToki } from '../types';
import { transformTokiToSpecFormat } from '../adapters/toki-adapter';
import { MCPUserContext } from '../auth-mcp';

export interface RegisteredTool {
  name: string;
  description?: string;
  inputSchema: {
    type: 'object';
    properties?: {
      [key: string]: object;
    };
    required?: string[];
  };
  handler: (args: any) => Promise<{
    content: {
      type: 'text';
      text: string;
      _meta?: Record<string, unknown>;
    }[];
    structuredContent?: Record<string, unknown>;
    isError?: boolean;
  }>;
}

export const userTools: RegisteredTool[] = [
  {
    name: 'get_toki_by_id',
    description: 'Fetch a single Toki post by its unique ID. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'The unique ID of the Toki to retrieve',
        },
        expand: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of related resources to expand (e.g., "author", "stats")',
        },
      },
      required: ['id'],
    },
    handler: async (args: { id: string; expand?: string[]; userContext: MCPUserContext }) => {
      const { id, expand } = args;
      // userContext is available but not needed for read operations

      const result = await pool.query('SELECT * FROM tokis WHERE id = $1', [id]);

      if (result.rows.length === 0) {
        throw new Error(`Toki with id ${id} not found`);
      }

      const dbRow = result.rows[0] as DbToki;
      const specToki = await transformTokiToSpecFormat(dbRow, expand);

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({ toki: specToki }, null, 2),
          },
        ],
      };
    },
  },
  {
    name: 'list_tokis',
    description: 'Fetch a simple list/feed of Tokis. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        limit: {
          type: 'number',
          description: 'Max number of Tokis to return',
        },
        cursor: {
          type: 'string',
          description: 'Opaque cursor from previous response next_cursor',
        },
      },
    },
    handler: async (args: { limit?: number; cursor?: string; userContext: MCPUserContext }) => {
      const rawLimit = args.limit ?? 20;
      const limit = Math.max(1, Math.min(rawLimit, 100));

      const params: any[] = [];
      let whereClause = '';
      let paramIndex = 1;

      if (args.cursor) {
        try {
          const parsed = JSON.parse(args.cursor) as { created_at: string; id: string };
          whereClause = `
            WHERE (created_at < $${paramIndex}
              OR (created_at = $${paramIndex} AND id < $${paramIndex + 1}))
          `;
          params.push(parsed.created_at, parsed.id);
          paramIndex += 2;
        } catch {
          // Invalid cursor: ignore and treat as first page
        }
      }

      const sql = `
        SELECT *
        FROM tokis
        ${whereClause}
        ORDER BY created_at DESC, id DESC
        LIMIT $${paramIndex}
      `;
      params.push(limit + 1);

      const result = await pool.query(sql, params);

      const rows = result.rows.slice(0, limit);
      const hasMore = result.rows.length > limit;

      const specTokis = await Promise.all(
        rows.map((row) => transformTokiToSpecFormat(row as DbToki))
      );

      let nextCursor: string | null = null;
      if (hasMore && rows.length > 0) {
        const last = rows[rows.length - 1];
        nextCursor = JSON.stringify({
          created_at: last.created_at,
          id: last.id,
        });
      }

      const payload = {
        items: specTokis,
        next_cursor: nextCursor,
        has_more: hasMore,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    },
  },
  {
    name: 'search_tokis',
    description: 'Search Tokis by text query in title or description. Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        search_query: {
          type: 'string',
          description: 'Text to search for in Toki title or description',
        },
        limit: {
          type: 'number',
          description: 'Max number of Tokis to return',
        },
      },
      required: ['search_query'],
    },
    handler: async (args: { search_query: string; limit?: number; userContext: MCPUserContext }) => {
      const { search_query } = args;
      const rawLimit = args.limit ?? 20;
      const limit = Math.max(1, Math.min(rawLimit, 100));

      const like = `%${search_query}%`;

      const result = await pool.query(
        `
          SELECT *
          FROM tokis
          WHERE status = 'active'
            AND (title ILIKE $1 OR description ILIKE $1)
          ORDER BY created_at DESC
          LIMIT $2
        `,
        [like, limit]
      );

      const specTokis = await Promise.all(
        result.rows.map((row) => transformTokiToSpecFormat(row as DbToki))
      );

      const payload = {
        items: specTokis,
        next_cursor: null as string | null,
        has_more: false,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    },
  },
  {
    name: 'list_tokis_by_author',
    description: 'List Tokis created by a specific author (host). Read-only.',
    inputSchema: {
      type: 'object',
      properties: {
        author_id: {
          type: 'string',
          description: 'ID of the user who created the Tokis (host_id)',
        },
        limit: {
          type: 'number',
          description: 'Max number of Tokis to return',
        },
      },
      required: ['author_id'],
    },
    handler: async (args: { author_id: string; limit?: number; userContext: MCPUserContext }) => {
      const { author_id } = args;
      const rawLimit = args.limit ?? 20;
      const limit = Math.max(1, Math.min(rawLimit, 100));

      const result = await pool.query(
        `
          SELECT *
          FROM tokis
          WHERE host_id = $1
            AND status = 'active'
          ORDER BY created_at DESC
          LIMIT $2
        `,
        [author_id, limit]
      );

      const specTokis = await Promise.all(
        result.rows.map((row) => transformTokiToSpecFormat(row as DbToki))
      );

      const payload = {
        items: specTokis,
        next_cursor: null as string | null,
        has_more: false,
      };

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(payload, null, 2),
          },
        ],
      };
    },
  },
];


