/**
 * ============================================================================
 * HYBRID HOME — BOOTSTRAP (Standalone Entry Point)
 * ============================================================================
 *
 * CODE ANNOTATION: What this file does
 * --------------------------------------
 * This file mounts the Home app's React component when running in STANDALONE
 * mode (npm start on port 4001). It's the "real" entry point after the async
 * boundary in index.js.
 *
 * WHEN THIS FILE RUNS:
 *
 *   1. STANDALONE MODE (npm start):
 *      index.js → import('./bootstrap') → this file runs → App mounts into #root
 *      The developer sees the Home component in a standalone page for local dev.
 *
 *   2. CONSUMED BY HYBRID SHELL:
 *      This file is NEVER loaded. The shell only imports the exposed
 *      './singleSpaEntry' module via Module Federation. The standalone
 *      shell (App.js, bootstrap.js, index.js) is completely ignored.
 *
 * CODE ANNOTATION: The dual nature in action
 * --------------------------------------------
 * This Hybrid micro frontend has TWO entry paths:
 *
 *   Path A — Standalone (this file):
 *     index.js → bootstrap.js → ReactDOM.createRoot() → renders <App />
 *     Used for: local development, testing in isolation
 *     Lifecycle: managed by React (no single-spa involved)
 *
 *   Path B — Consumed by shell (single-spa-entry.js):
 *     Shell's mf-loader → import('mfHome/singleSpaEntry') → lifecycle hooks
 *     Used for: production, integrated testing
 *     Lifecycle: managed by single-spa (bootstrap → mount → unmount)
 *
 * Both paths render the SAME <App /> component. The difference is who
 * controls the rendering lifecycle — React directly (standalone) or
 * single-spa (integrated).
 *
 * COMPARE TO PURE MF REMOTE:
 * Same pattern as ModuleFederation/remote-products/src/bootstrap.js.
 * The only conceptual difference is that this remote ALSO has a
 * single-spa-entry.js for the Hybrid lifecycle path.
 *
 * ============================================================================
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * CODE ANNOTATION: ReactDOM.createRoot() — React 18 API
 * -------------------------------------------------------
 * We use React 18's createRoot API (not the legacy ReactDOM.render).
 * This is consistent with the pure MF remotes and the Hybrid shell.
 *
 * Note: When consumed by the shell, single-spa-react handles the React
 * rendering internally (using its own createRoot or render call). This
 * bootstrap.js is only for standalone mode.
 */
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
