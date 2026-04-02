/**
 * ============================================================================
 * HYBRID SETTINGS — ASYNC BOUNDARY ENTRY POINT
 * ============================================================================
 *
 * CODE ANNOTATION: The repeatable async boundary pattern
 * --------------------------------------------------------
 * This file is IDENTICAL in purpose to mf-home/src/index.js. It does ONE
 * thing: dynamically import('./bootstrap').
 *
 * You've now seen this pattern in EVERY Module Federation app in this project:
 *   - ModuleFederation/host-app/src/index.js       (pure MF host)
 *   - ModuleFederation/remote-products/src/index.js (pure MF remote)
 *   - ModuleFederation/remote-cart/src/index.js     (pure MF remote)
 *   - Hybrid/shell/src/index.js                     (Hybrid shell)
 *   - Hybrid/mf-home/src/index.js                   (first Hybrid MF)
 *   - THIS FILE                                     (second Hybrid MF)
 *
 * SCALING OBSERVATION:
 * This file is BOILERPLATE. Every new hybrid micro frontend gets an identical
 * copy. Some teams automate this with a code generator or template:
 *
 *   npx create-hybrid-mf mf-settings --port 4002
 *
 * The async boundary is a mechanical requirement of Module Federation, not
 * a design decision. It's the same one line of code every time.
 *
 * WHY THIS REMOTE NEEDS IT:
 *
 *   STANDALONE MODE (npm start on port 4002):
 *     The async boundary ensures shared dependency negotiation happens
 *     before any React code runs. Without it, you might get duplicate
 *     React instances even in standalone mode.
 *
 *   CONSUMED BY SHELL:
 *     This file is NEVER loaded. The shell only fetches remoteEntry.js
 *     and the singleSpaEntry chunk. The standalone entry path is ignored.
 *
 * ============================================================================
 */

import('./bootstrap');
