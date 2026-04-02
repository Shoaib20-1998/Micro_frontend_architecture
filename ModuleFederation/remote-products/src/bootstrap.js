/**
 * ============================================================================
 * BOOTSTRAP — STANDALONE ENTRY POINT FOR THE REMOTE
 * ============================================================================
 *
 * This file mounts the remote app's own UI when running in standalone mode.
 * It's the same pattern as the host's bootstrap.js — separated from index.js
 * by the async boundary so shared deps are negotiated first.
 *
 * WHEN THIS FILE RUNS:
 *
 * 1. STANDALONE MODE (npm start on port 3001):
 *    index.js → import('./bootstrap') → this file runs → App mounts into #root
 *    The developer sees the full standalone app with the ProductList component.
 *
 * 2. CONSUMED BY HOST (host loads remoteEntry.js):
 *    This file is NEVER loaded. The host only fetches remoteEntry.js and the
 *    specific chunks for exposed modules (ProductList). The standalone shell
 *    (App.js, bootstrap.js, index.js) is ignored entirely.
 *
 * This separation is what makes remotes independently runnable. The Products
 * team can develop and test their component locally without spinning up the
 * host app. They just run `npm start` and see their component in isolation.
 *
 * INTERVIEW TIP:
 * "Each remote in a Module Federation setup should be independently runnable.
 * The bootstrap.js + App.js files provide a standalone shell for local
 * development. When consumed by the host, only the exposed modules are loaded —
 * the standalone shell is never fetched."
 */

import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
