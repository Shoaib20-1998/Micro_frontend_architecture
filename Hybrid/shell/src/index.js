/**
 * ============================================================================
 * HYBRID SHELL — ASYNC BOUNDARY ENTRY POINT
 * ============================================================================
 *
 * CODE ANNOTATION: Why this file exists (the async boundary pattern)
 * -------------------------------------------------------------------
 * This file does ONE thing: dynamically import('./bootstrap').
 *
 * This is the same async boundary pattern used in the pure Module Federation
 * host app (see ModuleFederation/host-app/src/index.js). The dynamic import
 * creates a chunk boundary that gives webpack's Module Federation runtime a
 * chance to negotiate shared dependencies BEFORE any application code runs.
 *
 * WITHOUT this async boundary:
 *   1. Webpack bundles single-spa and React synchronously
 *   2. React loads immediately, before remotes can say "I also need React"
 *   3. Result: React loads multiple times, hooks break, chaos
 *
 * WITH this async boundary:
 *   1. Webpack sees import('./bootstrap') — creates an async chunk
 *   2. Before loading that chunk, MF runtime negotiates shared deps
 *   3. React and single-spa are resolved to shared singleton versions
 *   4. bootstrap.js runs with the shared versions — one React for everyone
 *
 * DIFFERENCE FROM PURE SINGLE-SPA:
 * The pure Single-Spa root-config (Single-Spa/root-config/src/index.js)
 * doesn't need this pattern because it uses SystemJS for module loading,
 * not Module Federation. SystemJS loads modules on-demand via System.import(),
 * so there's no shared dependency negotiation to worry about.
 *
 * In the Hybrid approach, we use Module Federation for loading, so we
 * inherit its requirement for the async boundary.
 *
 * ============================================================================
 */

import('./bootstrap');
