// Build a configured McpServer instance with all public and admin tools registered.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { userTools } from './tools/user-tools';
import { adminTools } from './tools/admin-tools';
import { CATEGORY_CONFIG } from '../config/categories';

// Extract category keys for enum from CATEGORY_CONFIG (single source of truth)
const CATEGORY_KEYS = Object.keys(CATEGORY_CONFIG) as [string, ...string[]];

export function createMCPServer() {
  const server = new McpServer({
    name: 'toki-mcp-server',
    version: '1.0.0',
  });

  // get_toki_by_id
  const getById = userTools.find((t) => t.name === 'get_toki_by_id');
  if (getById) {
    server.registerTool(
      getById.name,
      {
        description: getById.description,
        inputSchema: z.object({
          id: z.string(),
          expand: z.array(z.string()).optional(),
        }),
        annotations: {
          readOnlyHint: true,
        },
      },
      async ({ id, expand }: { id: string; expand?: string[] }) =>
        getById.handler({ id, expand })
    );
  }

  // list_tokis
  const listTokis = userTools.find((t) => t.name === 'list_tokis');
  if (listTokis) {
    server.registerTool(
      listTokis.name,
      {
        description: listTokis.description,
        inputSchema: z.object({
          limit: z.number().int().optional(),
          cursor: z.string().optional(),
        }),
        annotations: {
          readOnlyHint: true,
        },
      },
      async ({ limit, cursor }: { limit?: number; cursor?: string }) =>
        listTokis.handler({ limit, cursor })
    );
  }

  // search_tokis
  const searchTokis = userTools.find((t) => t.name === 'search_tokis');
  if (searchTokis) {
    server.registerTool(
      searchTokis.name,
      {
        description: searchTokis.description,
        inputSchema: z.object({
          search_query: z.string(),
          limit: z.number().int().optional(),
        }),
        annotations: {
          readOnlyHint: true,
        },
      },
      async ({ search_query, limit }: { search_query: string; limit?: number }) =>
        searchTokis.handler({ search_query, limit })
    );
  }

  // list_tokis_by_author
  const listByAuthor = userTools.find((t) => t.name === 'list_tokis_by_author');
  if (listByAuthor) {
    server.registerTool(
      listByAuthor.name,
      {
        description: listByAuthor.description,
        inputSchema: z.object({
          author_id: z.string(),
          limit: z.number().int().optional(),
        }),
        annotations: {
          readOnlyHint: true,
        },
      },
      async ({ author_id, limit }: { author_id: string; limit?: number }) =>
        listByAuthor.handler({ author_id, limit })
    );
  }

  // --- Admin tools (no API key yet; will be protected in Phase 3) ---

  const createAdmin = adminTools.find((t) => t.name === 'create_toki');
  if (createAdmin) {
    server.registerTool(
      createAdmin.name,
      {
        description: createAdmin.description,
        inputSchema: z.object({
          api_key: z.string().describe('Admin MCP API key'),
          author_id: z.string().optional().describe('Optional: ID of the user who will be the host. If not provided, uses the user_id from the API key.'),
          title: z.string().describe('Title of the Toki (required)'),
          description: z.string().optional().describe('Optional description of the Toki'),
          category: z.enum(CATEGORY_KEYS).describe('Category for the Toki (required)'),
          location: z.string().describe('Location string for the Toki (required)'),
          timeSlot: z.string().describe('Time slot description (e.g., "now", "30min", "tonight", "tomorrow", or any custom text)'),
          visibility: z.enum(['public', 'private'] as const).optional().describe('Visibility level - defaults to public if not specified'),
          scheduledTime: z.string().datetime().optional().describe('Optional scheduled time (ISO 8601 format)'),
          maxAttendees: z.number().int().min(1).max(1000).nullable().optional().describe('Maximum attendees (1-1000, or null for unlimited, defaults to 10 if not provided)'),
          autoApprove: z.boolean().optional().describe('If true, join requests are automatically approved (defaults to false)'),
          latitude: z.number().optional().describe('Optional latitude coordinate'),
          longitude: z.number().optional().describe('Optional longitude coordinate'),
          external_url: z.string().url().optional().describe('Optional external link associated with the Toki'),
          tags: z.array(z.string()).optional().describe('Optional list of tags to associate with the Toki'),
          images: z.array(z.object({
            url: z.string().url().optional().describe('URL of an existing image already uploaded to Cloudinary (use with publicId)'),
            publicId: z.string().optional().describe('Cloudinary public ID of an existing image (use with url)'),
            base64: z.string().optional().describe('Base64-encoded image data for upload. Accepts either: 1) Data URI format: "data:image/png;base64,iVBORw0KGgo..." or 2) Raw base64 string: "iVBORw0KGgo...". Supported formats: JPEG, PNG, WebP. Images are automatically uploaded to Cloudinary and resized to 800x600.'),
          })).optional().describe('Optional array of images for the Toki. Each image object can be either: 1) Existing image: provide both {url, publicId} for images already in Cloudinary, or 2) New upload: provide {base64} with base64-encoded image data (data URI or raw base64 string). Multiple images can be provided.'),
        }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
        },
      },
      async (args: {
        api_key: string;
        author_id?: string;
        title: string;
        description?: string;
        category: string;
        location: string;
        timeSlot: string;
        visibility?: string;
        scheduledTime?: string;
        maxAttendees?: number | null;
        latitude?: number;
        longitude?: number;
        external_url?: string;
        tags?: string[];
        autoApprove?: boolean;
        images?: Array<{ url?: string; publicId?: string; base64?: string }>;
      }) => createAdmin.handler(args)
    );
  }

  const updateAdmin = adminTools.find((t) => t.name === 'update_toki');
  if (updateAdmin) {
    server.registerTool(
      updateAdmin.name,
      {
        description: updateAdmin.description,
        inputSchema: z.object({
          id: z.string().describe('ID of the Toki to update'),
          api_key: z.string().describe('Admin MCP API key'),
          title: z.string().optional().describe('New title (if provided)'),
          description: z.string().optional().describe('New description (if provided)'),
          author_id: z.string().optional().describe('New host/author id, if changing ownership'),
          category: z.enum(CATEGORY_KEYS).optional().describe('Category for the Toki'),
          timeSlot: z.string().optional().describe('Time slot description (e.g., "now", "30min", "tonight", or any custom text)'),
          scheduledTime: z.string().datetime().optional().describe('Optional scheduled time (ISO 8601 format)'),
          maxAttendees: z.number().int().min(1).max(1000).nullable().optional().describe('Maximum attendees (1-1000, or null for unlimited)'),
          autoApprove: z.boolean().optional().describe('If true, join requests are automatically approved'),
          status: z.enum(['active', 'cancelled', 'completed'] as const).optional().describe('Status of the Toki'),
          location: z.string().optional().describe('Location string for the Toki'),
          visibility: z.enum(['public', 'private'] as const).optional().describe('Visibility level'),
          external_url: z.string().url().optional().describe('Optional external link associated with the Toki'),
          images: z.array(z.object({
            url: z.string().url().optional().describe('URL of an existing image already uploaded to Cloudinary (use with publicId)'),
            publicId: z.string().optional().describe('Cloudinary public ID of an existing image (use with url)'),
            base64: z.string().optional().describe('Base64-encoded image data for upload. Accepts either: 1) Data URI format: "data:image/png;base64,iVBORw0KGgo..." or 2) Raw base64 string: "iVBORw0KGgo...". Supported formats: JPEG, PNG, WebP. Images are automatically uploaded to Cloudinary and resized to 800x600.'),
          })).optional().describe('Optional array of images for the Toki. Each image object can be either: 1) Existing image: provide both {url, publicId} for images already in Cloudinary, or 2) New upload: provide {base64} with base64-encoded image data (data URI or raw base64 string). Multiple images can be provided.'),
        }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
        },
      },
      async (args: {
        id: string;
        api_key: string;
        title?: string;
        description?: string;
        author_id?: string;
        category?: string;
        status?: string;
        location?: string;
        visibility?: string;
        external_url?: string;
        timeSlot?: string;
        scheduledTime?: string;
        maxAttendees?: number | null;
        autoApprove?: boolean;
        images?: Array<{ url?: string; publicId?: string; base64?: string }>;
      }) => updateAdmin.handler(args)
    );
  }

  const deleteAdmin = adminTools.find((t) => t.name === 'delete_toki');
  if (deleteAdmin) {
    server.registerTool(
      deleteAdmin.name,
      {
        description: deleteAdmin.description,
        inputSchema: z.object({
          id: z.string(),
          api_key: z.string(),
          reason: z.string().optional(),
        }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: true,
        },
      },
      async (args: { id: string; api_key: string; reason?: string }) =>
        deleteAdmin.handler(args)
    );
  }

  return server;
}


