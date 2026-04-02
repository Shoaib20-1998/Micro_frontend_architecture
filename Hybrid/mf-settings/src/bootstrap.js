/**
 * ============================================================================
 * HYBRID SETTINGS — BOOTSTRAP (Standalone Entry Point)
 * ============================================================================
 *
 * CODE ANNOTATION: Identical pattern to mf-home/src/bootstrap.js
 * -----------------------------------------------------------------
 * This file mounts the Settings app's React component when running in
 * STANDALONE mode (npm start on port 4002). It's the "real" entry point
 * after the async boundary in index.js.
 *
 * SCALING OBSERVATION:
 * This file is another piece of BOILERPLATE in the repeatable recipe.
 * The only thing that changes between mf-home's bootstrap.js and this one
 * is the imported App component (./App points to Settings content, not Home).
 *
 * WHEN THIS FILE RUNS:
 *
 *   1. STANDALONE MODE (npm start):
 *      index.js → import('./bootstrap') → this file runs → App mounts into #root
 *      The Settings team sees their component in isolation for local dev.
 *
 *   2. CONSUMED BY HYBRID SHELL:
 *      This file is NEVER loaded. The shell only imports the exposed
 *      './singleSpaEntry' module via Module Federation.
 *
 * THE DUAL NATURE — Two entry paths (same as mf-home):
 *
 *   Path A — Standalone (this file):
 *     index.js → bootstrap.js → ReactDOM.createRoot() → renders <App />
 *     Lifecycle: managed by React directly
 *
 *   Path B — Consumed by shell (single-spa-entry.js):
 *     Shell's mf-loader → import('mfSettings/singleSpaEntry') → lifecycle hooks
 *     Lifecycle: managed by single-spa (bootstrap → mount → unmount)
 *
 * Both paths render the SAME <App /> component. The micro frontend
 * architecture is invisible to the component itself.
 *
 * ============================================================================
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

/**
 * CODE ANNOTATION: ReactDOM.createRoot() — React 18 API
 * -------------------------------------------------------
 * Same as mf-home's bootstrap.js. We use React 18's createRoot API
 * for standalone mode. When consumed by the shell, single-spa-react
 * handles the React rendering internally.
 */
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
