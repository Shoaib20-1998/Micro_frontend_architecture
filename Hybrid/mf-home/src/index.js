/**
 * ============================================================================
 * HYBRID HOME — ASYNC BOUNDARY ENTRY POINT
 * ============================================================================
 *
 * CODE ANNOTATION: The async boundary pattern (again!)
 * ------------------------------------------------------
 * This file does ONE thing: dynamically import('./bootstrap').
 *
 * You've seen this pattern in:
 *   - ModuleFederation/remote-products/src/index.js (pure MF remote)
 *   - ModuleFederation/host-app/src/index.js (pure MF host)
 *   - Hybrid/shell/src/index.js (Hybrid shell)
 *
 * And now here, in the Hybrid remote. Every app in a Module Federation
 * setup needs this async boundary — hosts AND remotes.
 *
 * WHY THIS REMOTE NEEDS IT:
 *
 *   STANDALONE MODE (npm start on port 4001):
 *     This remote IS its own host. The async boundary ensures React and
 *     single-spa-react are loaded as shared singletons, even when no
 *     external host is involved. Without it, shared dependency negotiation
 *     can't happen and you might get duplicate React instances.
 *
 *   CONSUMED BY SHELL (shell loads remoteEntry.js):
 *     This file is NEVER loaded. The shell only fetches:
 *       1. remoteEntry.js (the container manifest)
 *       2. The singleSpaEntry chunk (the lifecycle hooks)
 *     The standalone entry point (this file + bootstrap.js) is ignored.
 *
 * INTERVIEW TIP:
 * "Every app in a Module Federation setup — host or remote — needs the
 * async boundary pattern. The dynamic import() creates a chunk boundary
 * that lets webpack's MF runtime negotiate shared dependencies before
 * any application code executes."
 *
 * ============================================================================
 */

import('./bootstrap');
