# MCP Server ↔ REST API Misalignments Found

## Summary
This document lists ALL misalignments found between the MCP server and REST API before fixing.

---

## 🔴 CRITICAL ISSUES

### 1. **Title/Description Field Mismatch**
**REST API**: 
- `title` (required, string)
- `description` (optional, string)

**MCP Server**: 
- `content` (required, string) - gets split into both title and description

**Problem**: 
- MCP uses a single `content` field that gets truncated to 255 chars for title, and full content for description
- This doesn't match REST API which has separate fields
- Users can't set title and description independently via MCP

**Impact**: High - Core functionality mismatch

---

### 2. **Missing `images` Field**
**REST API**: 
- `images` (optional, array of objects)
  - Each image can have: `{ url, publicId }` OR `{ base64 }`
  - Supports uploading images via base64 or providing existing URLs

**MCP Server**: 
- ❌ No `images` field at all

**Problem**: 
- MCP cannot create tokis with images
- REST API supports both base64 uploads and existing image URLs

**Impact**: High - Missing feature

---

## 🟡 MEDIUM ISSUES

### 3. **Missing `userLatitude` and `userLongitude` Fields**
**REST API**: 
- `userLatitude` (optional, number)
- `userLongitude` (optional, number)
- Used for geocoding/algorithm calculations

**MCP Server**: 
- ❌ Not present

**Problem**: 
- These might be used internally for location-based features
- However, they might be auto-derived from the API key's user, so lower priority

**Impact**: Medium - May affect location-based features

---

## 🟢 MINOR ISSUES

### 4. **Field Naming Consistency**
**REST API**: 
- `externalLink` (camelCase)

**MCP Server**: 
- `external_url` (snake_case)

**Status**: ✅ Already handled in handler (converted properly)
**Impact**: Low - Already working correctly

---

## 📊 Comparison Table

| Field | REST API | MCP Server | Status |
|-------|----------|------------|--------|
| `title` | ✅ Required | ❌ Missing (uses `content`) | 🔴 Critical |
| `description` | ✅ Optional | ❌ Missing (uses `content`) | 🔴 Critical |
| `content` | ❌ Not used | ✅ Required | 🔴 Should be removed |
| `location` | ✅ Required | ✅ Required | ✅ OK |
| `latitude` | ✅ Optional | ✅ Optional | ✅ OK |
| `longitude` | ✅ Optional | ✅ Optional | ✅ OK |
| `timeSlot` | ✅ Required | ✅ Required | ✅ OK |
| `scheduledTime` | ✅ Optional | ✅ Optional | ✅ OK |
| `maxAttendees` | ✅ Optional | ✅ Optional | ✅ OK |
| `category` | ✅ Required | ✅ Required | ✅ OK |
| `visibility` | ✅ Optional | ✅ Optional | ✅ OK |
| `tags` | ✅ Optional | ✅ Optional | ✅ OK |
| `images` | ✅ Optional | ❌ Missing | 🔴 Critical |
| `externalLink` | ✅ Optional | ✅ Optional (as `external_url`) | ✅ OK |
| `autoApprove` | ✅ Optional | ✅ Optional | ✅ OK |
| `userLatitude` | ✅ Optional | ❌ Missing | 🟡 Medium |
| `userLongitude` | ✅ Optional | ❌ Missing | 🟡 Medium |
| `api_key` | ❌ Not used (uses auth token) | ✅ Required | ✅ OK (MCP-specific) |
| `author_id` | ❌ Not used (uses req.user.id) | ✅ Optional | ✅ OK (MCP-specific) |

---

## 🎯 Recommended Fixes Priority

### Priority 1 (Critical):
1. ✅ Replace `content` with separate `title` and `description` fields
2. ✅ Add `images` field support

### Priority 2 (Medium):
3. ⚠️ Consider adding `userLatitude` and `userLongitude` (if needed for MCP use cases)

### Priority 3 (Low):
4. ✅ Field naming is already handled correctly

---

## 📝 Notes

- The `api_key` and `author_id` fields are MCP-specific and don't need to match REST API (they're for authentication/authorization)
- The `external_url` vs `externalLink` naming difference is already handled in the handler
- `userLatitude`/`userLongitude` might be auto-derived from the API key's user, so may not be needed in MCP





