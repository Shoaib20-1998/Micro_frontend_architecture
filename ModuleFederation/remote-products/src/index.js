/**
 * ============================================================================
 * ASYNC BOUNDARY — SAME PATTERN AS THE HOST, AND FOR THE SAME REASON
 * ============================================================================
 *
 * This file does `import('./bootstrap')` — the async boundary pattern.
 *
 * WHY A REMOTE ALSO NEEDS THIS:
 *
 * When this remote runs STANDALONE (npm start on port 3001), it behaves
 * like its own host. It needs the async boundary so that shared dependency
 * negotiation works correctly for its own React/ReactDOM imports.
 *
 * When this remote is consumed BY the host:
 *   - The host's async boundary handles negotiation for the host's code
 *   - The remote's remoteEntry.js handles negotiation for the remote's code
 *   - This index.js is NOT used — only remoteEntry.js and the exposed
 *     component chunks are loaded by the host
 *
 * So this file only matters for standalone mode. But it's essential for
 * local development — you want to be able to run `npm start` in this
 * directory and see the ProductList component working independently,
 * without needing the host app running.
 *
 * INTERVIEW TIP:
 * "Every app in a Module Federation setup needs the async boundary pattern,
 * even remotes. When running standalone, the remote IS the host for its own
 * shared dependencies. The async boundary ensures React loads once regardless
 * of whether the app is running standalone or being consumed by another host."
 */

import('./bootstrap');
