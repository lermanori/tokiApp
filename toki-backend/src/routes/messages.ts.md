# File: toki-backend/src/routes/messages.ts

### Summary
Message routes for conversations and Toki group chats. Emission logs are concise; payload dumps are debug-only.

### Fixes Applied log
- problem: Emission logs printed full payloads and room membership counts by default.
- solution: Kept event/room at info; moved payloads, member counts, and timestamp diagnostics to debug; errors remain errors.

### How Fixes Were Implemented
- Replaced `console.*` with `logger.*`.
- Standardized info-level to: sending event + room name + success confirmation.
- Demoted timestamp spam and payload details to `debug`.

# File: messages.ts

### Summary
This file contains the backend routes for messaging functionality including conversations, messages, and real-time updates via WebSocket.

### Fixes Applied log
- **problem**: Messages screen was showing conversations with 0 messages (empty conversations created before first message was sent).
- **solution**: Updated the GET /conversations endpoint to only return conversations that have at least one message using EXISTS clause.

### How Fixes Were Implemented
- **problem**: The original query returned all conversations regardless of whether they had messages, causing empty conversations to appear in the Messages screen.
- **solution**: Added `AND EXISTS (SELECT 1 FROM messages m WHERE m.conversation_id = c.id)` to both the main query and the count query to filter out empty conversations.

**Before:**
```sql
WHERE c.user1_id = $1 OR c.user2_id = $1
```

**After:**
```sql
WHERE (c.user1_id = $1 OR c.user2_id = $1)
  AND EXISTS (
    SELECT 1 FROM messages m WHERE m.conversation_id = c.id
  )
```

This ensures that:
1. Only conversations with at least one message appear in the Messages screen
2. Empty conversations created by the old behavior are filtered out
3. The new behavior (conversation created only on first message send) works correctly
