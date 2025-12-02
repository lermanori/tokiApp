import { pool } from '../../config/database';
import { DbToki, SpecToki } from '../types';
import { transformTokiToSpecFormat, transformSpecToTokiFormat } from '../adapters/toki-adapter';
import { validateAdminKey } from '../auth';
import type { RegisteredTool } from './user-tools';

export const adminTools: RegisteredTool[] = [
  {
    name: 'create_toki',
    description: 'Create a new Toki post (admin only).',
    inputSchema: {
      type: 'object',
      properties: {
        api_key: {
          type: 'string',
          description: 'Admin MCP API key',
        },
        author_id: {
          type: 'string',
          description: 'Optional: ID of the user who will be the host of the Toki. If not provided, uses the user_id from the API key.',
        },
        content: {
          type: 'string',
          description: 'Main text content for the Toki (used for title/description)',
        },
        category: {
          type: 'string',
          description: 'Category for the Toki (required)',
        },
        location: {
          type: 'string',
          description: 'Location string for the Toki (required)',
        },
        timeSlot: {
          type: 'string',
          description: 'Time slot for when the Toki happens (required). Options: now, 30min, 1hour, 2hours, 3hours, tonight, tomorrow',
        },
        status: {
          type: 'string',
          description: 'Optional status (e.g. active, draft, cancelled)',
        },
        scheduledTime: {
          type: 'string',
          description: 'Optional scheduled time (ISO 8601 format)',
        },
        maxAttendees: {
          type: 'number',
          description: 'Optional maximum attendees (1-1000, or null for unlimited)',
        },
        latitude: {
          type: 'number',
          description: 'Optional latitude coordinate',
        },
        longitude: {
          type: 'number',
          description: 'Optional longitude coordinate',
        },
        visibility: {
          type: 'string',
          description: 'Visibility level (maps to tokis.visibility)',
        },
        external_url: {
          type: 'string',
          description: 'Optional external link associated with the Toki',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of tags to associate with the Toki',
        },
      },
      required: ['api_key', 'content', 'category', 'location', 'timeSlot'],
    },
    handler: async (args: {
      api_key: string;
      author_id?: string;
      content: string;
      category: string;
      location: string;
      timeSlot: string;
      status?: string;
      visibility?: string;
      scheduledTime?: string;
      maxAttendees?: number | null;
      latitude?: number;
      longitude?: number;
      external_url?: string;
      tags?: string[];
    }) => {
      const {
        api_key,
        author_id,
        content,
        category,
        location,
        timeSlot,
        status,
        visibility,
        scheduledTime,
        maxAttendees,
        latitude,
        longitude,
        external_url,
        tags,
      } = args;

      const valid = await validateAdminKey(api_key);
      if (!valid) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Invalid or missing MCP admin API key' }, null, 2),
            },
          ],
          isError: true,
        };
      }

      // Use author_id from args if provided, otherwise use user_id from API key
      const finalAuthorId = author_id || valid.user_id;

      // Default visibility to 'private' unless explicitly specified
      // Ensure it's one of the valid values
      const finalVisibility: 'public' | 'private' = 
        (visibility === 'public' || visibility === 'private') ? visibility : 'private';

      // Derive DB payload from Spec-like input
      const baseSpec: SpecToki = {
        id: '',
        author_id: finalAuthorId,
        content,
        media_urls: [],
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        visibility: finalVisibility,
        tags: [],
        like_count: 0,
        comment_count: 0,
        repost_count: 0,
        external_url: external_url ?? null,
        metadata: {},
      };

      const dbPayload = transformSpecToTokiFormat(baseSpec);

      const client = await pool.connect();
      try {
        await client.query('BEGIN');

        // Insert base Toki row (matches REST API requirements)
        const insertResult = await client.query(
          `INSERT INTO tokis (host_id, title, description, category, status, location, visibility, external_link, time_slot, scheduled_time, max_attendees, latitude, longitude)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
           RETURNING *`,
          [
            dbPayload.host_id,
            dbPayload.title,
            dbPayload.description,
            category, // Required
            status || 'active',
            location, // Required
            dbPayload.visibility,
            dbPayload.external_link || null,
            timeSlot, // Required
            scheduledTime ? new Date(scheduledTime).toISOString() : null,
            maxAttendees === null || maxAttendees === undefined ? null : (maxAttendees || 10),
            latitude || null,
            longitude || null,
          ]
        );

        const row = insertResult.rows[0] as DbToki;

        // Insert tags if provided
        if (tags && tags.length > 0) {
          for (const tag of tags) {
            await client.query(
              'INSERT INTO toki_tags (toki_id, tag_name) VALUES ($1, $2)',
              [row.id, tag]
            );
          }
        }

        await client.query('COMMIT');

        const fullRowResult = await pool.query('SELECT * FROM tokis WHERE id = $1', [row.id]);
        const fullRow = fullRowResult.rows[0] as DbToki;
        const specToki = await transformTokiToSpecFormat(fullRow);

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ toki: specToki }, null, 2),
            },
          ],
        };
      } catch (error: any) {
        await client.query('ROLLBACK');
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                { error: 'Failed to create Toki', detail: String(error?.message || error) },
                null,
                2
              ),
            },
          ],
          isError: true,
        };
      } finally {
        client.release();
      }
    },
  },
  {
    name: 'update_toki',
    description: 'Update an existing Toki (admin only).',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the Toki to update',
        },
        api_key: {
          type: 'string',
          description: 'Admin MCP API key',
        },
        content: {
          type: 'string',
          description: 'New content (if provided) used for title/description',
        },
        author_id: {
          type: 'string',
          description: 'New host/author id, if changing ownership',
        },
        category: {
          type: 'string',
        },
        status: {
          type: 'string',
        },
        location: {
          type: 'string',
        },
        visibility: {
          type: 'string',
        },
        external_url: {
          type: 'string',
        },
      },
      required: ['id', 'api_key'],
    },
    handler: async (args: {
      id: string;
      api_key: string;
      content?: string;
      author_id?: string;
      category?: string;
      status?: string;
      location?: string;
      visibility?: string;
      external_url?: string;
    }) => {
      const {
        api_key,
        id,
        content,
        author_id,
        category,
        status,
        location,
        visibility,
        external_url,
      } = args;

      const valid = await validateAdminKey(api_key);
      if (!valid) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Invalid or missing MCP admin API key' }, null, 2),
            },
          ],
          isError: true,
        };
      }

      let title: string | null = null;
      let description: string | null = null;

      if (content !== undefined) {
        title = content.length > 255 ? content.slice(0, 252) + '...' : content;
        description = content;
      }

      const result = await pool.query(
        `UPDATE tokis SET
          title = COALESCE($1, title),
          description = COALESCE($2, description),
          category = COALESCE($3, category),
          status = COALESCE($4, status),
          location = COALESCE($5, location),
          host_id = COALESCE($6, host_id),
          visibility = COALESCE($7, visibility),
          external_link = COALESCE($8, external_link),
          updated_at = NOW()
         WHERE id = $9
         RETURNING *`,
        [
          title,
          description,
          category || null,
          status || null,
          location || null,
          author_id || null,
          visibility || null,
          external_url || null,
          id,
        ]
      );

      if (result.rows.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Toki not found', id }, null, 2),
            },
          ],
          isError: true,
        };
      }

      const row = result.rows[0] as DbToki;
      const specToki = await transformTokiToSpecFormat(row);

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
    name: 'delete_toki',
    description: 'Delete a Toki (admin only).',
    inputSchema: {
      type: 'object',
      properties: {
        id: {
          type: 'string',
          description: 'ID of the Toki to delete',
        },
        api_key: {
          type: 'string',
          description: 'Admin MCP API key',
        },
        reason: {
          type: 'string',
          description: 'Optional reason for deletion (for logs or client display)',
        },
      },
      required: ['id', 'api_key'],
    },
    handler: async (args: { id: string; api_key: string; reason?: string }) => {
      const { id, api_key, reason } = args;

      const valid = await validateAdminKey(api_key);
      if (!valid) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Invalid or missing MCP admin API key' }, null, 2),
            },
          ],
          isError: true,
        };
      }

      const result = await pool.query('DELETE FROM tokis WHERE id = $1 RETURNING id', [id]);

      if (result.rows.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: 'Toki not found', id }, null, 2),
            },
          ],
          isError: true,
        };
      }

      const payload = {
        id,
        deleted: true,
        reason: reason ?? null,
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


