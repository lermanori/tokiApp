# Toki Tools Specification

Shared Concepts
Toki Object (canonical shape returned by tools)
Unless stated otherwise, tools that return a Toki will use this structure:

Field | Type | Description
----- | ----- | -----------
id | string | Unique identifier of the Toki.
author_id | string | ID of the user who created the Toki.
content | string | Main text content of the Toki.
media_urls | array of strings | Optional list of media URLs (images, videos, etc.).
created_at | string (ISO 8601) | Creation timestamp.
updated_at | string (ISO 8601) | Last update timestamp (may equal created_at if never edited).
visibility | string (enum) | Visibility level: e.g. "public", "followers", "private".
tags | array of strings | List of tags/hashtags associated with the Toki.
like_count | number | Total number of likes.
comment_count | number | Total number of comments.
repost_count | number | Total number of reposts/shares.
external_url | string or null | Optional external link associated with the Toki.
metadata | object | Optional extra metadata (key–value pairs), can be implementation-specific.

Pagination for list endpoints:

Field | Type | Description
----- | ----- | -----------
items | array of Tokis | List of Toki objects.
next_cursor | string or null | Cursor for fetching the next page. null if no more results.
has_more | boolean | true if there is another page available.

---

# 1. User Tools (Read‑Only)

## 1.1 get_toki_by_id

Short description:
Fetch a single Toki post by its unique ID. Read‑only; does not modify anything.

### Input Parameters

Name | Type | Required | Description
----- | ----- | -------- | -----------
id | string | Yes | The unique ID of the Toki to retrieve.
expand | array of strings | No | Optional list of related resources to expand.

### Output
Returns a single Toki object.

Additional optional top-level fields:
- toki
- author
- stats

### Suggested minimal response shape:
```json
{
  "toki": {
    "id": "string",
    "author_id": "string",
    "content": "string",
    "media_urls": ["string"],
    "created_at": "ISO-8601",
    "updated_at": "ISO-8601",
    "visibility": "public",
    "tags": ["string"],
    "like_count": 0,
    "comment_count": 0,
    "repost_count": 0,
    "external_url": "string or null",
    "metadata": {}
  }
}
```

### Example Scenarios

**Example 1**
User: “Show me the full content of the Toki with ID toki_98765.”
Params:
```json
{ "id": "toki_98765" }
```

**Example 2**
User: “Get me the Toki toki_123 and include the author details if possible.”
```json
{ "id": "toki_123", "expand": ["author"] }
```

---

## 1.2 list_tokis

Short description:
Fetch a list/feed of Tokis. Read‑only.

### Input Parameters
Name | Type | Required | Description
----- | ----- | -------- | -----------
limit | number | No | Max number of Tokis to return.
cursor | string | No | Pagination cursor.
author_id | string | No | Filter by author.
tag | string | No | Filter by tag.
visibility | string | No | Visibility filter.
since | string | No | After timestamp.
until | string | No | Before timestamp.
sort_by | string | No | Sorting method.
search_query | string | No | Text search.

### Output
Paginated list of Tokis.

```json
{
  "items": [],
  "next_cursor": "string or null",
  "has_more": true
}
```

### Example Scenarios

**Example 1**
```json
{
  "limit": 10,
  "tag": "release",
  "visibility": "public",
  "sort_by": "created_at_desc"
}
```

**Example 2**
```json
{
  "author_id": "user_123",
  "cursor": "prev_next_cursor_value",
  "limit": 20
}
```

---

# 2. Admin Tools (Full Management)

## 2.1 create_toki

Short description:
Create a new Toki post.

### Input Parameters
author_id | string | Yes  
content | string | Yes  
media_urls | array | No  
visibility | string | No  
tags | array | No  
external_url | string | No  
metadata | object | No  

### Output
```json
{ "toki": {} }
```

### Example Scenarios
**Example 1**
```json
{
  "author_id": "user_42",
  "content": "We just launched Toki v2! #launch",
  "visibility": "public",
  "tags": ["launch"]
}
```

**Example 2**
```json
{
  "author_id": "user_marketing",
  "content": "Draft: Black Friday teaser campaign.",
  "media_urls": ["https://cdn.example.com/media/bf_teaser1.png"],
  "visibility": "private",
  "external_url": "https://example.com/black-friday",
  "tags": ["blackfriday", "draft"],
  "metadata": { "campaign_id": "BF2025", "status": "draft" }
}
```

---

## 2.2 update_toki

Short description:
Update an existing Toki.

### Input Parameters
id | string | Yes  
content | string | No  
media_urls | array | No  
visibility | string | No  
tags | array | No  
external_url | string or null | No  
metadata | object | No  

### Output
```json
{ "toki": {} }
```

### Example Scenarios

**Example 1**
```json
{
  "id": "toki_777",
  "content": "We’re live worldwide now!"
}
```

**Example 2**
```json
{
  "id": "toki_999",
  "visibility": "private",
  "external_url": null
}
```

---

## 2.3 delete_toki

Short description:
Delete a Toki.

### Input Parameters
id | string | Yes  
reason | string | No  

### Output
```json
{
  "id": "toki_123",
  "deleted": true,
  "reason": null
}
```

### Example Scenarios

**Example 1**
```json
{
  "id": "toki_456",
  "reason": "Community guidelines violation"
}
```

**Example 2**
```json
{
  "id": "toki_test_post"
}
```
