# MCP Server - REST API Alignment Fixes

## Summary
This document lists all misalignments found between the MCP server schema and the REST API, and how they were fixed.

## Issues Found and Fixed

### 1. ✅ timeSlot Field - Too Restrictive
**Problem**: MCP server restricted `timeSlot` to enum: `['now', '30min', '1hour', '2hours', '3hours', 'tonight', 'tomorrow']`  
**REST API**: Accepts any string (stored as `VARCHAR(50)`)  
**Fix**: Changed from `z.enum([...])` to `z.string()` to allow free-form text

**Files Changed**:
- `src/mcp/server.ts` (line 127)
- `src/mcp/tools/admin-tools.ts` (line 34-36)

---

### 2. ✅ visibility Default Value and Supported Values
**Problem**: 
- MCP server defaulted to `'private'` (should be `'public'`)
- MCP server allowed `'connections'` and `'friends'` which are not actually implemented in backend

**REST API**: 
- Defaults to `'public'`
- Accepts `'connections'` and `'friends'` in validation, but they are not implemented (treated same as `'public'`)
- Only `'public'` and `'private'` have different behavior

**Fix**: 
- Changed default from `'private'` to `'public'`
- Restricted visibility enum to only `['public', 'private']` (removed unimplemented values)
- Updated types to match

**Files Changed**:
- `src/mcp/server.ts` (visibility enum)
- `src/mcp/tools/admin-tools.ts` (validVisibility array and type)
- `src/mcp/types.ts` (SpecToki and DbToki visibility types)
- `src/mcp/adapters/toki-adapter.ts` (added normalizeVisibility function to handle legacy 'connections'/'friends' values)

---

### 3. ✅ Category Enum - Hardcoded List
**Problem**: MCP server had hardcoded category list that could get out of sync  
**REST API**: Uses `CATEGORY_CONFIG` keys (single source of truth)  
**Fix**: Changed to dynamically use `Object.keys(CATEGORY_CONFIG)` to ensure categories always match

**Files Changed**:
- `src/mcp/server.ts` (line 9-25 → line 9)

---

### 4. ✅ maxAttendees Description
**Problem**: Description didn't match REST API behavior  
**REST API**: `null` = unlimited, `undefined` = defaults to 10  
**Fix**: Updated description to clarify: "1-1000, or null for unlimited, defaults to 10 if not provided"

**Files Changed**:
- `src/mcp/server.ts` (line 131)

---

### 5. ✅ status Field in create_toki
**Problem**: MCP server allowed `status` in create, but REST API doesn't accept it  
**REST API**: Status is not accepted in POST `/tokis` (only in PUT `/tokis/:id`)  
**Fix**: Removed `status` from `create_toki` schema and handler. Status now always defaults to `'active'` in create.

**Files Changed**:
- `src/mcp/server.ts` (line 129 - removed)
- `src/mcp/tools/admin-tools.ts` (removed from handler args and implementation)

---

### 6. ✅ autoApprove Field Missing
**Problem**: MCP server didn't support `autoApprove` field  
**REST API**: Accepts `autoApprove` boolean in both create and update  
**Fix**: Added `autoApprove` field to both `create_toki` and `update_toki` schemas and handlers

**Files Changed**:
- `src/mcp/server.ts` (added to create_toki and update_toki schemas)
- `src/mcp/tools/admin-tools.ts` (added to handlers)

---

### 7. ✅ update_toki Missing Fields
**Problem**: `update_toki` only supported a subset of REST API fields  
**REST API**: Supports: `title`, `description`, `location`, `latitude`, `longitude`, `timeSlot`, `scheduledTime`, `maxAttendees`, `category`, `visibility`, `tags`, `externalLink`, `autoApprove`  
**MCP Before**: Only supported: `content`, `author_id`, `category`, `status`, `location`, `visibility`, `external_url`  
**Fix**: Added support for: `timeSlot`, `scheduledTime`, `maxAttendees`, `latitude`, `longitude`, `autoApprove`. Also changed to dynamic query building (matching REST API approach).

**Files Changed**:
- `src/mcp/server.ts` (added fields to update_toki schema)
- `src/mcp/tools/admin-tools.ts` (completely rewrote update handler to match REST API)

---

## Alignment Summary

### create_toki
| Field | MCP Before | REST API | Status |
|-------|-----------|----------|--------|
| `timeSlot` | Enum (7 values) | Free string | ✅ Fixed |
| `visibility` | Default: `'private'` | Default: `'public'` | ✅ Fixed |
| `category` | Hardcoded list | `CATEGORY_CONFIG` keys | ✅ Fixed |
| `status` | Optional | Not accepted | ✅ Removed |
| `autoApprove` | Missing | Supported | ✅ Added |
| `maxAttendees` | Description unclear | null=unlimited, undefined=10 | ✅ Clarified |

### update_toki
| Field | MCP Before | REST API | Status |
|-------|-----------|----------|--------|
| `timeSlot` | Missing | Supported | ✅ Added |
| `scheduledTime` | Missing | Supported | ✅ Added |
| `maxAttendees` | Missing | Supported | ✅ Added |
| `latitude` | Missing | Supported | ✅ Added |
| `longitude` | Missing | Supported | ✅ Added |
| `autoApprove` | Missing | Supported | ✅ Added |
| Query building | Static COALESCE | Dynamic fields | ✅ Refactored |

---

## Testing Recommendations

1. **Test timeSlot**: Try creating a Toki with custom timeSlot like "next week" or "in 2 days"
2. **Test visibility default**: Create Toki without visibility - should default to 'public'
3. **Test categories**: Verify all categories from `CATEGORY_CONFIG` are available in dropdown
4. **Test autoApprove**: Create/update Toki with `autoApprove: true`
5. **Test update_toki**: Update Toki with all new fields (timeSlot, scheduledTime, maxAttendees, etc.)

---

## Notes

- The MCP server now uses `content` field which gets split into `title` and `description`. This is a design choice and doesn't need to match REST API exactly (REST uses separate `title` and `description` fields).
- The `external_url` vs `externalLink` naming difference is handled in the handler, so it's fine.
- Tags are handled separately in both MCP and REST API, so no changes needed there.

