## Toki MCP Server – Admin & Public Tools

### 1. Overview

- MCP server entry: `src/mcp/index.ts` → compiled to `dist/mcp/index.js`.
- Transport: **STDIO** (used by MCP Inspector and other clients).
- Tool groups:
  - **Public tools** (no API key):
    - `get_toki_by_id`
    - `list_tokis`
    - `search_tokis`
    - `list_tokis_by_author`
  - **Admin tools** (require MCP admin API key):
    - `create_toki`
    - `update_toki`
    - `delete_toki`

### 2. Running the MCP server

From `toki-backend`:

```bash
npm run build          # compile backend + MCP
node dist/mcp/index.js
```

Configure MCP Inspector (or any stdio client):

- Transport: `STDIO`
- Command: `node dist/mcp/index.js`
- Working directory: `/Users/orilerman/Desktop/tokiApp/toki-backend`
- Environment:
  - `DATABASE_URL` (and any other required backend env vars)

### 3. Public tools (no key)

- **get_toki_by_id**
  - Input: `{ "id": "TOKI_ID", "expand": ["stats"]? }`
  - Output: `{ "toki": SpecToki }`.

- **list_tokis**
  - Input: `{ "limit": 20 }`
  - Output: `{ "items": SpecToki[], "next_cursor": null, "has_more": false }`.

- **search_tokis**
  - Input: `{ "search_query": "coffee", "limit": 20 }`
  - Searches title/description for active Tokis.

- **list_tokis_by_author**
  - Input: `{ "author_id": "USER_ID", "limit": 20 }`
  - Lists active Tokis with `host_id = author_id`.

### 4. Admin API keys

#### 4.1 Storage

- Table: `mcp_api_keys`
  - `id UUID PRIMARY KEY`
  - `name VARCHAR(255)`
  - `key_hash TEXT` (bcrypt)
  - `scopes TEXT[] DEFAULT {'admin'}`
  - `created_by UUID REFERENCES users(id)`
  - `created_at TIMESTAMP`
  - `last_used_at TIMESTAMP`
  - `revoked_at TIMESTAMP`

Keys are **never stored in plaintext**, only the bcrypt hash.

#### 4.2 Validation

- Helper: `src/mcp/auth.ts` → `validateAdminKey(rawKey: string)`.
- Logic:
  - Iterate non‑revoked rows from `mcp_api_keys`.
  - `bcrypt.compare(rawKey, key_hash)`; on match:
    - `UPDATE mcp_api_keys SET last_used_at = NOW()`.
    - return `{ id, scopes }`.
  - Otherwise, return `null`.

Admin MCP tools call `validateAdminKey` and return an error result when the key is missing/invalid.

### 5. Admin tools (with `api_key`)

All admin tools require an input field:

```json
{ "api_key": "<PLAINTEXT_KEY>", ... }
```

- **create_toki**
  - Input fields:
    - `api_key: string`
    - `author_id: string`
    - `content: string`
    - `category?: string`
    - `status?: string`
    - `location?: string`
    - `visibility?: string`
    - `external_url?: string`
    - `tags?: string[]`
  - Behavior:
    - Validates `api_key`.
    - Inserts into `tokis` (mirrors admin route) and optional `toki_tags`.
    - Returns `{ "toki": SpecToki }`.

- **update_toki**
  - Input fields:
    - `api_key: string`
    - `id: string`
    - Optional: `content`, `author_id`, `category`, `status`, `location`, `visibility`, `external_url`.
  - Behavior:
    - Validates `api_key`.
    - If `content` is present, updates both `title` and `description`.
    - Updates other fields, sets `updated_at = NOW()`.
    - Returns updated `{ "toki": SpecToki }`.

- **delete_toki**
  - Input fields:
    - `api_key: string`
    - `id: string`
    - `reason?: string`
  - Behavior:
    - Validates `api_key`.
    - Deletes from `tokis`, returns `{ id, deleted: true, reason }`.

### 6. Managing MCP keys in the Admin Panel

UI: **MCP Keys** tab in the admin dashboard.

- Backend endpoints:
  - `GET /api/admin/mcp-keys` → list keys.
  - `POST /api/admin/mcp-keys` → create key (returns plaintext once).
  - `POST /api/admin/mcp-keys/:id/revoke` → revoke key.

- Typical flow:
  1. Open `/admin`, log in as admin.
  2. Go to **MCP Keys** tab.
  3. Click **Create Key**, enter a name (e.g. “Local Inspector”).
  4. Copy the plaintext key shown once and store it securely.
  5. In MCP Inspector, include that key in `api_key` for admin tools.
  6. To invalidate it, click **Revoke**.

### 7. Security notes / hardening

- **Never log plaintext keys**:
  - Keep logging limited to key `id` or name; avoid logging the raw `api_key` provided by clients.
- **Principle of least privilege**:
  - Currently all keys use `scopes = ['admin']`. In the future, use scopes to limit which tools a key can call.
- **Rotate keys regularly**:
  - Use the MCP Keys tab to revoke old keys and create new ones.
- **Rate limiting**:
  - Consider adding basic rate limiting on `/api/admin/mcp-keys` and MCP admin tools to mitigate brute‑force attempts.
- **Environment separation**:
  - Use different API keys per environment (dev/staging/prod).


