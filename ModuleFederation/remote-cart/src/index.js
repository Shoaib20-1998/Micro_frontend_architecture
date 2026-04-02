/**
 * ============================================================================
 * ASYNC BOUNDARY — THE UNIVERSAL ENTRY PATTERN FOR MODULE FEDERATION
 * ============================================================================
 *
 * This file does `import('./bootstrap')` — the async boundary pattern.
 * You've seen this in the host and in remote-products. It's the same here.
 *
 * WHY EVERY APP IN A MODULE FEDERATION SETUP USES THIS PATTERN:
 *
 * Module Federation's shared dependency negotiation is ASYNCHRONOUS. When
 * multiple containers (host + remotes) share React, they need a moment to
 * figure out who provides what before any React code runs.
 *
 * The dynamic import() creates that moment:
 *   1. Webpack loads this file synchronously (it's the entry point)
 *   2. import('./bootstrap') triggers an async chunk load
 *   3. Before executing bootstrap.js, webpack's runtime negotiates shared deps
 *   4. Once negotiation is complete, bootstrap.js runs with the shared React
 *
 * MULTI-REMOTE CONSISTENCY:
 * Notice this file is IDENTICAL to remote-products/src/index.js and
 * host-app/src/index.js. That's not laziness — it's a deliberate pattern.
 * Every app in a Module Federation setup should follow the same entry
 * structure. When debugging shared dep issues, you can rule out entry
 * pattern differences immediately.
 *
 * WHEN THIS FILE IS USED:
 *   - Standalone mode (npm start on port 3002): This is the webpack entry point
 *   - Consumed by host: This file is NEVER loaded. The host only fetches
 *     remoteEntry.js and the exposed Cart component chunks.
 */

import('./bootstrap');
