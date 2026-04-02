/**
 * ============================================================================
 * ASYNC BOUNDARY — THE MOST IMPORTANT PATTERN IN MODULE FEDERATION
 * ============================================================================
 *
 * This file does ONE thing: dynamically import('./bootstrap').
 * That's it. And that single line is the key to making Module Federation work.
 *
 * WHY THIS INDIRECTION EXISTS:
 *
 * Module Federation shares dependencies (like React) between independently
 * built applications at RUNTIME. But this negotiation can only happen if
 * the shared dependencies are loaded asynchronously.
 *
 * Here's the problem without the async boundary:
 *   1. Webpack bundles index.js synchronously
 *   2. index.js imports React at the top level
 *   3. React is loaded IMMEDIATELY, before any remote has a chance to say
 *      "hey, I also need React — can we share?"
 *   4. Result: React loads twice. Hooks break. Chaos ensues.
 *
 * Here's what happens WITH the async boundary:
 *   1. Webpack sees import('./bootstrap') — a dynamic import
 *   2. It creates a separate async chunk for bootstrap.js and everything
 *      it imports (including React)
 *   3. Before loading that chunk, webpack's Module Federation runtime kicks in
 *   4. It checks: "What shared deps does this chunk need? Are any already
 *      loaded by a remote? Can I reuse them?"
 *   5. Shared deps are negotiated, THEN bootstrap.js loads with the shared
 *      versions
 *   6. Result: One copy of React. Hooks work. Peace is restored.
 *
 * INTERVIEW TIP:
 * If someone asks "why does Module Federation need import('./bootstrap')?",
 * the answer is: "It creates an async boundary that gives webpack's runtime
 * a chance to negotiate shared dependencies before any application code
 * executes. Without it, shared libraries load synchronously and can't be
 * deduplicated across containers."
 *
 * This pattern is sometimes called the "bootstrap pattern" or "async
 * entry point pattern" in Module Federation documentation.
 */

import('./bootstrap');
