// Build a configured McpServer instance with all public and admin tools registered.
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';
import { userTools } from './tools/user-tools';
import { adminTools } from './tools/admin-tools';
import { CATEGORY_CONFIG } from '../config/categories';
import { authenticateMCPRequest, MCPUserContext } from './auth-mcp';
import logger from '../utils/logger';

// Extract category keys for enum from CATEGORY_CONFIG (single source of truth)
const CATEGORY_KEYS = Object.keys(CATEGORY_CONFIG) as [string, ...string[]];

export function createMCPServer() {
  const server = new McpServer({
    name: 'toki-mcp-server',
    version: '1.0.0',
  });

  // Read tools - require authentication
  const getById = userTools.find((t) => t.name === 'get_toki_by_id');
  if (getById) {
    server.registerTool(
      getById.name,
      {
        description: getById.description,
        inputSchema: z.object({
          token: z.string().describe('JWT authentication token'),
          id: z.string(),
          expand: z.array(z.string()).optional(),
        }),
        annotations: {
          readOnlyHint: true,
        },
      },
      async ({ token, id, expand }: { token: string; id: string; expand?: string[] }) => {
        const context = await authenticateMCPRequest(token);
        if (!context) {
          throw new Error('Unauthorized: Invalid or missing token');
        }
        return getById.handler({ id, expand, userContext: context });
      }
    );
  }

  const listTokis = userTools.find((t) => t.name === 'list_tokis');
  if (listTokis) {
    server.registerTool(
      listTokis.name,
      {
        description: listTokis.description,
        inputSchema: z.object({
          token: z.string().describe('JWT authentication token'),
          limit: z.number().int().optional(),
          cursor: z.string().optional(),
        }),
        annotations: {
          readOnlyHint: true,
        },
      },
      async ({ token, limit, cursor }: { token: string; limit?: number; cursor?: string }) => {
        const context = await authenticateMCPRequest(token);
        if (!context) {
          throw new Error('Unauthorized: Invalid or missing token');
        }
        return listTokis.handler({ limit, cursor, userContext: context });
      }
    );
  }

  const searchTokis = userTools.find((t) => t.name === 'search_tokis');
  if (searchTokis) {
    server.registerTool(
      searchTokis.name,
      {
        description: searchTokis.description,
        inputSchema: z.object({
          token: z.string().describe('JWT authentication token'),
          search_query: z.string(),
          limit: z.number().int().optional(),
        }),
        annotations: {
          readOnlyHint: true,
        },
      },
      async ({ token, search_query, limit }: { token: string; search_query: string; limit?: number }) => {
        const context = await authenticateMCPRequest(token);
        if (!context) {
          throw new Error('Unauthorized: Invalid or missing token');
        }
        return searchTokis.handler({ search_query, limit, userContext: context });
      }
    );
  }

  const listByAuthor = userTools.find((t) => t.name === 'list_tokis_by_author');
  if (listByAuthor) {
    server.registerTool(
      listByAuthor.name,
      {
        description: listByAuthor.description,
        inputSchema: z.object({
          token: z.string().describe('JWT authentication token'),
          author_id: z.string(),
          limit: z.number().int().optional(),
        }),
        annotations: {
          readOnlyHint: true,
        },
      },
      async ({ token, author_id, limit }: { token: string; author_id: string; limit?: number }) => {
        const context = await authenticateMCPRequest(token);
        if (!context) {
          throw new Error('Unauthorized: Invalid or missing token');
        }
        return listByAuthor.handler({ author_id, limit, userContext: context });
      }
    );
  }

  // Write tools - require admin
  const createAdmin = adminTools.find((t) => t.name === 'create_toki');
  if (createAdmin) {
    server.registerTool(
      createAdmin.name,
      {
        description: createAdmin.description,
        inputSchema: z.object({
          token: z.string().describe('JWT authentication token'),
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
            aspectRatio: z.enum(['1:1', '4:3']).optional().describe('Optional aspect ratio for cropping. Defaults to 4:3 if not specified.'),
          })).optional().describe('Optional array of images for the Toki. Each image object can be either: 1) Existing image: provide both {url, publicId} for images already in Cloudinary, or 2) New upload: provide {base64} with base64-encoded image data (data URI or raw base64 string). Multiple images can be provided.'),
        }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
        },
      },
      async (args: {
        token: string;
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
        images?: Array<{ url?: string; publicId?: string; base64?: string; aspectRatio?: '1:1' | '4:3' }>;
      }) => {
        const context = await authenticateMCPRequest(args.token);
        if (!context) {
          throw new Error('Unauthorized: Invalid or missing token');
        }
        if (!context.isAdmin) {
          logger.warn(`[MCP] Forbidden: Non-admin user ${context.userId} attempted create_toki`);
          throw new Error('Forbidden: Admin access required');
        }
        const { token: _, ...toolArgs } = args;
        return createAdmin.handler({ ...toolArgs, userContext: context });
      }
    );
  }

  const updateAdmin = adminTools.find((t) => t.name === 'update_toki');
  if (updateAdmin) {
    server.registerTool(
      updateAdmin.name,
      {
        description: updateAdmin.description,
        inputSchema: z.object({
          token: z.string().describe('JWT authentication token'),
          id: z.string().describe('ID of the Toki to update'),
          title: z.string().optional().describe('New title (if provided)'),
          description: z.string().optional().describe('New description (if provided)'),
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
            aspectRatio: z.enum(['1:1', '4:3']).optional().describe('Optional aspect ratio for cropping. Defaults to 4:3 if not specified.'),
          })).optional().describe('Optional array of images for the Toki. Each image object can be either: 1) Existing image: provide both {url, publicId} for images already in Cloudinary, or 2) New upload: provide {base64} with base64-encoded image data (data URI or raw base64 string). Multiple images can be provided.'),
        }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: false,
        },
      },
      async (args: {
        token: string;
        id: string;
        title?: string;
        description?: string;
        category?: string;
        status?: string;
        location?: string;
        visibility?: string;
        external_url?: string;
        timeSlot?: string;
        scheduledTime?: string;
        maxAttendees?: number | null;
        autoApprove?: boolean;
        images?: Array<{ url?: string; publicId?: string; base64?: string; aspectRatio?: '1:1' | '4:3' }>;
      }) => {
        const context = await authenticateMCPRequest(args.token);
        if (!context) {
          throw new Error('Unauthorized: Invalid or missing token');
        }
        if (!context.isAdmin) {
          logger.warn(`[MCP] Forbidden: Non-admin user ${context.userId} attempted update_toki`);
          throw new Error('Forbidden: Admin access required');
        }
        const { token: _, ...toolArgs } = args;
        return updateAdmin.handler({ ...toolArgs, userContext: context });
      }
    );
  }

  const deleteAdmin = adminTools.find((t) => t.name === 'delete_toki');
  if (deleteAdmin) {
    server.registerTool(
      deleteAdmin.name,
      {
        description: deleteAdmin.description,
        inputSchema: z.object({
          token: z.string().describe('JWT authentication token'),
          id: z.string(),
          reason: z.string().optional(),
        }),
        annotations: {
          readOnlyHint: false,
          destructiveHint: true,
        },
      },
      async (args: { token: string; id: string; reason?: string }) => {
        const context = await authenticateMCPRequest(args.token);
        if (!context) {
          throw new Error('Unauthorized: Invalid or missing token');
        }
        if (!context.isAdmin) {
          logger.warn(`[MCP] Forbidden: Non-admin user ${context.userId} attempted delete_toki`);
          throw new Error('Forbidden: Admin access required');
        }
        const { token: _, ...toolArgs } = args;
        return deleteAdmin.handler({ ...toolArgs, userContext: context });
      }
    );
  }

  // Note: Tool discovery (tools/list) is handled by the MCP SDK internally.
  // We cannot override it directly, but we enforce permissions at the tool handler level.
  // All tools require authentication, and write tools additionally require admin role.
  // This provides defense in depth - even if tools are visible, execution is blocked.

  return server;
}
