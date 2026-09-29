---
name: Web/API routing
description: Separate web and API artifact routing in development
---

The NSTA web artifact and API artifact run on separate local ports during development. Browser requests to relative `/api/*` paths need a Vite proxy to the API service; otherwise Vite returns 404 before the request reaches the API.

**Why:** Push notifications silently failed when the frontend called `/api/notifications/push` without a development proxy, even though the API service and Firebase Admin credentials were healthy.

**How to apply:** When adding browser-to-API calls, verify the web dev proxy and check the API workflow logs for the request rather than testing only the API port directly.