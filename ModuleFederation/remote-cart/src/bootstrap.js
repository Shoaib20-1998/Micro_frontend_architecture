/**
 * ============================================================================
 * BOOTSTRAP — STANDALONE ENTRY POINT FOR THE CART REMOTE
 * ============================================================================
 *
 * This file mounts the Cart remote's standalone UI. Same pattern as
 * remote-products/bootstrap.js — separated from index.js by the async
 * boundary so shared deps are negotiated before React code executes.
 *
 * WHEN THIS FILE RUNS:
 *
 * 1. STANDALONE MODE (npm start on port 3002):
 *    index.js → import('./bootstrap') → this file runs → App mounts into #root
 *    The Cart team sees their component in a standalone development shell.
 *
 * 2. CONSUMED BY HOST (host loads remoteEntry.js):
 *    This file is NEVER loaded. The host only fetches remoteEntry.js and
 *    the Cart component chunk. The standalone shell (App.js, bootstrap.js,
 *    index.js) is completely ignored.
 *
 * MULTI-REMOTE DEVELOPMENT BENEFIT:
 * The Cart team can develop their component on port 3002 while the Products
 * team works on port 3001. Neither team needs the host running. They can
 * test their components in isolation, then verify integration by starting
 * the host on port 3000.
 *
 * This is the "team autonomy" principle in action — each team has a fully
 * independent development environment for their micro frontend.
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
