---
name: Direct chat identity
description: Why the messenger must resolve direct-message rooms across imported account identity aliases.
---

Direct-message delivery must treat the account document ID, Firebase Auth UID, and available profile aliases as equivalent identities when resolving a 1-to-1 chat room.

**Why:** Imported user records can expose different identifiers to the sender and recipient, causing each client to subscribe to a different realtime room even though the friend relationship is the same.

**How to apply:** When changing direct chat delivery, write and listen across the known identity-pair rooms, then deduplicate messages by message ID. Keep group chats on their existing group ID path.